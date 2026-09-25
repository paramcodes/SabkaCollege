import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
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

export const lessonProgress = pgTable(
  "lesson_progress",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    playbackPositionSeconds: integer("playback_position_seconds")
      .default(0)
      .notNull(),
    isCompleted: boolean("is_completed").default(false).notNull(),
    completionMethod: completionMethodEnum("completion_method"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
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
      "lesson_progress_playback_position_nonnegative",
      sql`${table.playbackPositionSeconds} >= 0`,
    ),
  ],
);

export type LessonProgress = typeof lessonProgress.$inferSelect;
export type NewLessonProgress = typeof lessonProgress.$inferInsert;
