import { ArrowRight, BookOpen, CheckCircle2 } from "lucide-react";
import Link from "next/link";

import type { StudentDashboardCourse } from "@/src/lib/student-dashboard";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";

export function CourseProgressCard({
  course,
}: {
  course: StudentDashboardCourse;
}) {
  const firstIncompleteLesson = course.modules
    .flatMap((module) => module.lessons)
    .find((lesson) => !lesson.completed);
  const courseHref = firstIncompleteLesson
    ? `/learn/${encodeURIComponent(course.slug)}/${encodeURIComponent(firstIncompleteLesson.slug)}`
    : `/learn/${encodeURIComponent(course.slug)}`;
  const moduleCount = course.modules.length;

  return (
    <Card className="h-full rounded-none bg-card shadow-none ring-1 ring-foreground/15">
      <CardHeader className="px-6 pt-7">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
            Enrolled course
          </p>
          {course.isComplete ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle2 className="size-3.5" aria-hidden="true" /> Complete
            </span>
          ) : null}
        </div>
        <CardTitle className="mt-3 font-serif text-2xl leading-tight tracking-[-0.025em]">
          <Link
            href={courseHref}
            className="rounded-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {course.title}
          </Link>
        </CardTitle>
        <p className="mt-2 line-clamp-2 leading-6 text-muted-foreground">
          {course.shortDescription ?? "Continue your self-paced course."}
        </p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-3xl font-semibold">{course.progressPercent}%</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {course.completedLessons} of {course.totalLessons} lessons complete
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <BookOpen className="size-3.5" aria-hidden="true" />
            {moduleCount} {moduleCount === 1 ? "module" : "modules"}
          </span>
        </div>
        <div
          aria-label={`${course.title} progress`}
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={course.progressPercent}
          className="mt-5 h-2 overflow-hidden rounded-full bg-muted"
          role="progressbar"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{ width: `${course.progressPercent}%` }}
          />
        </div>
        <Button asChild variant="outline" className="mt-7 w-fit">
          <Link href={courseHref}>
            {course.isComplete ? "Review course" : "Open course"}
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
