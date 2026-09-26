"use client";

import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

import { Button } from "@/src/components/ui/button";

/**
 * Real recovery control for server data loaders that render a
 * "temporarily unavailable" state instead of throwing.
 *
 * `router.refresh()` re-runs the server component on the current route, so the
 * loader re-attempts its query. A plain link or a no-op would leave the user
 * without a way forward.
 */
export function RetryButton({
  label = "Try again",
  className,
}: {
  label?: string;
  className?: string;
}) {
  const router = useRouter();

  return (
    <Button
      type="button"
      onClick={() => router.refresh()}
      className={className}
      data-testid="retry-boundary"
    >
      <RefreshCw aria-hidden="true" />
      {label}
    </Button>
  );
}
