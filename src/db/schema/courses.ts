import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const courseStatus = ["draft", "published", "archived"] as const;
export const courseStatusEnum = pgEnum("course_status", courseStatus);

export const courses = pgTable(
  "courses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    courseSlug: text("course_slug").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    status: courseStatusEnum("status").default("draft").notNull(),
    priceCents: integer("price_cents").default(0).notNull(),
    currency: text("currency").default("INR").notNull(),
    coverImageUrl: text("cover_image_url"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("courses_course_slug_uidx").on(table.courseSlug),
    index("courses_status_idx").on(table.status),
    check("courses_price_cents_nonnegative", sql`${table.priceCents} >= 0`),
  ],
);

export const modules = pgTable(
  "modules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    position: integer("position").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("modules_course_id_idx").on(table.courseId),
    uniqueIndex("modules_course_position_uidx").on(
      table.courseId,
      table.position,
    ),
    check("modules_position_nonnegative", sql`${table.position} >= 0`),
  ],
);

export const lessons = pgTable(
  "lessons",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    moduleId: uuid("module_id")
      .notNull()
      .references(() => modules.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    position: integer("position").notNull(),
    type: text("type").default("video").notNull(),
    videoUrl: text("video_url"),
    durationSeconds: integer("duration_seconds").default(0).notNull(),
    isPreview: boolean("is_preview").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("lessons_module_id_idx").on(table.moduleId),
    uniqueIndex("lessons_module_position_uidx").on(
      table.moduleId,
      table.position,
    ),
    check("lessons_position_nonnegative", sql`${table.position} >= 0`),
    check(
      "lessons_duration_seconds_nonnegative",
      sql`${table.durationSeconds} >= 0`,
    ),
  ],
);

export type Course = typeof courses.$inferSelect;
export type NewCourse = typeof courses.$inferInsert;
export type Module = typeof modules.$inferSelect;
export type NewModule = typeof modules.$inferInsert;
export type Lesson = typeof lessons.$inferSelect;
export type NewLesson = typeof lessons.$inferInsert;
