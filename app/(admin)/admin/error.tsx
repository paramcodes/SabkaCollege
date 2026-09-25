"use client";

import { PageError } from "@/src/components/layout/page-error";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PageError
      scope="admin.workspace"
      error={error}
      eyebrow="Admin workspace"
      title="We could not load this admin view"
      description="The admin workspace could not be displayed right now. No content or purchase data was changed. Try again, or return to the admin overview."
      reset={reset}
      backHref="/admin"
      backLabel="Admin overview"
      contained
    />
  );
}
