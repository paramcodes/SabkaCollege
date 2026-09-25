import { describe, expect, it } from "vitest";

import {
  courseBySlugCacheTag,
  courseCacheTag,
  publishedCoursesCacheTag,
} from "../../../src/lib/cache/tags";

describe("cache tag helpers", () => {
  it("uses stable tags for course catalog invalidation", () => {
    expect(publishedCoursesCacheTag).toBe("courses");
    expect(courseCacheTag("course-123")).toBe("course:course-123");
    expect(courseBySlugCacheTag("course-slug")).toBe(
      "course-slug:course-slug",
    );
  });

});
