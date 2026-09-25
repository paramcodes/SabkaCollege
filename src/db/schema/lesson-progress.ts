import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { lessons } from "./courses";
import { users } from "./users";

export const completionMethod = ["automatic", "manual"] as const;
export const completionMethodEnum = pgEnum(
  "completion_method",
  completionMethod,
);

/**
 * Completion has a single source of truth: `completedAt` is non-null exactly
 * when the lesson is complete, and `completionMethod` records how it happened.
 * There is deliberately no boolean completion flag.
 */
export const lessonProgress = pgTable(
  "lesson_progress",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    /** Clerk user ID, matching `users.id`. */
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    lastPositionSeconds: integer("last_position_seconds").default(0).notNull(),
    /** Fraction of the lesson watched, from 0 to 1 inclusive. */
    maxWatchedPercentage: real("max_watched_percentage").default(0).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    completionMethod: completionMethodEnum("completion_method"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("lesson_progress_user_lesson_uidx").on(
      table.userId,
      table.lessonId,
    ),
    index("lesson_progress_user_id_idx").on(table.userId),
    index("lesson_progress_lesson_id_idx").on(table.lessonId),
    check(
      "lesson_progress_last_position_seconds_nonnegative",
      sql`${table.lastPositionSeconds} >= 0`,
    ),
    check(
      "lesson_progress_max_watched_percentage_range",
      sql`${table.maxWatchedPercentage} >= 0 AND ${table.maxWatchedPercentage} <= 1`,
    ),
  ],
);

export type LessonProgress = typeof lessonProgress.$inferSelect;
export type NewLessonProgress = typeof lessonProgress.$inferInsert;
export type CompletionMethod = (typeof completionMethod)[number];
