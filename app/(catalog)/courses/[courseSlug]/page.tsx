import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowRight, BookOpen, Clock3, GraduationCap, Play } from "lucide-react";

import { PurchaseCard } from "@/src/components/catalog/purchase-card";
import { RetryButton } from "@/src/components/layout/retry-button";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { logServerError } from "@/src/lib/logging/server-error";
import { courseSlugSchema } from "@/src/lib/validation/catalog-routes";

export const metadata: Metadata = {
  title: "Course overview — SabkaCollege",
  description:
    "Review a SabkaCollege course, its learning outcomes, syllabus, previews, and one-time price.",
};

type CourseResult =
  | {
      status: "ready";
      course: NonNullable<
        Awaited<
          ReturnType<
            typeof import("@/src/db/queries/courses").getPublishedCourseBySlug
          >
        >
      >;
    }
  | { status: "unavailable" }
  | { status: "not-found" };

async function getPublishedCourse(courseSlug: string): Promise<CourseResult> {
  if (!process.env.DATABASE_URL) {
    return { status: "unavailable" };
  }

  // `connection()` stays outside the try: the dynamic-boundary signal must
  // never be swallowed into a user-facing unavailable state.
  await connection();

  try {
    const { getPublishedCourseBySlug } = await import(
      "@/src/db/queries/courses"
    );
    const course = await getPublishedCourseBySlug(courseSlug);

    return course ? { status: "ready", course } : { status: "not-found" };
  } catch (error) {
    logServerError("catalog.course", error);
    return { status: "unavailable" };
  }
}

const coursePath = (courseSlug: string) =>
  `/courses/${encodeURIComponent(courseSlug)}`;

export default async function CourseOverviewPage({
  params,
}: {
  params: Promise<{ courseSlug: string }>;
}) {
  const paramsResult = await params;
  const courseSlugResult = courseSlugSchema.safeParse(paramsResult.courseSlug);

  if (!courseSlugResult.success) {
    notFound();
  }

  const courseSlug = courseSlugResult.data;
  const result = await getPublishedCourse(courseSlug);

  if (result.status === "not-found") {
    notFound();
  }

  if (result.status === "unavailable") {
    return (
      <div className="mx-auto max-w-4xl px-5 py-24 text-center sm:px-8 lg:px-10">
        <BookOpen className="mx-auto size-9 text-primary" aria-hidden="true" />
        <h1 className="mt-6 font-serif text-5xl tracking-[-0.04em]">
          Course temporarily unavailable
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-muted-foreground">
          We could not load this course safely. Please try again soon or return to
          the catalogue.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <RetryButton />
          <Button asChild variant="outline">
            <Link href="/courses">Return to courses</Link>
          </Button>
        </div>
      </div>
    );
  }

  const { course } = result;
  const lessons = course.modules.flatMap((courseModule) => courseModule.lessons);
  const previewLessons = lessons.filter((lesson) => lesson.isPreview);
  const durationLabel =
    course.estimatedDurationMinutes > 0
      ? `${Math.max(1, Math.round(course.estimatedDurationMinutes / 60))} hours`
      : "Self-paced";
  let userId: string | null = null;

  try {
    const { getCurrentUserId } = await import("@/src/lib/auth/session");
    userId = await getCurrentUserId();
  } catch {
    userId = null;
  }

  let hasAccess = false;
  if (userId) {
    try {
      const { hasCourseAccess } = await import("@/src/lib/billing/entitlements");
      hasAccess = await hasCourseAccess(userId, course.id);
    } catch (error) {
      logServerError("catalog.course.access", error);
      hasAccess = false;
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-10 lg:py-28">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link href="/courses" className="hover:text-foreground">
              Courses
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="max-w-60 truncate text-foreground">{course.title}</li>
        </ol>
      </nav>

      <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <article>
          <Badge variant="outline">
            {course.modules[0]?.title ?? "General course"}
          </Badge>
          <h1 className="mt-6 max-w-4xl font-serif text-6xl leading-[0.96] tracking-[-0.05em] text-balance sm:text-7xl">
            {course.title}
          </h1>
          {course.shortDescription ? (
            <p className="mt-7 max-w-3xl text-xl leading-9 text-muted-foreground">
              {course.shortDescription}
            </p>
          ) : null}

          <div className="mt-9 flex flex-wrap gap-x-8 gap-y-3 border-y border-foreground/20 py-5 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <Clock3 className="size-4" aria-hidden="true" />
              {durationLabel}
            </span>
            <span className="inline-flex items-center gap-2">
              <BookOpen className="size-4" aria-hidden="true" />
              {lessons.length} {lessons.length === 1 ? "lesson" : "lessons"}
            </span>
            <span className="inline-flex items-center gap-2">
              <GraduationCap className="size-4" aria-hidden="true" />
              Self-paced
            </span>
          </div>

          <section aria-labelledby="about-this-course" className="mt-12">
            <h2
              id="about-this-course"
              className="font-serif text-3xl tracking-[-0.025em]"
            >
              About this course
            </h2>
            <p className="mt-5 max-w-3xl whitespace-pre-line text-lg leading-8 text-muted-foreground">
              {course.description}
            </p>
          </section>

          <section aria-labelledby="course-outcomes" className="mt-14">
            <h2
              id="course-outcomes"
              className="font-serif text-3xl tracking-[-0.025em]"
            >
              What you will learn
            </h2>
            {course.modules.length > 0 ? (
              <ul className="mt-6 grid gap-px border border-foreground/20 bg-foreground/20 sm:grid-cols-2">
                {course.modules.map((courseModule, index) => (
                  <li key={courseModule.id} className="bg-background p-6">
                    <span className="font-mono text-xs text-primary">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <h3 className="mt-5 font-serif text-2xl">{courseModule.title}</h3>
                    {courseModule.description ? (
                      <p className="mt-3 leading-7 text-muted-foreground">
                        {courseModule.description}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-5 text-muted-foreground">
                Detailed learning outcomes are being prepared by the editorial team.
              </p>
            )}
          </section>

          <section aria-labelledby="course-instructor" className="mt-14 border-y border-foreground/20 py-8">
            <h2 id="course-instructor" className="font-serif text-3xl tracking-[-0.025em]">
              Your instructor
            </h2>
            <div className="mt-5 flex items-center gap-4">
              <span className="grid size-12 place-items-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
                SC
              </span>
              <div>
                <p className="font-medium">SabkaCollege Editorial Faculty</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Instructor profile coming soon.
                </p>
              </div>
            </div>
          </section>

          {previewLessons.length > 0 ? (
            <section aria-labelledby="preview-lessons" className="mt-14">
              <h2 id="preview-lessons" className="font-serif text-3xl tracking-[-0.025em]">
                Preview before you purchase
              </h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {previewLessons.map((lesson) => (
                  <Button key={lesson.id} asChild variant="outline" size="lg" className="h-auto justify-start py-5 text-left">
                    <Link
                      href={`${coursePath(course.slug)}/preview/${encodeURIComponent(lesson.slug)}`}
                    >
                      <Play className="size-4" aria-hidden="true" />
                      <span>
                        <span className="block text-xs text-muted-foreground">
                          Public preview
                        </span>
                        <span className="mt-1 block">{lesson.title}</span>
                      </span>
                    </Link>
                  </Button>
                ))}
              </div>
            </section>
          ) : null}

          <div className="mt-14 border-t border-foreground/20 pt-8">
            <Button asChild variant="ghost" className="px-0 hover:bg-transparent hover:text-primary">
              <Link href={`${coursePath(course.slug)}/syllabus`}>
                Read the complete syllabus <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </article>

        <aside className="lg:sticky lg:top-24">
          <PurchaseCard
            courseSlug={course.slug}
            priceAmount={course.priceAmount}
            currency={course.currency}
            isSignedIn={Boolean(userId)}
            hasAccess={hasAccess}
          />
        </aside>
      </div>
    </div>
  );
}
