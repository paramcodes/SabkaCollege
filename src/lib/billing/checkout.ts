import "server-only";

import { and, eq } from "drizzle-orm";
import Stripe from "stripe";

import { db } from "@/src/db";
import { courses, users } from "@/src/db/schema";

const getStripe = (): Stripe => {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("Stripe is not configured");
  }

  return new Stripe(secretKey, {
    maxNetworkRetries: 2,
    typescript: true,
  });
};

const getAppUrl = (): URL => {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!appUrl) {
    throw new Error("Application URL is not configured");
  }

  return new URL(appUrl);
};

export async function createCourseCheckout({
  courseSlug,
  userId,
}: {
  courseSlug: string;
  userId: string;
}): Promise<{ checkoutUrl: string }> {
  const [course, user] = await Promise.all([
    db
      .select({
        id: courses.id,
        slug: courses.slug,
        title: courses.title,
        stripeProductId: courses.stripeProductId,
        stripePriceId: courses.stripePriceId,
      })
      .from(courses)
      .where(and(eq(courses.slug, courseSlug), eq(courses.status, "published")))
      .limit(1)
      .then((rows) => rows[0] ?? null),
    db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
      .then((rows) => rows[0] ?? null),
  ]);

  if (!course || !user) {
    throw new Error("Published course not found");
  }

  if (!course.stripePriceId) {
    throw new Error("Course is not available for purchase");
  }

  const appUrl = getAppUrl();
  const metadata: Record<string, string> = {
    clerkUserId: user.id,
    courseId: course.id,
    courseSlug: course.slug,
  };

  if (course.stripeProductId) {
    metadata.stripeProductId = course.stripeProductId;
  }

  metadata.stripePriceId = course.stripePriceId;

  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    client_reference_id: user.id,
    customer_email: user.email,
    line_items: [{ price: course.stripePriceId, quantity: 1 }],
    metadata,
    payment_intent_data: { metadata },
    success_url: new URL("/?checkout=success", appUrl).toString(),
    cancel_url: new URL(`/?checkout=cancelled&course=${course.slug}`, appUrl).toString(),
  });

  if (!session.url) {
    throw new Error("Stripe did not return a Checkout URL");
  }

  return { checkoutUrl: session.url };
}
