import "server-only";

import { desc } from "drizzle-orm";

import { db } from "..";
import { lessonProgress } from "../schema";
import { progressForUserWhere } from "./query-boundaries";

/**
 * Reads private progress for one Clerk identity. Callers must pass the ID
 * derived from the server-side session, never an unchecked client value.
 */
export async function getUserProgress(userId: string) {
  return db
    .select()
    .from(lessonProgress)
    .where(progressForUserWhere(userId))
    .orderBy(desc(lessonProgress.updatedAt));
}

export type UserProgress = Awaited<ReturnType<typeof getUserProgress>>[number];
