import { z } from "zod";

import { deriveProgressFromPosition } from "@/src/lib/video/player-events";
import { shouldAutoComplete } from "@/src/lib/utils/progress";

const courseSlugSchema = z
  .string()
  .trim()
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const lessonSlugSchema = courseSlugSchema;

const saveSchema = z.object({
  courseSlug: courseSlugSchema,
  lessonSlug: lessonSlugSchema,
  lastPositionSeconds: z.number().finite().nonnegative(),
  // Accepted for compatibility with older clients, but never read. The server
  // derives this value from the canonical duration and last position.
  maxWatchedPercentage: z.number().finite().min(0).max(1).optional(),
});

const completeSchema = z.object({
  courseSlug: courseSlugSchema,
  lessonSlug: lessonSlugSchema,
});

export type ProgressActionResult =
  | {
      ok: true;
      data: {
        completed: boolean;
        courseProgress: number;
      };
    }
  | {
      ok: false;
      error: {
        code: "UNAUTHENTICATED" | "FORBIDDEN" | "INVALID_INPUT" | "NOT_FOUND" | "DATABASE_ERROR";
        message: string;
      };
    };

type ProgressRow = {
  lastPositionSeconds: number;
  maxWatchedPercentage: number;
  completedAt: Date | null;
  completionMethod: "automatic" | "manual" | null;
};

type ProgressContext = {
  lessonId: string;
  courseId: string;
  durationSeconds: number;
};

type ProgressDependencies = {
  requireUser: () => Promise<{ id: string }>;
  findLesson: (courseSlug: string, lessonSlug: string) => Promise<ProgressContext | null>;
  hasCourseAccess: (userId: string, courseId: string) => Promise<boolean>;
  getProgress: (userId: string, lessonId: string) => Promise<ProgressRow | null>;
  upsertProgress: (input: {
    userId: string;
    lessonId: string;
    lastPositionSeconds: number;
    maxWatchedPercentage: number;
    completedAt: Date | null;
    completionMethod: "automatic" | "manual" | null;
  }) => Promise<void>;
  getCourseProgress: (courseSlug: string, userId: string) => Promise<number>;
};

const error = (
  code: Extract<ProgressActionResult, { ok: false }>["error"]["code"],
  message: string,
): ProgressActionResult => ({ ok: false, error: { code, message } });

const parseIdentity = (input: unknown) => {
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return null;
  return parsed.data;
};

export function createProgressActions(dependencies: ProgressDependencies) {
  const saveLessonProgress = async (input: unknown): Promise<ProgressActionResult> => {
    const identity = parseIdentity(input);
    if (!identity) {
      return error("INVALID_INPUT", "Enter a valid lesson and playback position.");
    }

    let user: { id: string };
    try {
      user = await dependencies.requireUser();
    } catch {
      return error("UNAUTHENTICATED", "Sign in to save your progress.");
    }

    let lesson: ProgressContext | null;
    try {
      lesson = await dependencies.findLesson(identity.courseSlug, identity.lessonSlug);
      if (!lesson) {
        return error("NOT_FOUND", "The requested lesson could not be found.");
      }
      if (!(await dependencies.hasCourseAccess(user.id, lesson.courseId))) {
        return error("FORBIDDEN", "Purchase this course to access its lessons.");
      }
    } catch {
      return error("DATABASE_ERROR", "Progress could not be saved. Please try again.");
    }

    const derivedProgress = deriveProgressFromPosition({
      positionSeconds: identity.lastPositionSeconds,
      canonicalDurationSeconds: lesson.durationSeconds,
    });

    try {
      const existing = await dependencies.getProgress(user.id, lesson.lessonId);
      const nextMax = Math.max(
        existing?.maxWatchedPercentage ?? 0,
        derivedProgress.maxWatchedPercentage,
      );
      const autoComplete = shouldAutoComplete(nextMax);
      const completedAt = existing?.completedAt ?? (autoComplete ? new Date() : null);
      const completionMethod =
        existing?.completionMethod ?? (autoComplete ? "automatic" : null);

      await dependencies.upsertProgress({
        userId: user.id,
        lessonId: lesson.lessonId,
        lastPositionSeconds: derivedProgress.lastPositionSeconds,
        maxWatchedPercentage: nextMax,
        completedAt,
        completionMethod,
      });
      const courseProgress = await dependencies.getCourseProgress(identity.courseSlug, user.id);
      return { ok: true, data: { completed: completedAt !== null, courseProgress } };
    } catch {
      return error("DATABASE_ERROR", "Progress could not be saved. Please try again.");
    }
  };

  const markLessonComplete = async (input: unknown): Promise<ProgressActionResult> => {
    const identity = completeSchema.safeParse(input);
    if (!identity.success) {
      return error("INVALID_INPUT", "Enter a valid lesson.");
    }

    let user: { id: string };
    try {
      user = await dependencies.requireUser();
    } catch {
      return error("UNAUTHENTICATED", "Sign in to mark lessons complete.");
    }

    let lesson: ProgressContext | null;
    try {
      lesson = await dependencies.findLesson(identity.data.courseSlug, identity.data.lessonSlug);
      if (!lesson) {
        return error("NOT_FOUND", "The requested lesson could not be found.");
      }
      if (!(await dependencies.hasCourseAccess(user.id, lesson.courseId))) {
        return error("FORBIDDEN", "Purchase this course to access its lessons.");
      }
    } catch {
      return error("DATABASE_ERROR", "Progress could not be saved. Please try again.");
    }

    try {
      const existing = await dependencies.getProgress(user.id, lesson.lessonId);
      const completedAt = existing?.completedAt ?? new Date();
      await dependencies.upsertProgress({
        userId: user.id,
        lessonId: lesson.lessonId,
        lastPositionSeconds: Math.min(
          Math.max(0, existing?.lastPositionSeconds ?? 0),
          Math.max(0, lesson.durationSeconds),
        ),
        maxWatchedPercentage: existing?.maxWatchedPercentage ?? 0,
        completedAt,
        completionMethod: "manual",
      });
      const courseProgress = await dependencies.getCourseProgress(
        identity.data.courseSlug,
        user.id,
      );
      return { ok: true, data: { completed: true, courseProgress } };
    } catch {
      return error("DATABASE_ERROR", "Progress could not be saved. Please try again.");
    }
  };

  return { saveLessonProgress, markLessonComplete };
}
