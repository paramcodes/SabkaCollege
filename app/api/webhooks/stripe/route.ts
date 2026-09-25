import Stripe from "stripe";

import {
  handleStripeEvent,
  mapStripeEventToPurchase,
} from "@/src/lib/billing/webhooks";

export async function POST(request: Request): Promise<Response> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return new Response("Webhook is not configured", { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return new Response("Webhook verification failed", { status: 400 });
  }

  const rawBody = await request.text();
  let stripeEvent: Stripe.Event;

  try {
    const stripe = new Stripe(webhookSecret, { typescript: true });
    stripeEvent = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      webhookSecret,
      undefined,
      Stripe.createSubtleCryptoProvider(),
    );
  } catch {
    return new Response("Webhook verification failed", { status: 400 });
  }

  try {
    const purchaseEvent = mapStripeEventToPurchase(stripeEvent);

    if (purchaseEvent) {
      await handleStripeEvent(purchaseEvent);
    }

    return new Response("OK", { status: 200 });
  } catch {
    return new Response("Webhook processing failed", { status: 500 });
  }
}
