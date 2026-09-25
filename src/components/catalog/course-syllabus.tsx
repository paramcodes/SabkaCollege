import { Clock3, LockKeyhole, Play } from "lucide-react";
import Link from "next/link";

export type PublicSyllabusModule = {
  id: string;
  title: string;
  description: string | null;
  position: number;
  lessons: Array<{
    id: string;
    slug: string;
    title: string;
    description: string | null;
    position: number;
    durationSeconds: number;
    isPreview: boolean;
  }>;
};

const formatLessonDuration = (durationSeconds: number) => {
  if (durationSeconds <= 0) {
    return "Self-paced";
  }

  const minutes = Math.max(1, Math.round(durationSeconds / 60));
  return `${minutes} min`;
};

const previewHref = (courseSlug: string, lessonSlug: string) =>
  `/courses/${encodeURIComponent(courseSlug)}/preview/${encodeURIComponent(lessonSlug)}`;

export function CourseSyllabus({
  courseSlug,
  modules,
}: {
  courseSlug: string;
  modules: PublicSyllabusModule[];
}) {
  if (modules.length === 0) {
    return (
      <div className="border-y border-foreground/20 py-12 text-center">
        <h2 className="font-serif text-2xl">Syllabus coming soon</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          The editorial team is still preparing this course outline.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {modules.map((courseModule, moduleIndex) => (
        <section key={courseModule.id} aria-labelledby={`module-${courseModule.id}`}>
          <div className="grid gap-3 border-b border-foreground/20 pb-5 sm:grid-cols-[auto_1fr]">
            <span className="font-mono text-xs text-primary">
              {String(moduleIndex + 1).padStart(2, "0")}
            </span>
            <div>
              <h2
                id={`module-${courseModule.id}`}
                className="font-serif text-2xl tracking-[-0.02em]"
              >
                {courseModule.title}
              </h2>
              {courseModule.description ? (
                <p className="mt-2 max-w-2xl leading-7 text-muted-foreground">
                  {courseModule.description}
                </p>
              ) : null}
            </div>
          </div>

          <ol className="divide-y divide-border">
            {courseModule.lessons.map((lesson, lessonIndex) => (
              <li
                key={lesson.id}
                className="grid gap-3 py-5 sm:grid-cols-[2rem_1fr_auto] sm:items-center"
              >
                <span className="font-mono text-xs text-muted-foreground">
                  {String(lessonIndex + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="font-medium">
                    {lesson.isPreview ? (
                      <Link
                        href={previewHref(courseSlug, lesson.slug)}
                        className="inline-flex items-center gap-2 rounded-sm hover:text-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                      >
                        <Play className="size-3.5" aria-hidden="true" />
                        {lesson.title}
                      </Link>
                    ) : (
                      <span className="inline-flex items-center gap-2 text-muted-foreground">
                        <LockKeyhole className="size-3.5" aria-hidden="true" />
                        {lesson.title}
                        <span className="sr-only">Locked</span>
                      </span>
                    )}
                  </h3>
                  {lesson.description ? (
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {lesson.description}
                    </p>
                  ) : null}
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock3 className="size-3.5" aria-hidden="true" />
                  {formatLessonDuration(lesson.durationSeconds)}
                </span>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
