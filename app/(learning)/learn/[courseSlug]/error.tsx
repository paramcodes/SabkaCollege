"use client";

import { PageError } from "@/src/components/layout/page-error";

export default function LearningError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PageError
      scope="learning.course"
      error={error}
      title="We could not load this course"
      description="Your learning data is unchanged. Try again or return to your dashboard."
      reset={reset}
      backHref="/dashboard"
      backLabel="Dashboard"
    />
  );
}
