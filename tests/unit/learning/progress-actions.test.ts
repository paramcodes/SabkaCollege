import { describe, expect, it, vi } from "vitest";

import { createProgressActions } from "@/src/lib/learning/progress-actions";

const lesson = {
  lessonId: "lesson-1",
  courseId: "course-1",
  durationSeconds: 100,
};

function makeDependencies(overrides: Partial<Parameters<typeof createProgressActions>[0]> = {}) {
  const dependencies = {
    requireUser: vi.fn(async () => ({ id: "server-user" })),
    findLesson: vi.fn(async () => lesson),
    hasCourseAccess: vi.fn(async () => true),
    getProgress: vi.fn(async () => null),
    upsertProgress: vi.fn(async () => undefined),
    getCourseProgress: vi.fn(async () => 50),
    ...overrides,
  };
  return { dependencies, actions: createProgressActions(dependencies) };
}

describe("progress actions", () => {
  it("derives the current user and course/lesson identity server-side", async () => {
    const { dependencies, actions } = makeDependencies();
    const result = await actions.saveLessonProgress({
      courseSlug: "course-one",
      lessonSlug: "lesson-one",
      lastPositionSeconds: 10,
      maxWatchedPercentage: 0.1,
      userId: "attacker-user",
    } as never);

    expect(result.ok).toBe(true);
    expect(dependencies.upsertProgress).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "server-user", lessonId: "lesson-1" }),
    );
  });

  it("rejects a lesson outside the current user's paid course", async () => {
    const { dependencies, actions } = makeDependencies({
      hasCourseAccess: vi.fn(async () => false),
    });
    const result = await actions.saveLessonProgress({
      courseSlug: "course-one",
      lessonSlug: "lesson-one",
      lastPositionSeconds: 10,
      maxWatchedPercentage: 0.1,
    });

    expect(result).toEqual({
      ok: false,
      error: { code: "FORBIDDEN", message: "Purchase this course to access its lessons." },
    });
    expect(dependencies.upsertProgress).not.toHaveBeenCalled();
  });

  it("sets automatic completion only at ninety percent", async () => {
    const { dependencies, actions } = makeDependencies();
    await actions.saveLessonProgress({
      courseSlug: "course-one",
      lessonSlug: "lesson-one",
      lastPositionSeconds: 89,
      maxWatchedPercentage: 0.89,
    });
    await actions.saveLessonProgress({
      courseSlug: "course-one",
      lessonSlug: "lesson-one",
      lastPositionSeconds: 90,
      maxWatchedPercentage: 0.9,
    });

    expect(dependencies.upsertProgress).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ completionMethod: null, completedAt: null }),
    );
    expect(dependencies.upsertProgress).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ completionMethod: "automatic" }),
    );
  });

  it("records manual completion without trusting a client completion flag", async () => {
    const { dependencies, actions } = makeDependencies();
    const result = await actions.markLessonComplete({
      courseSlug: "course-one",
      lessonSlug: "lesson-one",
      completed: false,
    } as never);

    expect(result.ok).toBe(true);
    expect(dependencies.upsertProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "server-user",
        lessonId: "lesson-1",
        completionMethod: "manual",
        completedAt: expect.any(Date),
      }),
    );
  });
});
