"use client";

import { Check, LoaderCircle } from "lucide-react";
import { useState, useTransition } from "react";

import { markLessonComplete } from "@/src/actions/progress";
import { Button } from "@/src/components/ui/button";

export function CompletionControl({
  courseSlug,
  lessonSlug,
  completed,
}: {
  courseSlug: string;
  lessonSlug: string;
  completed: boolean;
}) {
  const [isComplete, setIsComplete] = useState(completed);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (isComplete) {
    return (
      <p className="inline-flex items-center gap-2 text-sm font-medium text-primary">
        <Check className="size-4" aria-hidden="true" /> Lesson complete
      </p>
    );
  }

  return (
    <div>
      <Button
        type="button"
        variant="outline"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await markLessonComplete({ courseSlug, lessonSlug });
            if (result.ok) {
              setIsComplete(true);
              setMessage(`Course progress: ${result.data.courseProgress}%`);
            } else {
              setMessage(result.error.message);
            }
          })
        }
      >
        {isPending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
        Mark lesson complete
      </Button>
      {message ? <p className="mt-2 text-xs text-muted-foreground">{message}</p> : null}
    </div>
  );
}
