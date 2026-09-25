import { describe, expect, it } from "vitest";

import {
  MAX_COURSE_SLUG_LENGTH,
  MAX_LESSON_SLUG_LENGTH,
  courseSlugSchema,
  lessonSlugSchema,
} from "../../../src/lib/validation/catalog-routes";

describe("course route slug schemas", () => {
  it("accepts bounded lowercase course and lesson slugs", () => {
    expect(courseSlugSchema.parse("digital-skills-modern-workplace")).toBe(
      "digital-skills-modern-workplace",
    );
    expect(lessonSlugSchema.parse("india-in-1947")).toBe("india-in-1947");
  });

  it.each([
    "../admin",
    "course/slug",
    "course slug",
    "course%2Fslug",
    "course?query",
    "course#fragment",
    "-course",
    "course-",
    "course--slug",
    "course_1",
  ])("rejects the unsafe course slug %j", (slug) => {
    expect(courseSlugSchema.safeParse(slug).success).toBe(false);
  });

  it.each(["", "Lesson Slug", "../lesson", "lesson/1", "lesson%20one"])(
    "rejects the invalid or unsafe lesson slug %j",
    (slug) => {
      expect(lessonSlugSchema.safeParse(slug).success).toBe(false);
    },
  );

  it("rejects an overlong course slug", () => {
    expect(
      courseSlugSchema.safeParse("a".repeat(MAX_COURSE_SLUG_LENGTH + 1)).success,
    ).toBe(false);
  });

  it("rejects an overlong lesson slug", () => {
    expect(
      lessonSlugSchema.safeParse("a".repeat(MAX_LESSON_SLUG_LENGTH + 1)).success,
    ).toBe(false);
  });
});
