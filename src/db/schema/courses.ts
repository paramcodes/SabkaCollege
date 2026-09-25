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
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    shortDescription: text("short_description"),
    description: text("description").notNull(),
    coverImageUrl: text("cover_image_url"),
    status: courseStatusEnum("status").default("draft").notNull(),
    /** Integer minor units (paise/cents) to avoid floating point money. */
    priceAmount: integer("price_amount").default(0).notNull(),
    currency: text("currency").default("INR").notNull(),
    clerkProductId: text("clerk_product_id"),
    clerkPriceId: text("clerk_price_id"),
    estimatedDurationMinutes: integer("estimated_duration_minutes")
      .default(0)
      .notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("courses_slug_uidx").on(table.slug),
    index("courses_status_idx").on(table.status),
    index("courses_clerk_price_id_idx").on(table.clerkPriceId),
    check("courses_price_amount_nonnegative", sql`${table.priceAmount} >= 0`),
    check(
      "courses_estimated_duration_minutes_nonnegative",
      sql`${table.estimatedDurationMinutes} >= 0`,
    ),
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

/**
 * External video hosting only. The MVP never ingests uploads, so a lesson
 * stores which provider hosts it plus that provider's own reference.
 */
export const lessonVideoProvider = [
  "youtube",
  "vimeo",
  "mux",
  "cloudflare_stream",
  "external",
] as const;
export const lessonVideoProviderEnum = pgEnum(
  "lesson_video_provider",
  lessonVideoProvider,
);

export const lessons = pgTable(
  "lessons",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    moduleId: uuid("module_id")
      .notNull()
      .references(() => modules.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    position: integer("position").notNull(),
    videoProvider: lessonVideoProviderEnum("video_provider").notNull(),
    /** Provider-specific asset ID or URL, resolved by the video adapter. */
    videoReference: text("video_reference"),
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
    uniqueIndex("lessons_slug_uidx").on(table.slug),
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
export type CourseStatus = (typeof courseStatus)[number];
export type LessonVideoProvider = (typeof lessonVideoProvider)[number];
