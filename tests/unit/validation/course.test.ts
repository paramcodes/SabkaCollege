import { describe, expect, it } from "vitest";

import { courseInputSchema } from "../../../src/lib/validation/course";
import { lessonInputSchema } from "../../../src/lib/validation/lesson";
import {
  progressUpdateSchema,
  userIdSchema,
} from "../../../src/lib/validation/progress";

const course = {
  slug: "course-slug",
  title: "A useful course",
  description: "A course description",
  priceAmount: 499900,
  currency: "INR",
  estimatedDurationMinutes: 60,
  status: "published" as const,
};

describe("course validation", () => {
  it("accepts a published course with a positive purchasable price", () => {
    expect(courseInputSchema.parse(course)).toMatchObject(course);
  });

  it("rejects blank titles", () => {
    expect(courseInputSchema.safeParse({ ...course, title: "  " }).success).toBe(false);
  });

  it("requires a positive price when a Stripe price is configured", () => {
    expect(
      courseInputSchema.safeParse({
        ...course,
        priceAmount: 0,
        stripeProductId: "prod_123",
        stripePriceId: "price_123",
      }).success,
    ).toBe(false);
  });

  it("accepts Stripe product and price identifiers", () => {
    const input = {
      ...course,
      stripeProductId: "prod_123",
      stripePriceId: "price_123",
    };

    expect(courseInputSchema.parse(input)).toMatchObject(input);
    expect(
      courseInputSchema.parse({ ...input, clerkProductId: "prod_obsolete" }),
    ).not.toHaveProperty("clerkProductId");
  });
});

describe("lesson validation", () => {
  const lesson = {
    moduleId: "20000000-0000-4000-8000-000000000001",
    slug: "lesson-slug",
    title: "A useful lesson",
    position: 0,
    videoProvider: "youtube" as const,
    videoReference: "M7lc1UVf-VE",
    durationSeconds: 600,
    isPreview: true,
  };

  it("accepts a valid lesson", () => {
    expect(lessonInputSchema.parse(lesson)).toMatchObject(lesson);
  });

  it("rejects unsupported video providers", () => {
    expect(lessonInputSchema.safeParse({ ...lesson, videoProvider: "upload" }).success).toBe(false);
  });

  it("rejects negative playback duration", () => {
    expect(lessonInputSchema.safeParse({ ...lesson, durationSeconds: -1 }).success).toBe(false);
  });
});

describe("progress validation", () => {
  const progress = {
    userId: "user_123",
    lessonId: "30000000-0000-4000-8000-000000000001",
    lastPositionSeconds: 120,
    maxWatchedPercentage: 0.5,
    completedAt: null,
    completionMethod: null,
  };

  it("accepts finite positions and percentages in range", () => {
    expect(progressUpdateSchema.parse(progress)).toMatchObject(progress);
  });

  it("uses one trimmed non-empty user ID rule", () => {
    expect(userIdSchema.parse("  user_123  ")).toBe("user_123");
    expect(
      progressUpdateSchema.parse({ ...progress, userId: "  user_123  " })
        .userId,
    ).toBe("user_123");
    expect(userIdSchema.safeParse("  ").success).toBe(false);
  });

  it("rejects negative, non-finite, and out-of-range progress values", () => {
    expect(progressUpdateSchema.safeParse({ ...progress, lastPositionSeconds: -1 }).success).toBe(false);
    expect(progressUpdateSchema.safeParse({ ...progress, maxWatchedPercentage: Number.NaN }).success).toBe(false);
    expect(progressUpdateSchema.safeParse({ ...progress, maxWatchedPercentage: 1.1 }).success).toBe(false);
  });
});
