import "server-only";

import { and, eq } from "drizzle-orm";
import { cacheTag } from "next/cache";

import { db } from "..";
import {
  courseBySlugCacheTag,
  courseCacheTag,
  publishedCoursesCacheTag,
} from "../../lib/cache/tags";
import { courses, lessons, modules } from "../schema";
import {
  featuredCourseColumns,
  featuredCourseLimit,
  featuredCourseOrderBy,
  previewLessonPublicColumns,
  previewLessonWhere,
  publishedCourseCatalogOrderBy,
  publishedCourseWhere,
  publishedCourseWithSyllabus,
} from "./query-boundaries";

export async function getFeaturedCourses() {
  "use cache";

  cacheTag(publishedCoursesCacheTag);

  return db.query.courses.findMany({
    columns: featuredCourseColumns,
    where: publishedCourseWhere(),
    orderBy: featuredCourseOrderBy,
    limit: featuredCourseLimit,
  });
}

export async function getPublishedCourses() {
  "use cache";

  cacheTag(publishedCoursesCacheTag);

  return db.query.courses.findMany({
    ...publishedCourseWithSyllabus(),
    where: publishedCourseWhere(),
    orderBy: publishedCourseCatalogOrderBy,
  });
}

export async function getPublishedCourseBySlug(courseSlug: string) {
  "use cache";

  cacheTag(publishedCoursesCacheTag, courseBySlugCacheTag(courseSlug));

  const course = await db.query.courses.findFirst({
    ...publishedCourseWithSyllabus(),
    where: and(publishedCourseWhere(), eq(courses.slug, courseSlug)),
  });

  if (course) {
    cacheTag(courseCacheTag(course.id));
  }

  return course ?? null;
}

export async function getCourseSyllabus(courseId: string) {
  "use cache";

  cacheTag(publishedCoursesCacheTag, courseCacheTag(courseId));

  const course = await db.query.courses.findFirst({
    ...publishedCourseWithSyllabus(),
    where: and(publishedCourseWhere(), eq(courses.id, courseId)),
  });

  if (course) {
    cacheTag(courseCacheTag(course.id));
  }

  return course ?? null;
}

export async function getPublicPreviewLesson(
  courseSlug: string,
  lessonSlug: string,
) {
  "use cache";

  cacheTag(publishedCoursesCacheTag, courseBySlugCacheTag(courseSlug));

  const [preview] = await db
    .select(previewLessonPublicColumns)
    .from(lessons)
    .innerJoin(modules, eq(lessons.moduleId, modules.id))
    .innerJoin(courses, eq(modules.courseId, courses.id))
    .where(previewLessonWhere(courseSlug, lessonSlug))
    .limit(1);

  if (preview) {
    cacheTag(courseCacheTag(preview.courseId));
  }

  return preview ?? null;
}

export type PublishedCourse = NonNullable<
  Awaited<ReturnType<typeof getPublishedCourseBySlug>>
>;
export type PublicPreviewLesson = NonNullable<
  Awaited<ReturnType<typeof getPublicPreviewLesson>>
>;
