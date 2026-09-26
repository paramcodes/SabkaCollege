import { verifyWebhook } from "@clerk/nextjs/webhooks";
import type { NextRequest } from "next/server";

import { isUserWebhookEvent, syncClerkUser } from "@/src/lib/auth/user-sync";

export async function POST(request: NextRequest) {
  let event;

  try {
    event = await verifyWebhook(request);
  } catch {
    return new Response("Webhook verification failed", { status: 400 });
  }

  if (isUserWebhookEvent(event)) {
    await syncClerkUser(event);
  }

  return new Response("OK", { status: 200 });
}
