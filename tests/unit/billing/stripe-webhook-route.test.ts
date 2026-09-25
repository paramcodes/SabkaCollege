import Stripe from "stripe";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { POST } from "../../../app/api/webhooks/stripe/route";

const webhookSecret = "whsec_test_secret_for_route_verification";
const stripeEvent = {
  id: "evt_route_test",
  object: "event",
  api_version: "2026-08-26.dahlia",
  created: 1_790_337_600,
  livemode: false,
  pending_webhooks: 0,
  request: { id: null, idempotency_key: null },
  type: "customer.created",
} as Stripe.Event;

const originalWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

beforeEach(() => {
  process.env.STRIPE_WEBHOOK_SECRET = webhookSecret;
});

afterEach(() => {
  process.env.STRIPE_WEBHOOK_SECRET = originalWebhookSecret;
});

describe("Stripe webhook route", () => {
  it("verifies the exact raw request body before safely ignoring unknown events", async () => {
    const rawBody = JSON.stringify(stripeEvent);
    const signature = await Stripe.webhooks.generateTestHeaderStringAsync({
      payload: rawBody,
      secret: webhookSecret,
    });
    const request = new Request("https://lms.example/api/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": signature },
      body: rawBody,
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe("OK");
  });

  it("rejects an invalid Stripe signature without exposing verification details", async () => {
    const request = new Request("https://lms.example/api/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": "t=1,v1=invalid" },
      body: JSON.stringify(stripeEvent),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    await expect(response.text()).resolves.toBe("Webhook verification failed");
  });

  it("rejects a missing Stripe signature", async () => {
    const request = new Request("https://lms.example/api/webhooks/stripe", {
      method: "POST",
      body: JSON.stringify(stripeEvent),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    await expect(response.text()).resolves.toBe("Webhook verification failed");
  });
});
