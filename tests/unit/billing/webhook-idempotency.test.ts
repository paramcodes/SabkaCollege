import { describe, expect, it } from "vitest";

import type Stripe from "stripe";

import {
  convergePurchaseRecords,
  mapStripeEventToPurchase,
  type PurchaseRecord,
  type VerifiedStripeEvent,
} from "../../../src/lib/billing/webhooks";

const event = {
  stripePaymentIntentId: "pi_one_time_123",
  stripeCheckoutSessionId: "cs_test_123",
  userId: "user_123",
  courseId: "course-123",
  stripeProductId: "prod_course_123",
  stripePriceId: "price_course_123",
  amount: 49900,
  currency: "inr",
  status: "paid",
  purchasedAt: new Date("2026-09-25T12:00:00.000Z"),
} satisfies VerifiedStripeEvent;

const record = (overrides: Partial<PurchaseRecord> = {}): PurchaseRecord => ({
  stripePaymentIntentId: event.stripePaymentIntentId,
  stripeCheckoutSessionId: event.stripeCheckoutSessionId,
  userId: event.userId,
  courseId: event.courseId,
  stripeProductId: event.stripeProductId,
  stripePriceId: event.stripePriceId,
  amount: event.amount,
  currency: event.currency.toUpperCase(),
  status: event.status,
  purchasedAt: event.purchasedAt,
  ...overrides,
});

describe("verified Stripe event convergence", () => {
  it("leaves one purchase when the same verified event is processed twice", () => {
    const first = convergePurchaseRecords([], event, record());
    const second = convergePurchaseRecords(first, event, record());

    expect(second).toHaveLength(1);
    expect(second[0]).toEqual(record());
  });

  it("does not create a second row for a replay with the same payment intent", () => {
    const existing = [record({ status: "pending" })];
    const result = convergePurchaseRecords(existing, event, record());

    expect(result).toHaveLength(1);
    expect(result[0]?.status).toBe("paid");
  });

  it("preserves refunded and revoked purchases from stale paid events", () => {
    for (const status of ["refunded", "revoked"] as const) {
      const result = convergePurchaseRecords(
        [record({ status })],
        event,
        record(),
      );

      expect(result[0]?.status).toBe(status);
    }
  });

  it("maps a paid Checkout Session from server-controlled metadata", () => {
    const stripeEvent = {
      id: "evt_checkout_123",
      type: "checkout.session.completed",
      created: 1_790_337_600,
      data: {
        object: {
          id: "cs_test_123",
          payment_intent: "pi_one_time_123",
          payment_status: "paid",
          amount_total: 49900,
          currency: "inr",
          metadata: {
            clerkUserId: "user_123",
            courseId: "course-123",
            stripeProductId: "prod_course_123",
            stripePriceId: "price_course_123",
          },
        },
      },
    } as unknown as Stripe.Event;

    expect(mapStripeEventToPurchase(stripeEvent)).toEqual(event);
  });

  it("rejects an unsafe Checkout Session without trusted course metadata", () => {
    const stripeEvent = {
      id: "evt_checkout_unsafe",
      type: "checkout.session.completed",
      created: 1_790_337_600,
      data: {
        object: {
          id: "cs_test_unsafe",
          payment_intent: "pi_unsafe",
          payment_status: "paid",
          amount_total: 1,
          currency: "inr",
          metadata: { courseId: "course-from-client" },
        },
      },
    } as unknown as Stripe.Event;

    expect(mapStripeEventToPurchase(stripeEvent)).toBeNull();
  });

  it("maps a minimal dispute event for convergence with an existing purchase", () => {
    const stripeEvent = {
      id: "evt_dispute_123",
      type: "charge.dispute.created",
      created: 1_790_337_600,
      data: {
        object: {
          id: "dp_123",
          payment_intent: "pi_one_time_123",
        },
      },
    } as unknown as Stripe.Event;

    expect(mapStripeEventToPurchase(stripeEvent)).toEqual({
      stripePaymentIntentId: "pi_one_time_123",
      stripeCheckoutSessionId: null,
      userId: null,
      courseId: null,
      stripeProductId: null,
      stripePriceId: null,
      amount: null,
      currency: null,
      status: "revoked",
      purchasedAt: new Date(1_790_337_600 * 1_000),
    });
  });
});
