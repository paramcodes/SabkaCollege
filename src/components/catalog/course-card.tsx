import { ArrowRight, BookOpen, Clock3 } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { formatCoursePrice } from "@/src/lib/formatting/currency";

export type CatalogCourseCardData = {
  slug: string;
  title: string;
  shortDescription: string | null;
  description: string;
  category: string;
  priceAmount: number;
  currency: string;
  estimatedDurationMinutes: number;
  lessonCount: number;
};

const courseHref = (courseSlug: string) =>
  `/courses/${encodeURIComponent(courseSlug)}`;

export function CourseCard({ course }: { course: CatalogCourseCardData }) {
  const durationLabel =
    course.estimatedDurationMinutes > 0
      ? `${Math.max(1, Math.round(course.estimatedDurationMinutes / 60))} hours`
      : "Self-paced";

  return (
    <Card className="group h-full rounded-none bg-card shadow-none ring-1 ring-foreground/15 transition-shadow hover:shadow-[0_16px_50px_rgba(45,37,25,0.08)]">
      <CardHeader className="px-6 pt-7">
        <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
          <Badge variant="outline">{course.category}</Badge>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock3 className="size-3.5" aria-hidden="true" />
            {durationLabel}
          </span>
        </div>
        <h3 className="font-serif text-2xl leading-tight tracking-[-0.025em]">
          <Link
            href={courseHref(course.slug)}
            className="rounded-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {course.title}
          </Link>
        </h3>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col px-6">
        <p className="line-clamp-4 leading-7 text-muted-foreground">
          {course.shortDescription ?? course.description}
        </p>
        <p className="mt-5 inline-flex items-center gap-2 text-xs text-muted-foreground">
          <BookOpen className="size-3.5" aria-hidden="true" />
          {course.lessonCount} {course.lessonCount === 1 ? "lesson" : "lessons"}
        </p>
        <div className="mt-auto flex items-end justify-between gap-4 border-t border-border pt-5">
          <div>
            <p className="text-xs tracking-wide text-muted-foreground uppercase">
              One-time
            </p>
            <p className="mt-1 font-serif text-xl">
              {formatCoursePrice(course.priceAmount, course.currency)}
            </p>
          </div>
          <Button asChild variant="ghost" className="shrink-0 px-0 hover:bg-transparent hover:text-primary">
            <Link
              href={courseHref(course.slug)}
              aria-label={`View ${course.title} course`}
            >
              View <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
