import { describe, expect, it } from "vitest";

import {
  courseBySlugCacheTag,
  courseCacheTag,
  publishedCoursesCacheTag,
  userProgressCacheTag,
} from "../../../src/lib/cache/tags";

describe("cache tag helpers", () => {
  it("uses stable tags for course catalog invalidation", () => {
    expect(publishedCoursesCacheTag).toBe("courses");
    expect(courseCacheTag("course-123")).toBe("course:course-123");
    expect(courseBySlugCacheTag("course-slug")).toBe(
      "course-slug:course-slug",
    );
  });

  it("keeps user progress cache tags isolated by Clerk user ID", () => {
    expect(userProgressCacheTag("user-1")).toBe("progress:user-1");
    expect(userProgressCacheTag("user-2")).not.toBe(
      userProgressCacheTag("user-1"),
    );
  });
});
