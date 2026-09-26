import { and, asc, eq, sql, type SQL } from "drizzle-orm";

import { userIdSchema } from "../../lib/validation/progress";
import { courses, lessons, modules } from "../schema/courses";
import { lessonProgress } from "../schema/lesson-progress";
import { purchases } from "../schema/purchases";

export const publicCourseColumns = {
  id: true,
  slug: true,
  title: true,
  shortDescription: true,
  description: true,
  coverImageUrl: true,
  priceAmount: true,
  currency: true,
  estimatedDurationMinutes: true,
  publishedAt: true,
} as const;

export const featuredCourseColumns = {
  slug: true,
  title: true,
  shortDescription: true,
  description: true,
  priceAmount: true,
  currency: true,
  estimatedDurationMinutes: true,
} as const;

export const featuredCourseLimit = 3;

export const publicModuleColumns = {
  id: true,
  title: true,
  description: true,
  position: true,
} as const;

export const publicLessonColumns = {
  id: true,
  slug: true,
  title: true,
  description: true,
  position: true,
  videoProvider: true,
  durationSeconds: true,
  isPreview: true,
} as const;

export const previewLessonPublicColumns = {
  lessonId: lessons.id,
  slug: lessons.slug,
  title: lessons.title,
  description: lessons.description,
  position: lessons.position,
  videoProvider: lessons.videoProvider,
  videoReference: lessons.videoReference,
  durationSeconds: lessons.durationSeconds,
  isPreview: lessons.isPreview,
  courseId: courses.id,
  courseSlug: courses.slug,
  courseTitle: courses.title,
} as const;

export const studentDashboardCourseColumns = {
  slug: true,
  title: true,
  shortDescription: true,
  coverImageUrl: true,
  estimatedDurationMinutes: true,
} as const;

export const studentDashboardProgressColumns = {
  lessonId: lessonProgress.lessonId,
  completedAt: lessonProgress.completedAt,
  updatedAt: lessonProgress.updatedAt,
} as const;

export const studentDashboardCourseWhere = (userId: string): SQL => {
  const parsedUserId = userIdSchema.safeParse(userId);

  if (!parsedUserId.success) {
    throw new Error("A server-derived user ID is required.");
  }

  return and(
    eq(courses.status, "published"),
    sql`exists (
      select 1
      from ${purchases}
      where ${purchases.userId} = ${parsedUserId.data}
        and ${purchases.courseId} = ${courses.id}
        and ${purchases.status} = ${"paid"}
    )`,
  ) as SQL;
};

export const publishedCourseWithSyllabus = () => ({
  columns: publicCourseColumns,
  with: {
    modules: {
      columns: publicModuleColumns,
      orderBy: [asc(modules.position)],
      with: {
        lessons: {
          columns: publicLessonColumns,
          orderBy: [asc(lessons.position)],
        },
      },
    },
  },
});

export const publishedCourseWhere = (): SQL =>
  eq(courses.status, "published");

export const publishedCourseCatalogOrderBy: SQL[] = [
  asc(courses.title),
  asc(courses.slug),
];

export const featuredCourseOrderBy: SQL[] = [
  asc(courses.title),
  asc(courses.slug),
];

export const previewLessonWhere = (
  courseSlug: string,
  lessonSlug: string,
): SQL =>
  and(
    eq(courses.status, "published"),
    eq(courses.slug, courseSlug),
    eq(lessons.isPreview, true),
    eq(lessons.slug, lessonSlug),
  ) as SQL;

export const progressForUserWhere = (userId: string): SQL => {
  const parsedUserId = userIdSchema.safeParse(userId);

  if (!parsedUserId.success) {
    throw new Error("A server-derived user ID is required.");
  }

  return eq(lessonProgress.userId, parsedUserId.data);
};

export const studentDashboardProgressWhere = (userId: string): SQL => {
  const parsedUserId = userIdSchema.safeParse(userId);

  if (!parsedUserId.success) {
    throw new Error("A server-derived user ID is required.");
  }

  return and(
    eq(lessonProgress.userId, parsedUserId.data),
    sql`exists (
      select 1
      from ${lessons}
      inner join ${modules} on ${modules.id} = ${lessons.moduleId}
      inner join ${courses} on ${courses.id} = ${modules.courseId}
      inner join ${purchases} on ${purchases.courseId} = ${courses.id}
      where ${lessons.id} = ${lessonProgress.lessonId}
        and ${purchases.userId} = ${parsedUserId.data}
        and ${purchases.status} = ${"paid"}
    )`,
  ) as SQL;
};
