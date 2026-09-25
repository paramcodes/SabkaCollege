import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { BookOpen, SearchX } from "lucide-react";

import {
  CourseCard,
  type CatalogCourseCardData,
} from "@/src/components/catalog/course-card";
import { CourseFilters } from "@/src/components/catalog/course-filters";
import { Button } from "@/src/components/ui/button";
import {
  filterCatalogCourses,
  normalizeCatalogCategory,
  normalizeCatalogSearch,
} from "@/src/lib/validation/catalog-search";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Course catalogue — SabkaCollege",
  description:
    "Browse published SabkaCollege courses, compare focus areas, and preview selected lessons.",
};

type CourseCatalogResult =
  | { status: "ready"; courses: CatalogCourseCardData[] }
  | { status: "unavailable" };

async function getCourseCatalog(): Promise<CourseCatalogResult> {
  if (!process.env.DATABASE_URL) {
    return { status: "unavailable" };
  }

  await connection();

  try {
    const { getPublishedCourses } = await import("@/src/db/queries/courses");
    const publishedCourses = await getPublishedCourses();

    return {
      status: "ready",
      courses: publishedCourses.map((course) => ({
        slug: course.slug,
        title: course.title,
        shortDescription: course.shortDescription,
        description: course.description,
        category: course.modules[0]?.title ?? "General",
        priceAmount: course.priceAmount,
        currency: course.currency,
        estimatedDurationMinutes: course.estimatedDurationMinutes,
        lessonCount: course.modules.reduce(
          (total, courseModule) => total + courseModule.lessons.length,
          0,
        ),
      })),
    };
  } catch {
    console.error("Unable to load the public course catalogue");
    return { status: "unavailable" };
  }
}

function CatalogueUnavailable() {
  return (
    <div
      role="status"
      className="mt-12 border-y border-foreground/20 bg-secondary/35 py-14 text-center"
    >
      <BookOpen className="mx-auto size-8 text-primary" aria-hidden="true" />
      <h2 className="mt-5 font-serif text-3xl tracking-[-0.025em]">
        Course catalogue is temporarily unavailable
      </h2>
      <p className="mx-auto mt-3 max-w-xl leading-7 text-muted-foreground">
        The editorial catalogue cannot be loaded right now. Please try again soon.
      </p>
      <Button asChild variant="outline" className="mt-7">
        <Link href="/">Return home</Link>
      </Button>
    </div>
  );
}

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const result = await getCourseCatalog();
  const rawSearchParams = await searchParams;
  const categories =
    result.status === "ready"
      ? [...new Set(result.courses.map((course) => course.category))].sort(
          (left, right) => left.localeCompare(right, "en"),
        )
      : [];
  const normalizedSearch = normalizeCatalogSearch(rawSearchParams.q);
  const normalizedCategory = normalizeCatalogCategory(rawSearchParams.category);
  const filtersAreValid = normalizedSearch !== null && normalizedCategory !== null;
  const visibleCourses =
    result.status === "ready" && filtersAreValid
      ? filterCatalogCourses(result.courses, {
          search: normalizedSearch,
          category: normalizedCategory,
        })
      : [];

  return (
    <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
      <header className="max-w-3xl">
        <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">
          SabkaCollege Editorial Academy
        </p>
        <h1 className="mt-5 font-serif text-6xl leading-[0.96] tracking-[-0.05em] text-balance">
          Course catalogue
        </h1>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">
          Choose a focused question, inspect the complete syllabus, and preview
          selected lessons before you purchase.
        </p>
      </header>

      <div className="mt-12">
        <Suspense fallback={<div className="h-44" aria-hidden="true" />}>
          <CourseFilters
            key={`${rawSearchParams.q ?? ""}:${rawSearchParams.category ?? ""}`}
            categories={categories}
          />
        </Suspense>
      </div>

      {result.status === "unavailable" ? <CatalogueUnavailable /> : null}

      {result.status === "ready" && !filtersAreValid ? (
        <div role="alert" className="mt-10 border border-destructive/35 p-6">
          <h2 className="font-serif text-2xl">Filter request is too long</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Shorten the search or focus-area filter and try again.
          </p>
        </div>
      ) : null}

      {result.status === "ready" && filtersAreValid && visibleCourses.length === 0 ? (
        <div className="mt-12 border-y border-foreground/20 py-14 text-center">
          <SearchX className="mx-auto size-8 text-primary" aria-hidden="true" />
          <h2 className="mt-5 font-serif text-3xl tracking-[-0.025em]">
            {result.courses.length === 0
              ? "No published courses yet"
              : "No courses match these filters"}
          </h2>
          <p className="mx-auto mt-3 max-w-xl leading-7 text-muted-foreground">
            {result.courses.length === 0
              ? "New courses will appear here as the editorial team publishes them."
              : "Try a broader search or choose all focus areas."}
          </p>
          {result.courses.length > 0 ? (
            <Button asChild variant="outline" className="mt-7">
              <Link href="/courses">Clear filters</Link>
            </Button>
          ) : null}
        </div>
      ) : null}

      {visibleCourses.length > 0 ? (
        <section aria-labelledby="published-courses" className="mt-10">
          <h2 id="published-courses" className="sr-only">
            Published courses
          </h2>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {visibleCourses.map((course) => (
              <CourseCard key={course.slug} course={course} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
