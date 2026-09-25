"use client";

import { useState, useTransition } from "react";
import { ArrowRight, LoaderCircle, LockKeyhole } from "lucide-react";
import Link from "next/link";

import { startCourseCheckout } from "@/src/actions/billing";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { formatCoursePrice } from "@/src/lib/formatting/currency";
import { isAllowedStripeRedirectUrl } from "@/src/lib/validation/stripe-redirect";

const coursePath = (courseSlug: string) =>
  `/courses/${encodeURIComponent(courseSlug)}`;

export function PurchaseCard({
  courseSlug,
  priceAmount,
  currency,
  isSignedIn,
  hasAccess,
}: {
  courseSlug: string;
  priceAmount: number;
  currency: string;
  isSignedIn: boolean;
  hasAccess: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (hasAccess) {
    return (
      <Card className="rounded-none shadow-none ring-1 ring-foreground/15">
        <CardHeader>
          <CardTitle className="font-serif text-2xl">Course purchased</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="leading-7 text-muted-foreground">
            This course is ready in your learning area.
          </p>
          <Button asChild size="lg" className="mt-6 w-full">
            <Link href={`/learn/${encodeURIComponent(courseSlug)}`}>
              Continue learning <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!isSignedIn) {
    const signInHref = `/sign-in?redirect_url=${encodeURIComponent(coursePath(courseSlug))}`;

    return (
      <Card className="rounded-none shadow-none ring-1 ring-foreground/15">
        <CardHeader>
          <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
            One-time purchase
          </p>
          <CardTitle className="font-serif text-3xl">
            {formatCoursePrice(priceAmount, currency)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="leading-7 text-muted-foreground">
            Sign in to continue to secure checkout and keep your access connected
            to your account.
          </p>
          <Button asChild size="lg" className="mt-6 w-full">
            <Link href={signInHref}>Sign in to purchase</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const beginCheckout = () => {
    setError(null);
    startTransition(async () => {
      const result = await startCourseCheckout({ courseSlug });

      if (!result.ok) {
        setError(result.error.message);
        return;
      }

      if (!isAllowedStripeRedirectUrl(result.data.checkoutUrl)) {
        setError("Checkout is temporarily unavailable. Please try again.");
        return;
      }

      window.location.assign(result.data.checkoutUrl);
    });
  };

  return (
    <Card className="rounded-none shadow-none ring-1 ring-foreground/15">
      <CardHeader>
        <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
          One-time purchase
        </p>
        <CardTitle className="font-serif text-3xl">
          {formatCoursePrice(priceAmount, currency)}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <LockKeyhole className="size-4" aria-hidden="true" />
          Secure checkout. No subscription.
        </p>
        <Button
          type="button"
          size="lg"
          className="mt-6 w-full"
          disabled={isPending}
          onClick={beginCheckout}
        >
          {isPending ? (
            <>
              <LoaderCircle className="animate-spin" aria-hidden="true" />
              Preparing checkout
            </>
          ) : (
            <>
              Purchase course <ArrowRight aria-hidden="true" />
            </>
          )}
        </Button>
        {error ? (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
