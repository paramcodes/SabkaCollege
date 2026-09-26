"use client";

import { Check, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { markLessonComplete } from "@/src/actions/progress";
import { Button } from "@/src/components/ui/button";
import { getCompletionAnnouncement } from "@/src/lib/learning/save-state";

export function CompletionControl({
  courseSlug,
  lessonSlug,
  completed,
}: {
  courseSlug: string;
  lessonSlug: string;
  completed: boolean;
}) {
  const router = useRouter();
  const [isComplete, setIsComplete] = useState(completed);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div>
      <Button
        type="button"
        variant="outline"
        disabled={isPending}
        aria-pressed={isComplete}
        onClick={() =>
          startTransition(async () => {
            const result = await markLessonComplete({ courseSlug, lessonSlug });
            if (result.ok) {
              setIsComplete(true);
              setMessage(getCompletionAnnouncement(true, result.data.courseProgress));
              router.refresh();
            } else {
              setMessage(result.error.message);
            }
          })
        }
      >
        {isPending ? (
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
        ) : isComplete ? (
          <Check className="size-4" aria-hidden="true" />
        ) : null}
        {isComplete ? "Lesson complete" : "Mark lesson complete"}
      </Button>
      <p
        className="mt-2 min-h-5 text-xs text-muted-foreground"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {message}
      </p>
    </div>
  );
}
