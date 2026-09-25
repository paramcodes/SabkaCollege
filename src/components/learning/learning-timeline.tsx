"use client";

import { CheckCircle2, LockKeyhole, PlayCircle } from "lucide-react";
import Link from "next/link";

import type { LearningView } from "@/src/db/queries/learning";
import type { TimelineModule } from "@/src/lib/learning/timeline";

export function LearningTimeline({
  view,
  currentLessonSlug,
  purchaseHref,
}: {
  view: LearningView;
  currentLessonSlug?: string;
  purchaseHref: string;
}) {
  const modules: TimelineModule[] = view.modules;

  return (
    <aside aria-label="Course lessons" className="space-y-4">
      <div className="hidden rounded-none border border-foreground/20 bg-card p-5 lg:sticky lg:top-6 lg:block">
        <TimelineList
          modules={modules}
          courseSlug={view.course.slug}
          currentLessonSlug={currentLessonSlug}
          purchaseHref={purchaseHref}
          accessGranted={view.access === "granted"}
        />
      </div>
      <details className="rounded-none border border-foreground/20 bg-card lg:hidden">
        <summary className="cursor-pointer px-5 py-4 font-semibold">
          Course lessons
        </summary>
        <div className="border-t border-foreground/15 p-5">
          <TimelineList
            modules={modules}
            courseSlug={view.course.slug}
            currentLessonSlug={currentLessonSlug}
            purchaseHref={purchaseHref}
            accessGranted={view.access === "granted"}
          />
        </div>
      </details>
    </aside>
  );
}

function TimelineList({
  modules,
  courseSlug,
  currentLessonSlug,
  purchaseHref,
  accessGranted,
}: {
  modules: TimelineModule[];
  courseSlug: string;
  currentLessonSlug?: string;
  purchaseHref: string;
  accessGranted: boolean;
}) {
  if (!modules.some((module) => module.lessons.length > 0)) {
    return <p className="text-sm text-muted-foreground">No lessons yet.</p>;
  }

  return (
    <div className="space-y-6">
      {modules.map((module) => (
        <section key={`${module.position}-${module.title}`}>
          <h2 className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
            {module.title}
          </h2>
          <ol className="mt-3 space-y-1">
            {module.lessons.map((lesson) => {
              const href = `/learn/${encodeURIComponent(courseSlug)}/${encodeURIComponent(lesson.slug)}`;
              const current = lesson.slug === currentLessonSlug;
              const locked = lesson.locked || !accessGranted;
              const label = (
                <>
                  {locked ? (
                    <LockKeyhole className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  ) : lesson.completed ? (
                    <CheckCircle2 className="size-4 shrink-0 text-primary" aria-hidden="true" />
                  ) : (
                    <PlayCircle className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  )}
                  <span>{lesson.title}</span>
                </>
              );

              return (
                <li key={lesson.slug}>
                  {locked ? (
                    <Link
                      href={purchaseHref}
                      className="flex min-h-10 items-center gap-3 rounded-sm px-2 py-2 text-sm text-muted-foreground hover:bg-secondary/50"
                      aria-label={`${lesson.title}, locked. Purchase to unlock`}
                    >
                      {label}
                    </Link>
                  ) : (
                    <Link
                      href={href}
                      aria-current={current ? "page" : undefined}
                      aria-label={`${lesson.title}${lesson.completed ? ", completed" : ""}${current ? ", current lesson" : ""}`}
                      className={`flex min-h-10 items-center gap-3 rounded-sm px-2 py-2 text-sm hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${
                        current ? "bg-secondary font-semibold" : ""
                      }`}
                    >
                      {label}
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
