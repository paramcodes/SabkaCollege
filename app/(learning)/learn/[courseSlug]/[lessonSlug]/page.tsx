import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft, ArrowRight, LockKeyhole } from "lucide-react";

import { CompletionControl } from "@/src/components/learning/completion-control";
import { LearningTimeline } from "@/src/components/learning/learning-timeline";
import { LessonHeader } from "@/src/components/learning/lesson-header";
import { VideoPlayer } from "@/src/components/learning/video-player";
import { SiteFooter } from "@/src/components/layout/site-footer";
import { SiteHeader } from "@/src/components/layout/site-header";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { getCourseLearningView } from "@/src/db/queries/learning";
import { requireUser } from "@/src/lib/auth/guards";
import {
  courseSlugSchema,
  lessonSlugSchema,
} from "@/src/lib/validation/catalog-routes";
import { selectLearningNavigation } from "@/src/lib/learning/timeline";
import { getVideoEmbedUrl } from "@/src/lib/video/providers";

export const instant = false;

export default async function LessonPage({
  params,
}: {
  params: Promise<{ courseSlug: string; lessonSlug: string }>;
}) {
  await connection();
  const route = await params;
  const courseSlugResult = courseSlugSchema.safeParse(route.courseSlug);
  const lessonSlugResult = lessonSlugSchema.safeParse(route.lessonSlug);
  if (!courseSlugResult.success || !lessonSlugResult.success) notFound();
  const courseSlug = courseSlugResult.data;
  const lessonSlug = lessonSlugResult.data;

  let user;
  try {
    user = await requireUser();
  } catch {
    return (
      <SignInState
        courseSlug={courseSlug}
        lessonSlug={lessonSlug}
      />
    );
  }

  const view = await getCourseLearningView(courseSlug, user.id);
  if (!view) notFound();
  const navigation = selectLearningNavigation(view.modules, lessonSlug);
  const lesson = view.modules
    .flatMap((module) => module.lessons)
    .find((candidate) => candidate.slug === lessonSlug);
  if (!navigation || !lesson) notFound();
  const purchaseHref = `/courses/${encodeURIComponent(courseSlug)}`;

  if (view.access === "denied") {
    return (
      <div className="flex min-h-screen flex-col overflow-x-clip">
        <SiteHeader />
        <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-12 sm:px-8 sm:py-16 lg:px-10">
          <Link href={purchaseHref} className="text-sm font-medium text-primary hover:underline">
            ← Back to course
          </Link>
          <Card className="mt-8 max-w-2xl border-primary/25 bg-secondary/35" role="status">
            <CardHeader>
              <LockKeyhole className="size-6 text-primary" aria-hidden="true" />
              <CardTitle className="mt-3 font-serif text-2xl">
                Purchase this course to watch this lesson
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="leading-7 text-muted-foreground">
                The lesson title is visible, but video references are never sent to
                learners without paid access.
              </p>
              <Button asChild className="mt-6">
                <Link href={purchaseHref}>View purchase options</Link>
              </Button>
            </CardContent>
          </Card>
          <div className="mt-10 max-w-sm">
            <LearningTimeline
              view={view}
              currentLessonSlug={lessonSlug}
              purchaseHref={purchaseHref}
            />
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const embedUrl = getVideoEmbedUrl(lesson.videoProvider, lesson.videoReference);
  const previousHref = navigation.previous
    ? `/learn/${encodeURIComponent(courseSlug)}/${encodeURIComponent(navigation.previous.slug)}`
    : null;
  const nextHref = navigation.next
    ? `/learn/${encodeURIComponent(courseSlug)}/${encodeURIComponent(navigation.next.slug)}`
    : null;

  return (
    <div className="flex min-h-screen flex-col overflow-x-clip">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:px-8 sm:py-14 lg:grid-cols-[minmax(0,1fr)_20rem] lg:px-10 lg:py-16">
          <section className="min-w-0">
            <Link href={`/learn/${encodeURIComponent(courseSlug)}`} className="text-sm font-medium text-primary hover:underline">
              ← {view.course.title} overview
            </Link>
            <div className="mt-7">
              <LessonHeader
                courseTitle={view.course.title}
                lessonTitle={lesson.title}
                description={lesson.description}
                durationSeconds={lesson.durationSeconds}
              />
            </div>
            <div className="mt-7 border border-foreground/20 bg-card p-2 shadow-[10px_10px_0_var(--secondary)] sm:p-3">
              <VideoPlayer
                title={lesson.title}
                courseSlug={courseSlug}
                lessonSlug={lessonSlug}
                provider={lesson.videoProvider}
                embedUrl={embedUrl}
                durationSeconds={lesson.durationSeconds}
                initialPositionSeconds={lesson.lastPositionSeconds}
                completed={lesson.completed}
              />
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
              <CompletionControl
                courseSlug={courseSlug}
                lessonSlug={lessonSlug}
                completed={lesson.completed}
              />
              <nav aria-label="Lesson navigation" className="flex gap-2">
                {previousHref ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href={previousHref}>
                      <ArrowLeft aria-hidden="true" /> Previous
                    </Link>
                  </Button>
                ) : null}
                {nextHref ? (
                  <Button asChild size="sm">
                    <Link href={nextHref}>
                      Next <ArrowRight aria-hidden="true" />
                    </Link>
                  </Button>
                ) : null}
              </nav>
            </div>
          </section>
          <LearningTimeline
            view={view}
            currentLessonSlug={lessonSlug}
            purchaseHref={purchaseHref}
          />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function SignInState({
  courseSlug,
  lessonSlug,
}: {
  courseSlug: string;
  lessonSlug: string;
}) {
  const redirectUrl = `/learn/${encodeURIComponent(courseSlug)}/${encodeURIComponent(lessonSlug)}`;
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-2xl items-center px-5 py-20 sm:px-8">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="font-serif text-3xl">Sign in to continue</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="leading-7 text-muted-foreground">
            Sign in to watch this lesson and save your progress.
          </p>
          <Button asChild className="mt-6">
            <Link href={`/sign-in?redirect_url=${encodeURIComponent(redirectUrl)}`}>
              Sign in
            </Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
