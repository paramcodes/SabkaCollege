import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowRight, BookOpen, LockKeyhole } from "lucide-react";

import { LearningTimeline } from "@/src/components/learning/learning-timeline";
import { SiteFooter } from "@/src/components/layout/site-footer";
import { SiteHeader } from "@/src/components/layout/site-header";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { getCourseLearningView } from "@/src/db/queries/learning";
import { requireUser } from "@/src/lib/auth/guards";
import { courseSlugSchema } from "@/src/lib/validation/catalog-routes";

export const instant = false;

export default async function LearningCoursePage({
  params,
}: {
  params: Promise<{ courseSlug: string }>;
}) {
  await connection();
  const { courseSlug: rawCourseSlug } = await params;
  const courseSlugResult = courseSlugSchema.safeParse(rawCourseSlug);
  if (!courseSlugResult.success) notFound();
  const courseSlug = courseSlugResult.data;

  let user;
  try {
    user = await requireUser();
  } catch {
    return <SignInState courseSlug={courseSlug} />;
  }

  const view = await getCourseLearningView(courseSlug, user.id);
  if (!view) notFound();

  const firstIncomplete = view.modules
    .flatMap((module) => module.lessons)
    .find((lesson) => !lesson.completed);
  const firstLesson = view.modules[0]?.lessons[0];
  const destination = firstIncomplete ?? firstLesson;
  const purchaseHref = `/courses/${encodeURIComponent(courseSlug)}`;

  return (
    <div className="flex min-h-screen flex-col overflow-x-clip">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16 lg:px-10 lg:py-20">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-primary hover:underline"
          >
            ← Back to dashboard
          </Link>
          <header className="mt-8 max-w-3xl">
            <p className="text-sm font-medium text-primary">Your learning path</p>
            <h1 className="mt-3 font-serif text-4xl tracking-[-0.035em] sm:text-5xl">
              {view.course.title}
            </h1>
            <p className="mt-5 text-lg leading-8 text-muted-foreground">
              {view.course.description}
            </p>
          </header>

          {view.access === "denied" ? (
            <Card className="mt-10 max-w-2xl border-primary/25 bg-secondary/35" role="status">
              <CardHeader>
                <LockKeyhole className="size-6 text-primary" aria-hidden="true" />
                <CardTitle className="mt-3 font-serif text-2xl">
                  Purchase this course to start learning
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="leading-7 text-muted-foreground">
                  The lesson list is available to help you plan, but video access
                  is reserved for enrolled learners.
                </p>
                <Button asChild className="mt-6">
                  <Link href={purchaseHref}>View purchase options</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <section aria-label="Course overview">
                <Card>
                  <CardHeader>
                    <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
                      Course progress
                    </p>
                    <CardTitle className="mt-2 font-serif text-3xl">
                      {view.progressPercent}% complete
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {view.completedLessons} of {view.totalLessons} lessons
                      complete. {view.course.estimatedDurationMinutes} estimated
                      minutes of content.
                    </p>
                    {destination ? (
                      <Button asChild className="mt-6">
                        <Link
                          href={`/learn/${encodeURIComponent(courseSlug)}/${encodeURIComponent(destination.slug)}`}
                        >
                          {firstIncomplete ? "Continue learning" : "Review course"}
                          <ArrowRight aria-hidden="true" />
                        </Link>
                      </Button>
                    ) : (
                      <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
                        <BookOpen className="size-4" aria-hidden="true" /> Lessons
                        will appear here when they are published.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </section>
              <LearningTimeline
                view={view}
                purchaseHref={purchaseHref}
              />
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function SignInState({ courseSlug }: { courseSlug: string }) {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-2xl items-center px-5 py-20 sm:px-8">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="font-serif text-3xl">Sign in to learn</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="leading-7 text-muted-foreground">
            Sign in to continue your course and keep your progress in sync.
          </p>
          <Button asChild className="mt-6">
            <Link href={`/sign-in?redirect_url=${encodeURIComponent(`/learn/${courseSlug}`)}`}>
              Sign in
            </Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
