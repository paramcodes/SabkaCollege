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
  const hasRequiredIdentity = Boolean(event.userId && event.courseId);
  const hasRequiredAmount = !requireAmount || event.amount !== null;

  return hasRequiredIdentity && hasRequiredAmount ? event : null;
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
  let requireMetadata = false;
  let requireAmount = false;

  switch (event.type as string) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = object as Stripe.Checkout.Session;
      paymentIntentId = getId(session.payment_intent);
      checkoutSessionId = session.id;
      amount = session.amount_total;
      currency = session.currency;
      status = "paid";
      requireMetadata = true;
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
      requireMetadata = true;
      requireAmount = true;
      break;
    }
    case "payment_intent.succeeded": {
      const paymentIntent = object as Stripe.PaymentIntent;
      paymentIntentId = paymentIntent.id;
      amount = paymentIntent.amount;
      currency = paymentIntent.currency;
      status = "paid";
      requireMetadata = true;
      break;
    }
    case "payment_intent.payment_failed": {
      const paymentIntent = object as Stripe.PaymentIntent;
      paymentIntentId = paymentIntent.id;
      amount = paymentIntent.amount;
      currency = paymentIntent.currency;
      status = "pending";
      requireMetadata = true;
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
      status = "revoked";
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
    purchasedAt: occurredAt,
  };

  return requireMetadata
    ? withRequiredMetadata(verifiedEvent, requireAmount)
    : verifiedEvent;
};

export const convergePurchaseRecords = (
  records: PurchaseRecord[],
  event: VerifiedStripeEvent,
  incoming: PurchaseRecord,
): PurchaseRecord[] => {
  const existingIndex = records.findIndex(
    (record) =>
      record.stripePaymentIntentId === event.stripePaymentIntentId,
  );

  if (existingIndex === -1) {
    return [...records, incoming];
  }

  const existing = records[existingIndex];
  if (!existing) {
    return records;
  }

  const converged: PurchaseRecord = {
    ...existing,
    stripeCheckoutSessionId:
      incoming.stripeCheckoutSessionId ?? existing.stripeCheckoutSessionId,
    userId: incoming.userId ?? existing.userId,
    courseId: incoming.courseId ?? existing.courseId,
    stripeProductId: incoming.stripeProductId ?? existing.stripeProductId,
    stripePriceId: incoming.stripePriceId ?? existing.stripePriceId,
    amount: incoming.amount ?? existing.amount,
    currency: incoming.currency ?? existing.currency,
    status: nextPurchaseStatus(existing.status, incoming.status),
    purchasedAt: incoming.purchasedAt,
  };

  return records.map((record, index) =>
    index === existingIndex ? converged : record,
  );
};

export async function handleStripeEvent(
  event: VerifiedStripeEvent,
): Promise<void> {
  const [{ db }, { purchases }] = await Promise.all([
    import("@/src/db"),
    import("@/src/db/schema"),
  ]);
  const [existing] = await db
    .select()
    .from(purchases)
    .where(eq(purchases.stripePaymentIntentId, event.stripePaymentIntentId))
    .limit(1);

  if (!existing && (!event.userId || !event.courseId || event.amount === null || !event.currency)) {
    return;
  }

  const record: PurchaseRecord = {
    stripePaymentIntentId: event.stripePaymentIntentId,
    stripeCheckoutSessionId:
      event.stripeCheckoutSessionId ?? existing?.stripeCheckoutSessionId ?? null,
    userId: event.userId ?? existing?.userId ?? "",
    courseId: event.courseId ?? existing?.courseId ?? "",
    stripeProductId: event.stripeProductId ?? existing?.stripeProductId ?? null,
    stripePriceId: event.stripePriceId ?? existing?.stripePriceId ?? null,
    amount: event.amount ?? existing?.amount ?? 0,
    currency: (event.currency ?? existing?.currency ?? "INR").toUpperCase(),
    status: event.status,
    purchasedAt: event.purchasedAt,
  };

  if (!record.userId || !record.courseId) {
    return;
  }

  const converged = convergePurchaseRecords(existing ? [existing] : [], event, record);
  const purchase = converged[0];

  if (!purchase) {
    return;
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
          WHEN ${purchases.status} = 'refunded' AND excluded.status = 'paid'::purchase_status THEN 'refunded'::purchase_status
          ELSE excluded.status
        END`,
        purchasedAt: purchase.purchasedAt,
        updatedAt: new Date(),
      },
    });
}
