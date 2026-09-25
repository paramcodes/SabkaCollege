import { beforeEach, describe, expect, it, vi } from "vitest";

import type { VerifiedStripeEvent } from "../../../src/lib/billing/webhooks";

const purchasesTable = { table: "purchases" };
const coursesTable = { table: "courses" };
const usersTable = { table: "users" };
const mocks = {
  purchasesTable,
  coursesTable,
  usersTable,
  purchaseRows: [] as unknown[],
  courseRows: [] as unknown[],
  userRows: [] as unknown[],
  select: vi.fn(),
  from: vi.fn(),
  insert: vi.fn(),
  insertValues: vi.fn(),
  onConflictDoUpdate: vi.fn(),
  update: vi.fn(),
  updateSet: vi.fn(),
  updateWhere: vi.fn(),
};

vi.mock("@/src/db", () => ({
  db: {
    select: mocks.select,
    insert: mocks.insert,
    update: mocks.update,
  },
}));
vi.mock("@/src/db/schema", () => ({
  purchases: mocks.purchasesTable,
  courses: mocks.coursesTable,
  users: mocks.usersTable,
}));

const { handleStripeEvent } = await import("../../../src/lib/billing/webhooks");

const courseId = "20000000-0000-4000-8000-000000000001";
const purchasedAt = new Date("2026-09-25T12:00:00.000Z");
const validEvent: VerifiedStripeEvent = {
  stripePaymentIntentId: "pi_valid_123",
  stripeCheckoutSessionId: "cs_valid_123",
  userId: "user_123",
  courseId,
  stripeProductId: "prod_valid_123",
  stripePriceId: "price_valid_123",
  amount: 49900,
  currency: "inr",
  status: "paid",
  stripeEventType: "checkout.session.completed",
  disputeWon: false,
  purchasedAt,
};

const course = {
  id: courseId,
  status: "published",
  priceAmount: 49900,
  currency: "INR",
  stripeProductId: "prod_valid_123",
  stripePriceId: "price_valid_123",
};

const existingPurchase = {
  id: "30000000-0000-4000-8000-000000000001",
  stripeCheckoutSessionId: "cs_existing_123",
  stripePaymentIntentId: "pi_existing_123",
  stripeProductId: "prod_valid_123",
  stripePriceId: "price_valid_123",
  userId: "user_123",
  courseId,
  amount: 49900,
  currency: "INR",
  status: "paid",
  purchasedAt,
  createdAt: purchasedAt,
  updatedAt: purchasedAt,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.purchaseRows = [];
  mocks.courseRows = [{ ...course }];
  mocks.userRows = [{ id: "user_123" }];

  mocks.select.mockImplementation(() => ({ from: mocks.from }));

  mocks.onConflictDoUpdate.mockResolvedValue(undefined);
  mocks.insertValues.mockImplementation(() => ({
    onConflictDoUpdate: mocks.onConflictDoUpdate,
  }));
  mocks.insert.mockImplementation(() => ({ values: mocks.insertValues }));

  mocks.updateWhere.mockResolvedValue(undefined);
  mocks.updateSet.mockImplementation(() => ({ where: mocks.updateWhere }));
  mocks.update.mockImplementation(() => ({ set: mocks.updateSet }));

  // The fake query returns the configured rows for the selected table.
  mocks.from.mockImplementation((table: unknown) => {
    const rows =
      table === mocks.purchasesTable
        ? mocks.purchaseRows
        : table === mocks.coursesTable
          ? mocks.courseRows
          : mocks.userRows;

    return {
      where: () => ({ limit: async () => rows }),
    };
  });
});

describe("Stripe webhook database validation", () => {
  it("persists a new purchase only after its metadata matches database configuration", async () => {
    await handleStripeEvent(validEvent);

    expect(mocks.insertValues).toHaveBeenCalledWith({
      stripePaymentIntentId: "pi_valid_123",
      stripeCheckoutSessionId: "cs_valid_123",
      userId: "user_123",
      courseId,
      stripeProductId: "prod_valid_123",
      stripePriceId: "price_valid_123",
      amount: 49900,
      currency: "INR",
      status: "paid",
      purchasedAt,
    });
  });

  it.each([
    ["price", { stripePriceId: "price_wrong_123" }],
    ["product", { stripeProductId: "prod_wrong_123" }],
    ["amount", { amount: 1 }],
    ["currency", { currency: "usd" }],
  ] as const)("rejects mismatched new-purchase %s metadata", async (_field, mismatch) => {
    await expect(
      handleStripeEvent({ ...validEvent, ...mismatch }),
    ).rejects.toThrow("Stripe event does not match server purchase configuration");
    expect(mocks.insertValues).not.toHaveBeenCalled();
  });

  it("rejects a new purchase for an unpublished course", async () => {
    mocks.courseRows = [{ ...course, status: "draft" }];

    await expect(handleStripeEvent(validEvent)).rejects.toThrow(
      "Stripe event does not match server purchase configuration",
    );
    expect(mocks.insertValues).not.toHaveBeenCalled();
  });

  it("rejects a new purchase for an unknown Clerk user", async () => {
    mocks.userRows = [];

    await expect(handleStripeEvent(validEvent)).rejects.toThrow(
      "Stripe event does not match server purchase configuration",
    );
    expect(mocks.insertValues).not.toHaveBeenCalled();
  });

  it.each([
    ["user", { userId: "user_conflict" }],
    ["course", { courseId: "20000000-0000-4000-8000-000000000099" }],
    ["product", { stripeProductId: "prod_conflict" }],
    ["price", { stripePriceId: "price_conflict" }],
    ["session", { stripeCheckoutSessionId: "cs_conflict" }],
    ["amount", { amount: 1 }],
    ["currency", { currency: "usd" }],
  ] as const)(
    "rejects conflicting %s metadata for an existing purchase",
    async (_field, conflict) => {
      mocks.purchaseRows = [{ ...existingPurchase }];

      await expect(
        handleStripeEvent({
          ...validEvent,
          stripePaymentIntentId: "pi_existing_123",
          ...conflict,
        }),
      ).rejects.toThrow("Stripe event conflicts with existing purchase");
      expect(mocks.insertValues).not.toHaveBeenCalled();
      expect(mocks.updateSet).not.toHaveBeenCalled();
    },
  );

  it("fills a missing stored checkout session ID from a verified event", async () => {
    mocks.purchaseRows = [
      { ...existingPurchase, stripeCheckoutSessionId: null },
    ];

    await handleStripeEvent({
      ...validEvent,
      stripePaymentIntentId: "pi_existing_123",
      stripeCheckoutSessionId: "cs_valid_123",
    });

    expect(mocks.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        stripeCheckoutSessionId: "cs_valid_123",
        userId: "user_123",
        courseId,
      }),
    );
  });

  it("uses stored identity for a metadata-free dispute event", async () => {
    mocks.purchaseRows = [{ ...existingPurchase }];

    await handleStripeEvent({
      stripePaymentIntentId: "pi_existing_123",
      stripeCheckoutSessionId: null,
      userId: null,
      courseId: null,
      stripeProductId: null,
      stripePriceId: null,
      amount: null,
      currency: null,
      status: "revoked",
      stripeEventType: "dispute.created",
      disputeWon: false,
      purchasedAt: new Date("2026-09-26T12:00:00.000Z"),
    });

    expect(mocks.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user_123",
        courseId,
        amount: 49900,
        currency: "INR",
        status: "revoked",
      }),
    );
  });

  it.each(["revoked", "refunded", "pending"] as const)(
    "uses conditional SQL when a won dispute follows %s",
    async (currentStatus) => {
      mocks.purchaseRows = [{ ...existingPurchase, status: currentStatus }];

      await handleStripeEvent({
        stripePaymentIntentId: "pi_existing_123",
        stripeCheckoutSessionId: null,
        userId: null,
        courseId: null,
        stripeProductId: null,
        stripePriceId: null,
        amount: null,
        currency: null,
        status: "paid",
        stripeEventType: "dispute.closed",
        disputeWon: true,
        purchasedAt: new Date("2026-09-26T12:00:00.000Z"),
      });

      expect(mocks.updateSet).toHaveBeenCalledWith(
        expect.objectContaining({ status: expect.anything() }),
      );
      expect(mocks.updateWhere).toHaveBeenCalledWith(expect.anything());
      expect(mocks.insertValues).not.toHaveBeenCalled();
    },
  );

  it("keeps a stale paid event revoked", async () => {
    mocks.purchaseRows = [{ ...existingPurchase, status: "revoked" }];

    await handleStripeEvent({
      ...validEvent,
      stripePaymentIntentId: "pi_existing_123",
      stripeCheckoutSessionId: "cs_existing_123",
    });

    expect(mocks.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ status: "revoked" }),
    );
    expect(mocks.updateSet).not.toHaveBeenCalled();
  });

  it("converges payment intent success before checkout completion", async () => {
    let persisted:
      | (typeof existingPurchase & { stripeCheckoutSessionId: string | null })
      | undefined;
    mocks.insertValues.mockImplementation((value) => {
      persisted = {
        ...existingPurchase,
        ...value,
        stripePaymentIntentId: "pi_valid_123",
      };
      mocks.purchaseRows = [persisted];
      return { onConflictDoUpdate: mocks.onConflictDoUpdate };
    });

    const paymentIntentEvent: VerifiedStripeEvent = {
      ...validEvent,
      stripeCheckoutSessionId: null,
      stripeEventType: "payment_intent.succeeded",
    };

    await handleStripeEvent(paymentIntentEvent);
    expect(persisted?.stripeCheckoutSessionId).toBeNull();

    await handleStripeEvent(validEvent);

    expect(persisted).toMatchObject({
      stripeCheckoutSessionId: "cs_valid_123",
      userId: "user_123",
      courseId,
    });
  });
});
