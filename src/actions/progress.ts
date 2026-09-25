"use server";

import { and, eq } from "drizzle-orm";

import { db } from "@/src/db";
import { getCourseProgressSummary } from "@/src/db/queries/learning";
import { courses, lessons, lessonProgress, modules } from "@/src/db/schema";
import { hasCourseAccess } from "@/src/lib/billing/entitlements";
import { requireUser } from "@/src/lib/auth/guards";
import { createProgressActions } from "@/src/lib/learning/progress-actions";

async function findLesson(courseSlug: string, lessonSlug: string) {
  const [lesson] = await db
    .select({
      lessonId: lessons.id,
      courseId: modules.courseId,
      durationSeconds: lessons.durationSeconds,
    })
    .from(lessons)
    .innerJoin(modules, eq(lessons.moduleId, modules.id))
    .innerJoin(courses, eq(modules.courseId, courses.id))
    .where(
      and(
        eq(courses.status, "published"),
        eq(courses.slug, courseSlug),
        eq(lessons.slug, lessonSlug),
      ),
    )
    .limit(1);

  return lesson ?? null;
}

async function getProgress(userId: string, lessonId: string) {
  const [progress] = await db
    .select({
      lastPositionSeconds: lessonProgress.lastPositionSeconds,
      maxWatchedPercentage: lessonProgress.maxWatchedPercentage,
      completedAt: lessonProgress.completedAt,
      completionMethod: lessonProgress.completionMethod,
    })
    .from(lessonProgress)
    .where(
      and(
        eq(lessonProgress.userId, userId),
        eq(lessonProgress.lessonId, lessonId),
      ),
    )
    .limit(1);

  return progress ?? null;
}

async function upsertProgress(input: {
  userId: string;
  lessonId: string;
  lastPositionSeconds: number;
  maxWatchedPercentage: number;
  completedAt: Date | null;
  completionMethod: "automatic" | "manual" | null;
}) {
  await db
    .insert(lessonProgress)
    .values(input)
    .onConflictDoUpdate({
      target: [lessonProgress.userId, lessonProgress.lessonId],
      set: {
        lastPositionSeconds: input.lastPositionSeconds,
        maxWatchedPercentage: input.maxWatchedPercentage,
        completedAt: input.completedAt,
        completionMethod: input.completionMethod,
        updatedAt: new Date(),
      },
    });
}

const actions = createProgressActions({
  requireUser,
  findLesson,
  hasCourseAccess,
  getProgress,
  upsertProgress,
  getCourseProgress: getCourseProgressSummary,
});

export const saveLessonProgress = actions.saveLessonProgress;
export const markLessonComplete = actions.markLessonComplete;
