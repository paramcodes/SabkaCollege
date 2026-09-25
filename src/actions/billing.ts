"use server";

import { z } from "zod";

import { requireUser } from "@/src/lib/auth/guards";
import { createCourseCheckout } from "@/src/lib/billing/checkout";

const checkoutInput = z.object({
  courseSlug: z.string().trim().min(1).max(160),
});

export type BillingActionResult =
  | { ok: true; data: { checkoutUrl: string } }
  | {
      ok: false;
      error: {
        code: "UNAUTHENTICATED" | "INVALID_INPUT" | "CHECKOUT_UNAVAILABLE";
        message: string;
      };
    };

export async function startCourseCheckout(input: {
  courseSlug: string;
}): Promise<BillingActionResult> {
  let user;

  try {
    user = await requireUser();
  } catch {
    return {
      ok: false,
      error: {
        code: "UNAUTHENTICATED",
        message: "Sign in to purchase this course.",
      },
    };
  }

  const parsedInput = checkoutInput.safeParse(input);

  if (!parsedInput.success) {
    return {
      ok: false,
      error: {
        code: "INVALID_INPUT",
        message: "Enter a valid course to purchase.",
      },
    };
  }

  try {
    const checkout = await createCourseCheckout({
      courseSlug: parsedInput.data.courseSlug,
      userId: user.id,
    });

    return { ok: true, data: checkout };
  } catch {
    return {
      ok: false,
      error: {
        code: "CHECKOUT_UNAVAILABLE",
        message: "Checkout is temporarily unavailable. Please try again.",
      },
    };
  }
}
