"use client";

import { PageError } from "@/src/components/layout/page-error";

export default function StudentDashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PageError
      scope="student.dashboard"
      error={error}
      eyebrow="Student dashboard"
      title="We could not load your learning dashboard"
      description="Something went wrong while loading your courses. Your learning data is unchanged. Try again, or return to the course catalogue."
      reset={reset}
      backHref="/courses"
      backLabel="Browse courses"
    />
  );
}
