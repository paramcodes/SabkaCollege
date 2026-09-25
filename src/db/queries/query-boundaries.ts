import { and, asc, eq, type SQL } from "drizzle-orm";

import {
  courses,
  lessonProgress,
  lessons,
  modules,
} from "../schema";

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

export const previewLessonWhere = (
  courseSlug: string,
  lessonId: string,
): SQL =>
  and(
    eq(courses.status, "published"),
    eq(courses.slug, courseSlug),
    eq(lessons.isPreview, true),
    eq(lessons.id, lessonId),
  ) as SQL;

export const progressForUserWhere = (userId: string): SQL => {
  const normalizedUserId = userId.trim();

  if (!normalizedUserId) {
    throw new Error("A server-derived user ID is required.");
  }

  return eq(lessonProgress.userId, normalizedUserId);
};
