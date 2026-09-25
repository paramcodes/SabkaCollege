"use client";

import { useEffect } from "react";
import Link from "next/link";

import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import {
  buildBoundaryLog,
  type BoundaryErrorLike,
  type ClientBoundaryScope,
} from "@/src/lib/logging/error-event";

/**
 * Shared safe route error boundary presentation.
 *
 * The component renders fixed copy only. The reported event is a structured
 * object built by `buildBoundaryLog` (a closed scope union plus a sanitized
 * digest), so no message, stack, SQL, Clerk value, or payment payload can reach
 * the browser console.
 */
export function PageError({
  scope,
  error,
  eyebrow,
  title,
  description,
  reset,
  retryLabel = "Try again",
  backHref,
  backLabel,
  contained = false,
}: {
  scope: ClientBoundaryScope;
  error: BoundaryErrorLike;
  eyebrow?: string;
  title: string;
  description: string;
  reset: () => void;
  retryLabel?: string;
  backHref?: string;
  backLabel?: string;
  /** Set when a parent layout already provides the main landmark. */
  contained?: boolean;
}) {
  useEffect(() => {
    console.error(buildBoundaryLog(scope, error));
  }, [scope, error]);

  const Wrapper = contained ? "div" : "main";
  const wrapperClassName = contained
    ? "mx-auto w-full max-w-3xl py-10"
    : "mx-auto flex min-h-[70vh] w-full max-w-3xl items-center px-5 py-20 sm:px-8";

  return (
    <Wrapper className={wrapperClassName}>
      <Card className="w-full" role="alert">
        <CardHeader>
          {eyebrow ? (
            <p className="text-sm font-medium text-primary">{eyebrow}</p>
          ) : null}
          <h1 className="mt-2 font-serif text-3xl">{title}</h1>
        </CardHeader>
        <CardContent>
          <p className="max-w-xl leading-7 text-muted-foreground">
            {description}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button type="button" onClick={reset}>
              {retryLabel}
            </Button>
            {backHref && backLabel ? (
              <Button asChild variant="outline">
                <Link href={backHref}>{backLabel}</Link>
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </Wrapper>
  );
}
