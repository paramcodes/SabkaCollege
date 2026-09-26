import { Clock3 } from "lucide-react";

export function LessonHeader({
  courseTitle,
  lessonTitle,
  description,
  durationSeconds,
}: {
  courseTitle: string;
  lessonTitle: string;
  description: string | null;
  durationSeconds: number;
}) {
  const durationLabel =
    durationSeconds > 0
      ? `${Math.max(1, Math.round(durationSeconds / 60))} min`
      : "Self-paced";

  return (
    <header>
      <p className="text-sm font-medium text-primary">{courseTitle}</p>
      <h1 className="mt-2 font-serif text-3xl tracking-[-0.03em] sm:text-4xl">
        {lessonTitle}
      </h1>
      <p className="mt-3 inline-flex items-center gap-2 text-sm text-muted-foreground">
        <Clock3 className="size-4" aria-hidden="true" />
        {durationLabel}
      </p>
      {description ? (
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
          {description}
        </p>
      ) : null}
    </header>
  );
}
