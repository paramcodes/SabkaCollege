import { relations } from "drizzle-orm";

import { courses, lessons, modules } from "./courses";
import { lessonProgress } from "./lesson-progress";
import { purchases } from "./purchases";
import { users } from "./users";

export * from "./courses";
export * from "./lesson-progress";
export * from "./purchases";
export * from "./users";

export const usersRelations = relations(users, ({ many }) => ({
  lessonProgress: many(lessonProgress),
  purchases: many(purchases),
}));

export const coursesRelations = relations(courses, ({ many }) => ({
  modules: many(modules),
  purchases: many(purchases),
  // Course-level lessons are reached through modules: Drizzle's relational
  // queries join declared column pairs only, so a direct course->lessons
  // relation is not expressible.
}));

export const modulesRelations = relations(modules, ({ many, one }) => ({
  course: one(courses, {
    fields: [modules.courseId],
    references: [courses.id],
  }),
  lessons: many(lessons),
}));

export const lessonsRelations = relations(lessons, ({ many, one }) => ({
  lessonProgress: many(lessonProgress),
  module: one(modules, {
    fields: [lessons.moduleId],
    references: [modules.id],
  }),
}));

export const purchasesRelations = relations(purchases, ({ one }) => ({
  course: one(courses, {
    fields: [purchases.courseId],
    references: [courses.id],
  }),
  user: one(users, {
    fields: [purchases.userId],
    references: [users.id],
  }),
}));

export const lessonProgressRelations = relations(
  lessonProgress,
  ({ one }) => ({
    lesson: one(lessons, {
      fields: [lessonProgress.lessonId],
      references: [lessons.id],
    }),
    user: one(users, {
      fields: [lessonProgress.userId],
      references: [users.id],
    }),
  }),
);

export const schema = {
  courses,
  coursesRelations,
  lessonProgress,
  lessonProgressRelations,
  lessons,
  lessonsRelations,
  modules,
  modulesRelations,
  purchases,
  purchasesRelations,
  users,
  usersRelations,
};

export type DatabaseSchema = typeof schema;
