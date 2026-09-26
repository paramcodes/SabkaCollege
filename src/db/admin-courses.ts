import "server-only";

import { and, count, eq } from "drizzle-orm";

import { db } from "@/src/db";
import { courses, lessons, modules } from "@/src/db/schema";

import type { AdminCourseRepository } from "@/src/actions/admin-course-action-core";

const courseValues = (input: {
  slug: string;
  title: string;
  shortDescription?: string | null;
  description: string;
  coverImageUrl?: string | null;
  priceAmount: number;
  currency: string;
  stripeProductId?: string | null;
  stripePriceId?: string | null;
  estimatedDurationMinutes: number;
  status: "draft" | "published" | "archived";
}) => ({
  ...input,
  shortDescription: input.shortDescription ?? null,
  coverImageUrl: input.coverImageUrl ?? null,
  stripeProductId: input.stripeProductId ?? null,
  stripePriceId: input.stripePriceId ?? null,
});

export const adminCourseRepository: AdminCourseRepository = {
  async saveCourse(input) {
    const values = courseValues(input);
    if (input.id) {
      const [current] = await db
        .select({
          status: courses.status,
          publishedAt: courses.publishedAt,
        })
        .from(courses)
        .where(eq(courses.id, input.id))
        .limit(1);
      if (!current) throw new Error("Course not found");
      if (values.status === "published") {
        if (current.status !== "published") {
          throw new Error("Use the publish action to publish a course");
        }
        await assertCoursePublishReady(input.id);
      }
      const [saved] = await db
        .update(courses)
        .set({
          ...values,
          publishedAt:
            values.status === "published"
              ? (current.publishedAt ?? new Date())
              : null,
          updatedAt: new Date(),
        })
        .where(eq(courses.id, input.id))
        .returning({ id: courses.id });
      if (!saved) throw new Error("Course not found");
      return saved;
    }

    if (values.status === "published") {
      throw new Error("Use the publish action to publish a course");
    }
    const [saved] = await db
      .insert(courses)
      .values(values)
      .returning({ id: courses.id });
    if (!saved) throw new Error("Course could not be created");
    return saved;
  },

  async saveModule(input) {
    if (input.id) {
      const [saved] = await db
        .update(modules)
        .set({
          title: input.title,
          description: input.description ?? null,
          position: input.position,
          updatedAt: new Date(),
        })
        .where(and(eq(modules.id, input.id), eq(modules.courseId, input.courseId)))
        .returning({ id: modules.id });
      if (!saved) throw new Error("Module not found");
      return saved;
    }

    const [saved] = await db
      .insert(modules)
      .values({
        courseId: input.courseId,
        title: input.title,
        description: input.description ?? null,
        position: input.position,
      })
      .returning({ id: modules.id });
    if (!saved) throw new Error("Module could not be created");
    return saved;
  },

  async saveLesson(input) {
    const [module] = await db
      .select({ courseId: modules.courseId })
      .from(modules)
      .where(
        and(
          eq(modules.id, input.moduleId),
          eq(modules.courseId, input.courseId),
        ),
      )
      .limit(1);
    if (!module) throw new Error("Module not found");

    let savedId = input.id;
    if (input.id) {
      const [saved] = await db
        .update(lessons)
        .set({
          slug: input.slug,
          title: input.title,
          description: input.description ?? null,
          position: input.position,
          videoProvider: input.videoProvider,
          videoReference: input.videoReference ?? null,
          durationSeconds: input.durationSeconds,
          isPreview: input.isPreview,
          updatedAt: new Date(),
        })
        .where(and(eq(lessons.id, input.id), eq(lessons.moduleId, input.moduleId)))
        .returning({ id: lessons.id });
      if (!saved) throw new Error("Lesson not found");
      savedId = saved.id;
    } else {
      const [saved] = await db
        .insert(lessons)
        .values({
          moduleId: input.moduleId,
          slug: input.slug,
          title: input.title,
          description: input.description ?? null,
          position: input.position,
          videoProvider: input.videoProvider,
          videoReference: input.videoReference ?? null,
          durationSeconds: input.durationSeconds,
          isPreview: input.isPreview,
        })
        .returning({ id: lessons.id });
      if (!saved) throw new Error("Lesson could not be created");
      savedId = saved.id;
    }

    return { id: savedId, courseId: module.courseId };
  },

  async reorderModules({ courseId, moduleIds }) {
    const existing = await db
      .select({ id: modules.id })
      .from(modules)
      .where(eq(modules.courseId, courseId));
    assertExactIds(existing.map((item) => item.id), moduleIds);

    const staged = moduleIds.map((id, position) =>
      db
        .update(modules)
        .set({ position: position + 100_000, updatedAt: new Date() })
        .where(and(eq(modules.id, id), eq(modules.courseId, courseId))),
    );
    const normalized = moduleIds.map((id, position) =>
      db
        .update(modules)
        .set({ position, updatedAt: new Date() })
        .where(and(eq(modules.id, id), eq(modules.courseId, courseId))),
    );
    const updates = [...staged, ...normalized];
    if (updates.length > 0) {
      await db.batch(updates as [(typeof updates)[number], ...(typeof updates)[number][]]);
    }
  },

  async reorderLessons({ courseId, moduleId, lessonIds }) {
    const [module] = await db
      .select({ id: modules.id })
      .from(modules)
      .where(and(eq(modules.id, moduleId), eq(modules.courseId, courseId)))
      .limit(1);
    if (!module) throw new Error("Module not found for course");

    const existing = await db
      .select({ id: lessons.id })
      .from(lessons)
      .innerJoin(modules, eq(lessons.moduleId, modules.id))
      .where(
        and(
          eq(lessons.moduleId, moduleId),
          eq(modules.courseId, courseId),
        ),
      );
    assertExactIds(existing.map((item) => item.id), lessonIds);

    const staged = lessonIds.map((id, position) =>
      db
        .update(lessons)
        .set({ position: position + 100_000, updatedAt: new Date() })
        .where(
          and(
            eq(lessons.id, id),
            eq(lessons.moduleId, moduleId),
          ),
        ),
    );
    const normalized = lessonIds.map((id, position) =>
      db
        .update(lessons)
        .set({ position, updatedAt: new Date() })
        .where(
          and(
            eq(lessons.id, id),
            eq(lessons.moduleId, moduleId),
          ),
        ),
    );
    const updates = [...staged, ...normalized];
    if (updates.length > 0) {
      await db.batch(updates as [(typeof updates)[number], ...(typeof updates)[number][]]);
    }
  },

  async setCourseStatus({ courseId, status }) {
    const [current] = await db
      .select({ status: courses.status, publishedAt: courses.publishedAt })
      .from(courses)
      .where(eq(courses.id, courseId))
      .limit(1);
    if (!current) throw new Error("Course not found");

    if (status === "published") {
      await assertCoursePublishReady(courseId);
    }

    const [saved] = await db
      .update(courses)
      .set({
        status,
        publishedAt: status === "published" ? (current.publishedAt ?? new Date()) : null,
        updatedAt: new Date(),
      })
      .where(eq(courses.id, courseId))
      .returning({ id: courses.id });
    if (!saved) throw new Error("Course not found");
  },

  async deleteCourse({ courseId }) {
    const [deleted] = await db
      .delete(courses)
      .where(eq(courses.id, courseId))
      .returning({ id: courses.id });
    if (!deleted) throw new Error("Course not found");
    return { courseId: deleted.id };
  },

  async deleteModule({ courseId, moduleId }) {
    const [deleted] = await db
      .delete(modules)
      .where(and(eq(modules.id, moduleId), eq(modules.courseId, courseId)))
      .returning({ courseId: modules.courseId });
    if (!deleted) throw new Error("Module not found");
    return deleted;
  },

  async deleteLesson({ courseId, moduleId, lessonId }) {
    const [module] = await db
      .select({ courseId: modules.courseId })
      .from(modules)
      .where(and(eq(modules.id, moduleId), eq(modules.courseId, courseId)))
      .limit(1);
    if (!module) throw new Error("Module not found");
    const [deleted] = await db
      .delete(lessons)
      .where(and(eq(lessons.id, lessonId), eq(lessons.moduleId, moduleId)))
      .returning({ id: lessons.id });
    if (!deleted) throw new Error("Lesson not found");
    return module;
  },
};

async function assertCoursePublishReady(courseId: string) {
  const [course] = await db
    .select({
      priceAmount: courses.priceAmount,
      stripeProductId: courses.stripeProductId,
      stripePriceId: courses.stripePriceId,
    })
    .from(courses)
    .where(eq(courses.id, courseId))
    .limit(1);
  if (!course) throw new Error("Course not found");
  if (
    course.priceAmount <= 0 ||
    !course.stripeProductId ||
    !course.stripePriceId
  ) {
    throw new Error("Course is not ready to publish");
  }

  const [moduleCount] = await db
    .select({ total: count() })
    .from(modules)
    .where(eq(modules.courseId, courseId));
  const [lessonCount] = await db
    .select({ total: count() })
    .from(lessons)
    .innerJoin(modules, eq(lessons.moduleId, modules.id))
    .where(eq(modules.courseId, courseId));
  if ((moduleCount?.total ?? 0) < 1 || (lessonCount?.total ?? 0) < 1) {
    throw new Error("Course is not ready to publish");
  }
}

function assertExactIds(existing: string[], requested: string[]) {
  if (
    existing.length !== requested.length ||
    new Set(existing).size !== existing.length ||
    existing.some((id) => !requested.includes(id))
  ) {
    throw new Error("The requested order does not match the stored content");
  }
}
