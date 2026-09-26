import { eq, sql } from "drizzle-orm";
import type Stripe from "stripe";

import type { PurchaseStatus } from "@/src/db/schema";
import { nextPurchaseStatus } from "./entitlements";

export type VerifiedStripeEvent = {
  stripePaymentIntentId: string;
  stripeCheckoutSessionId: string | null;
  userId: string | null;
  courseId: string | null;
  stripeProductId: string | null;
  stripePriceId: string | null;
  amount: number | null;
  currency: string | null;
  status: PurchaseStatus;
  stripeEventType: string;
  disputeWon: boolean;
  purchasedAt: Date;
};

export type PurchaseRecord = {
  stripePaymentIntentId: string;
  stripeCheckoutSessionId: string | null;
  userId: string;
  courseId: string;
  stripeProductId: string | null;
  stripePriceId: string | null;
  amount: number;
  currency: string;
  status: PurchaseStatus;
  purchasedAt: Date;
};

type StripeMetadata = Stripe.Metadata;
type StripeId = string | { id: string } | null;

const getId = (value: StripeId | undefined): string | null =>
  typeof value === "string" ? value : value?.id ?? null;

const getMetadata = (value: unknown): StripeMetadata => {
  if (!value || typeof value !== "object" || !("metadata" in value)) {
    return {};
  }

  const metadata = (value as { metadata?: unknown }).metadata;

  if (!metadata || typeof metadata !== "object") {
    return {};
  }

  return metadata as StripeMetadata;
};

const getString = (metadata: StripeMetadata, key: string): string | null => {
  const value = metadata[key];
  return typeof value === "string" && value.length > 0 ? value : null;
};

const withRequiredMetadata = (
  event: VerifiedStripeEvent,
  requireAmount: boolean,
): VerifiedStripeEvent | null => {
  const hasRequiredIdentity = Boolean(
    event.userId && event.courseId && event.stripePriceId,
  );
  const hasRequiredAmount = !requireAmount || event.amount !== null;
  const hasRequiredCurrency = !requireAmount || Boolean(event.currency);

  return hasRequiredIdentity && hasRequiredAmount && hasRequiredCurrency
    ? event
    : null;
};

export const mapStripeEventToPurchase = (
  event: Stripe.Event,
): VerifiedStripeEvent | null => {
  const object = event.data?.object;
  const occurredAt = new Date(event.created * 1_000);
  let paymentIntentId: string | null = null;
  let checkoutSessionId: string | null = null;
  let amount: number | null = null;
  let currency: string | null = null;
  let status: PurchaseStatus | null = null;
  let requireAmount = false;
  let disputeWon = false;

  switch (event.type as string) {
    case "checkout.session.completed": {
      const session = object as Stripe.Checkout.Session;
      paymentIntentId = getId(session.payment_intent);
      checkoutSessionId = session.id;
      amount = session.amount_total;
      currency = session.currency;
      status = session.payment_status === "paid" ? "paid" : "pending";
      requireAmount = true;
      break;
    }
    case "checkout.session.async_payment_succeeded": {
      const session = object as Stripe.Checkout.Session;
      paymentIntentId = getId(session.payment_intent);
      checkoutSessionId = session.id;
      amount = session.amount_total;
      currency = session.currency;
      status = "paid";
      requireAmount = true;
      break;
    }
    case "checkout.session.async_payment_failed": {
      const session = object as Stripe.Checkout.Session;
      paymentIntentId = getId(session.payment_intent);
      checkoutSessionId = session.id;
      amount = session.amount_total;
      currency = session.currency;
      status = "pending";
      requireAmount = true;
      break;
    }
    case "payment_intent.succeeded": {
      const paymentIntent = object as Stripe.PaymentIntent;
      paymentIntentId = paymentIntent.id;
      amount = paymentIntent.amount;
      currency = paymentIntent.currency;
      status = "paid";
      break;
    }
    case "payment_intent.payment_failed": {
      const paymentIntent = object as Stripe.PaymentIntent;
      paymentIntentId = paymentIntent.id;
      amount = paymentIntent.amount;
      currency = paymentIntent.currency;
      status = "pending";
      break;
    }
    case "charge.refunded": {
      const charge = object as Stripe.Charge;
      paymentIntentId = getId(charge.payment_intent);
      amount = charge.amount_refunded;
      currency = charge.currency;
      status = "refunded";
      break;
    }
    case "refund.created":
    case "refund.updated": {
      const refund = object as Stripe.Refund;
      paymentIntentId = getId(refund.payment_intent);
      amount = refund.amount;
      currency = refund.currency;
      status = refund.status === "succeeded" ? "refunded" : "pending";
      break;
    }
    case "charge.dispute.created":
    case "dispute.created":
    case "charge.dispute.updated":
    case "dispute.updated":
    case "charge.dispute.closed":
    case "dispute.closed": {
      const dispute = object as Stripe.Dispute;
      paymentIntentId = getId(dispute.payment_intent);
      disputeWon =
        (event.type as string).endsWith(".closed") && dispute.status === "won";
      status = disputeWon ? "paid" : "revoked";
      break;
    }
    default:
      return null;
  }

  if (!paymentIntentId || !status) {
    return null;
  }

  const metadata = getMetadata(object);
  const verifiedEvent: VerifiedStripeEvent = {
    stripePaymentIntentId: paymentIntentId,
    stripeCheckoutSessionId: checkoutSessionId,
    userId: getString(metadata, "clerkUserId"),
    courseId: getString(metadata, "courseId"),
    stripeProductId: getString(metadata, "stripeProductId"),
    stripePriceId: getString(metadata, "stripePriceId"),
    amount,
    currency,
    status,
    stripeEventType: event.type as string,
    disputeWon,
    purchasedAt: occurredAt,
  };

  const requiresIdentity = event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded" ||
    event.type === "checkout.session.async_payment_failed" ||
    event.type === "payment_intent.succeeded" ||
    event.type === "payment_intent.payment_failed";

  return requiresIdentity
    ? withRequiredMetadata(verifiedEvent, requireAmount)
    : verifiedEvent;
};

const isRefundEvent = (stripeEventType: string): boolean =>
  stripeEventType === "charge.refunded" ||
  stripeEventType === "refund.created" ||
  stripeEventType === "refund.updated";

const hasConflictingExistingMetadata = (
  existing: PurchaseRecord,
  event: VerifiedStripeEvent,
): boolean =>
  (event.userId !== null && event.userId !== existing.userId) ||
  (event.courseId !== null && event.courseId !== existing.courseId) ||
  (event.stripeProductId !== null &&
    event.stripeProductId !== existing.stripeProductId) ||
  (event.stripePriceId !== null &&
    event.stripePriceId !== existing.stripePriceId) ||
  (event.stripeCheckoutSessionId !== null &&
    existing.stripeCheckoutSessionId !== null &&
    event.stripeCheckoutSessionId !== existing.stripeCheckoutSessionId) ||
  (event.amount !== null &&
    !isRefundEvent(event.stripeEventType) &&
    event.amount !== existing.amount) ||
  (event.currency !== null &&
    event.currency.toUpperCase() !== existing.currency.toUpperCase());

export const convergePurchaseRecords = (
  records: PurchaseRecord[],
  event: VerifiedStripeEvent,
  incoming: PurchaseRecord,
): PurchaseRecord[] => {
  const existingIndex = records.findIndex(
    (record) => record.stripePaymentIntentId === event.stripePaymentIntentId,
  );

  if (existingIndex === -1) {
    return [...records, incoming];
  }

  const existing = records[existingIndex];
  if (!existing) {
    return records;
  }

  if (hasConflictingExistingMetadata(existing, event)) {
    throw new Error("Stripe event conflicts with existing purchase");
  }

  const converged: PurchaseRecord = {
    ...existing,
    stripeCheckoutSessionId:
      existing.stripeCheckoutSessionId ?? event.stripeCheckoutSessionId,
    status: event.disputeWon
      ? existing.status === "revoked"
        ? "paid"
        : existing.status
      : nextPurchaseStatus(existing.status, incoming.status),
  };

  return records.map((record, index) =>
    index === existingIndex ? converged : record,
  );
};

const validateNewPurchaseConfiguration = async (
  db: Awaited<typeof import("@/src/db")>["db"],
  courses: typeof import("@/src/db/schema")["courses"],
  users: typeof import("@/src/db/schema")["users"],
  event: VerifiedStripeEvent,
): Promise<void> => {
  if (
    !event.userId ||
    !event.courseId ||
    !event.stripePriceId ||
    event.amount === null ||
    !event.currency
  ) {
    throw new Error("Stripe event does not match server purchase configuration");
  }

  const [[course], [user]] = await Promise.all([
    db
      .select({
        id: courses.id,
        status: courses.status,
        priceAmount: courses.priceAmount,
        currency: courses.currency,
        stripeProductId: courses.stripeProductId,
        stripePriceId: courses.stripePriceId,
      })
      .from(courses)
      .where(eq(courses.id, event.courseId))
      .limit(1),
    db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, event.userId))
      .limit(1),
  ]);

  if (
    !user ||
    !course ||
    course.status !== "published" ||
    !course.stripePriceId ||
    event.stripePriceId !== course.stripePriceId ||
    event.stripeProductId !== (course.stripeProductId ?? null) ||
    event.amount !== course.priceAmount ||
    event.currency.toUpperCase() !== course.currency.toUpperCase()
  ) {
    throw new Error("Stripe event does not match server purchase configuration");
  }
};

export async function handleStripeEvent(
  event: VerifiedStripeEvent,
): Promise<void> {
  const [{ db }, { courses, purchases, users }] = await Promise.all([
    import("@/src/db"),
    import("@/src/db/schema"),
  ]);
  const [existing] = await db
    .select()
    .from(purchases)
    .where(eq(purchases.stripePaymentIntentId, event.stripePaymentIntentId))
    .limit(1);

  if (!existing) {
    await validateNewPurchaseConfiguration(db, courses, users, event);

    const record: PurchaseRecord = {
      stripePaymentIntentId: event.stripePaymentIntentId,
      stripeCheckoutSessionId: event.stripeCheckoutSessionId,
      userId: event.userId as string,
      courseId: event.courseId as string,
      stripeProductId: event.stripeProductId,
      stripePriceId: event.stripePriceId,
      amount: event.amount as number,
      currency: (event.currency as string).toUpperCase(),
      status: event.status,
      purchasedAt: event.purchasedAt,
    };

    await db
      .insert(purchases)
      .values(record)
      .onConflictDoUpdate({
        target: purchases.stripePaymentIntentId,
        set: {
          stripeCheckoutSessionId: sql`coalesce(${purchases.stripeCheckoutSessionId}, ${record.stripeCheckoutSessionId})`,
          stripeProductId: record.stripeProductId,
          stripePriceId: record.stripePriceId,
          userId: record.userId,
          courseId: record.courseId,
          amount: record.amount,
          currency: record.currency,
          status: sql`CASE
            WHEN ${purchases.status} = 'revoked' THEN 'revoked'::purchase_status
            WHEN ${purchases.status} = 'refunded' AND excluded.status IN ('pending'::purchase_status, 'paid'::purchase_status) THEN 'refunded'::purchase_status
            WHEN ${purchases.status} = 'paid' AND excluded.status = 'pending'::purchase_status THEN 'paid'::purchase_status
            ELSE excluded.status
          END`,
          purchasedAt: record.purchasedAt,
          updatedAt: new Date(),
        },
      });
    return;
  }

  if (hasConflictingExistingMetadata(existing, event)) {
    throw new Error("Stripe event conflicts with existing purchase");
  }

  if (event.disputeWon) {
    await db
      .update(purchases)
      .set({
        status: sql`CASE
          WHEN ${purchases.status} = 'revoked' THEN 'paid'::purchase_status
          ELSE ${purchases.status}
        END`,
        updatedAt: new Date(),
      })
      .where(eq(purchases.stripePaymentIntentId, event.stripePaymentIntentId));
    return;
  }

  const incoming: PurchaseRecord = {
    stripePaymentIntentId: existing.stripePaymentIntentId,
    stripeCheckoutSessionId:
      event.stripeCheckoutSessionId ?? existing.stripeCheckoutSessionId,
    userId: existing.userId,
    courseId: existing.courseId,
    stripeProductId: existing.stripeProductId,
    stripePriceId: existing.stripePriceId,
    amount: existing.amount,
    currency: existing.currency,
    status: event.status,
    purchasedAt: existing.purchasedAt,
  };
  const purchase = convergePurchaseRecords([existing], event, incoming)[0];

  if (!purchase) {
    throw new Error("Stripe purchase could not be resolved");
  }

  await db
    .insert(purchases)
    .values(purchase)
    .onConflictDoUpdate({
      target: purchases.stripePaymentIntentId,
      set: {
        stripeCheckoutSessionId: purchase.stripeCheckoutSessionId,
        stripeProductId: purchase.stripeProductId,
        stripePriceId: purchase.stripePriceId,
        userId: purchase.userId,
        courseId: purchase.courseId,
        amount: purchase.amount,
        currency: purchase.currency,
        status: sql`CASE
          WHEN ${purchases.status} = 'revoked' THEN 'revoked'::purchase_status
          WHEN ${purchases.status} = 'refunded' AND excluded.status IN ('pending'::purchase_status, 'paid'::purchase_status) THEN 'refunded'::purchase_status
          WHEN ${purchases.status} = 'paid' AND excluded.status = 'pending'::purchase_status THEN 'paid'::purchase_status
          ELSE excluded.status
        END`,
        updatedAt: new Date(),
      },
    });
}
