import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft, BookOpen } from "lucide-react";

import { CourseSyllabus } from "@/src/components/catalog/course-syllabus";
import { Button } from "@/src/components/ui/button";
import { courseSlugSchema } from "@/src/lib/validation/catalog-routes";

export const metadata: Metadata = {
  title: "Course syllabus — SabkaCollege",
  description:
    "Review the ordered modules, lessons, and public previews in a SabkaCollege course.",
};

type SyllabusResult =
  | {
      status: "ready";
      course: NonNullable<
        Awaited<
          ReturnType<
            typeof import("@/src/db/queries/courses").getCourseSyllabus
          >
        >
      >;
    }
  | { status: "unavailable" }
  | { status: "not-found" };

async function getPublishedSyllabus(
  courseSlug: string,
): Promise<SyllabusResult> {
  if (!process.env.DATABASE_URL) {
    return { status: "unavailable" };
  }

  await connection();

  try {
    const { getCourseSyllabus, getPublishedCourseBySlug } = await import(
      "@/src/db/queries/courses"
    );
    const publishedCourse = await getPublishedCourseBySlug(courseSlug);

    if (!publishedCourse) {
      return { status: "not-found" };
    }

    const course = await getCourseSyllabus(publishedCourse.id);
    return course
      ? { status: "ready", course }
      : { status: "not-found" };
  } catch {
    console.error("Unable to load the public course syllabus");
    return { status: "unavailable" };
  }
}

const coursePath = (courseSlug: string) =>
  `/courses/${encodeURIComponent(courseSlug)}`;

export default async function CourseSyllabusPage({
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
  const result = await getPublishedSyllabus(courseSlug);

  if (result.status === "not-found") {
    notFound();
  }

  if (result.status === "unavailable") {
    return (
      <div className="mx-auto max-w-4xl px-5 py-24 text-center sm:px-8 lg:px-10">
        <BookOpen className="mx-auto size-9 text-primary" aria-hidden="true" />
        <h1 className="mt-6 font-serif text-5xl tracking-[-0.04em]">
          Syllabus temporarily unavailable
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-muted-foreground">
          We could not load this syllabus safely. Please try again soon.
        </p>
        <Button asChild variant="outline" className="mt-8">
          <Link href={coursePath(courseSlug)}>Return to course</Link>
        </Button>
      </div>
    );
  }

  const { course } = result;
  const lessonCount = course.modules.reduce(
    (total, courseModule) => total + courseModule.lessons.length,
    0,
  );

  return (
    <div className="mx-auto max-w-5xl px-5 py-16 sm:px-8 sm:py-20 lg:px-10 lg:py-28">
      <Button asChild variant="ghost" className="px-0 hover:bg-transparent hover:text-primary">
        <Link href={coursePath(course.slug)}>
          <ArrowLeft aria-hidden="true" /> Back to course
        </Link>
      </Button>

      <header className="mt-10 max-w-3xl border-b border-foreground/20 pb-10">
        <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">
          Course syllabus
        </p>
        <h1 className="mt-5 font-serif text-6xl leading-[0.98] tracking-[-0.05em] text-balance">
          {course.title}
        </h1>
        <p className="mt-5 text-lg leading-8 text-muted-foreground">
          {course.modules.length} modules · {lessonCount}{" "}
          {lessonCount === 1 ? "lesson" : "lessons"}
        </p>
      </header>

      <div className="mt-12">
        <CourseSyllabus courseSlug={course.slug} modules={course.modules} />
      </div>
    </div>
  );
}
