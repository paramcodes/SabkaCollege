"use client";

import { PageError } from "@/src/components/layout/page-error";

export default function CourseOverviewError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PageError
      scope="catalog.course"
      error={error}
      eyebrow="Course"
      title="We could not load this course"
      description="The course could not be displayed right now. Try again, or browse the catalogue to find another course."
      reset={reset}
      backHref="/courses"
      backLabel="Browse courses"
      contained
    />
  );
}
