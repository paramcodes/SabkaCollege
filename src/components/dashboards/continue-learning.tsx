import { ArrowRight, BookOpen, CheckCircle2 } from "lucide-react";
import Link from "next/link";

import type { ContinueLearningData } from "@/src/lib/student-dashboard";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";

export function ContinueLearning({
  learning,
}: {
  learning: ContinueLearningData | null;
}) {
  if (!learning) {
    return (
      <Card className="border-primary/20 bg-secondary/35">
        <CardHeader>
          <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
            Continue learning
          </p>
          <CardTitle className="mt-2 font-serif text-2xl">
            Your learning starts here
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="max-w-xl leading-7 text-muted-foreground">
            Enroll in a course to begin a self-paced learning path.
          </p>
          <Button asChild variant="outline" className="mt-6">
            <Link href="/courses">
              Browse courses <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isCourseComplete = !learning.lessonSlug;

  return (
    <Card className="overflow-hidden border-primary/20 bg-primary text-primary-foreground">
      <CardHeader>
        <p className="text-xs font-semibold tracking-[0.18em] uppercase opacity-75">
          Continue learning
        </p>
        <CardTitle className="mt-2 flex items-center gap-3 font-serif text-2xl">
          {isCourseComplete ? (
            <CheckCircle2 className="size-6" aria-hidden="true" />
          ) : (
            <BookOpen className="size-6" aria-hidden="true" />
          )}
          {learning.courseTitle}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="max-w-xl leading-7 opacity-80">
          {isCourseComplete
            ? "You completed every lesson. Revisit the course whenever you need a refresher."
            : `Next: ${learning.lessonTitle}`}
        </p>
        <Button asChild variant="secondary" className="mt-6">
          <Link href={learning.href}>
            {isCourseComplete ? "Open course" : "Resume lesson"}
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
