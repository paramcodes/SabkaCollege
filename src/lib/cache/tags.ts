export const publishedCoursesCacheTag = "courses";

export const courseCacheTag = (courseId: string): string =>
  `course:${courseId}`;

export const courseBySlugCacheTag = (courseSlug: string): string =>
  `course-slug:${courseSlug}`;

export const userProgressCacheTag = (userId: string): string =>
  `progress:${userId}`;
