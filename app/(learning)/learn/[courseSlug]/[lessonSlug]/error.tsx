"use client";

import { PageError } from "@/src/components/layout/page-error";

export default function LessonError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PageError
      scope="learning.lesson"
      error={error}
      eyebrow="Lesson"
      title="We could not load this lesson"
      description="Your lesson progress is unchanged. Try again, or return to your dashboard and reopen the lesson."
      reset={reset}
      backHref="/dashboard"
      backLabel="Dashboard"
    />
  );
}
