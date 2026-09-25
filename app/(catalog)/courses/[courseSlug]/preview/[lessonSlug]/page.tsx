import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft, BookOpen, Clock3 } from "lucide-react";

import { PublicPreviewPlayer } from "@/src/components/catalog/public-preview-player";
import { Button } from "@/src/components/ui/button";

export const metadata: Metadata = {
  title: "Public lesson preview — SabkaCollege",
  description: "Watch a selected public lesson preview from SabkaCollege.",
};

type PreviewResult =
  | {
      status: "ready";
      preview: NonNullable<
        Awaited<
          ReturnType<
            typeof import("@/src/db/queries/courses").getPublicPreviewLesson
          >
        >
      >;
    }
  | { status: "unavailable" }
  | { status: "not-found" };

async function getPublicPreview(
  courseSlug: string,
  lessonSlug: string,
): Promise<PreviewResult> {
  if (!process.env.DATABASE_URL) {
    return { status: "unavailable" };
  }

  await connection();

  try {
    const { getPublicPreviewLesson } = await import(
      "@/src/db/queries/courses"
    );
    const preview = await getPublicPreviewLesson(courseSlug, lessonSlug);

    return preview
      ? { status: "ready", preview }
      : { status: "not-found" };
  } catch {
    console.error("Unable to load the public lesson preview");
    return { status: "unavailable" };
  }
}

const coursePath = (courseSlug: string) =>
  `/courses/${encodeURIComponent(courseSlug)}`;

export default async function PublicPreviewPage({
  params,
}: {
  params: Promise<{ courseSlug: string; lessonSlug: string }>;
}) {
  const { courseSlug, lessonSlug } = await params;
  const result = await getPublicPreview(courseSlug, lessonSlug);

  if (result.status === "not-found") {
    notFound();
  }

  if (result.status === "unavailable") {
    return (
      <div className="mx-auto max-w-4xl px-5 py-24 text-center sm:px-8 lg:px-10">
        <BookOpen className="mx-auto size-9 text-primary" aria-hidden="true" />
        <h1 className="mt-6 font-serif text-5xl tracking-[-0.04em]">
          Preview temporarily unavailable
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-muted-foreground">
          We could not load this public preview safely. Please try again soon.
        </p>
        <Button asChild variant="outline" className="mt-8">
          <Link href={coursePath(courseSlug)}>Return to course</Link>
        </Button>
      </div>
    );
  }

  const { preview } = result;
  const durationLabel =
    preview.durationSeconds > 0
      ? `${Math.max(1, Math.round(preview.durationSeconds / 60))} min`
      : "Self-paced";

  return (
    <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20 lg:px-10 lg:py-28">
      <Button asChild variant="ghost" className="px-0 hover:bg-transparent hover:text-primary">
        <Link href={coursePath(preview.courseSlug)}>
          <ArrowLeft aria-hidden="true" /> Back to {preview.courseTitle}
        </Link>
      </Button>

      <header className="mt-9 max-w-3xl">
        <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">
          Public lesson preview
        </p>
        <h1 className="mt-5 font-serif text-5xl leading-[1] tracking-[-0.045em] text-balance sm:text-6xl">
          {preview.title}
        </h1>
        <p className="mt-5 inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Clock3 className="size-4" aria-hidden="true" />
          {durationLabel} · {preview.courseTitle}
        </p>
        {preview.description ? (
          <p className="mt-5 text-lg leading-8 text-muted-foreground">
            {preview.description}
          </p>
        ) : null}
      </header>

      <div className="mt-10 border border-foreground/20 bg-card p-2 shadow-[10px_10px_0_var(--secondary)] sm:p-3">
        <PublicPreviewPlayer
          title={preview.title}
          provider={preview.videoProvider}
          reference={preview.videoReference}
        />
      </div>

      <p className="mt-5 text-sm text-muted-foreground">
        This selected lesson is public. Purchase the course to unlock every
        lesson and save your progress.
      </p>
    </div>
  );
}
