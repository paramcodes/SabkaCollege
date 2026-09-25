"use client";

import { useEffect } from "react";
import Link from "next/link";

import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";

export type BoundaryError = Error & { digest?: string };

/**
 * Builds the only error payload a route boundary is allowed to emit.
 * Messages, stacks, and request details are intentionally dropped so that a
 * failure never leaks SQL, Clerk tokens, or payment payloads into the browser.
 */
export function buildBoundaryLog(
  scope: string,
  error: BoundaryError | null | undefined,
): { event: "route.error"; scope: string; digest: string | null } {
  const digest =
    typeof error?.digest === "string" && error.digest.length > 0
      ? error.digest
      : null;

  return { event: "route.error", scope, digest };
}

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
  scope: string;
  error: BoundaryError | null | undefined;
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
    console.error(JSON.stringify(buildBoundaryLog(scope, error)));
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
          <CardTitle className="mt-2 font-serif text-3xl">{title}</CardTitle>
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
