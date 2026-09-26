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

  it("derives watched percentage from the canonical duration and ignores a claimed percentage", async () => {
    const { dependencies, actions } = makeDependencies();
    const result = await actions.saveLessonProgress({
      courseSlug: "course-one",
      lessonSlug: "lesson-one",
      lastPositionSeconds: 0,
      maxWatchedPercentage: 0.9,
    });

    expect(result).toEqual({
      ok: true,
      data: { completed: false, courseProgress: 50 },
    });
    expect(dependencies.upsertProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        lastPositionSeconds: 0,
        maxWatchedPercentage: 0,
        completedAt: null,
        completionMethod: null,
      }),
    );
  });

  it("sets automatic completion only when canonical playback reaches ninety percent", async () => {
    const { dependencies, actions } = makeDependencies();
    await actions.saveLessonProgress({
      courseSlug: "course-one",
      lessonSlug: "lesson-one",
      lastPositionSeconds: 89,
      maxWatchedPercentage: 1,
    });
    await actions.saveLessonProgress({
      courseSlug: "course-one",
      lessonSlug: "lesson-one",
      lastPositionSeconds: 90,
      maxWatchedPercentage: 0,
    });

    expect(dependencies.upsertProgress).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        maxWatchedPercentage: 0.89,
        completionMethod: null,
        completedAt: null,
      }),
    );
    expect(dependencies.upsertProgress).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        maxWatchedPercentage: 0.9,
        completionMethod: "automatic",
      }),
    );
  });

  it("never auto-completes a lesson with a zero canonical duration", async () => {
    const { dependencies, actions } = makeDependencies({
      findLesson: vi.fn(async () => ({ ...lesson, durationSeconds: 0 })),
    });
    const result = await actions.saveLessonProgress({
      courseSlug: "course-one",
      lessonSlug: "lesson-one",
      lastPositionSeconds: 120,
      maxWatchedPercentage: 1,
    });

    expect(result).toMatchObject({ ok: true, data: { completed: false } });
    expect(dependencies.upsertProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        lastPositionSeconds: 0,
        maxWatchedPercentage: 0,
        completedAt: null,
        completionMethod: null,
      }),
    );
  });

  it("does not auto-complete a zero-duration lesson from existing high progress", async () => {
    const { dependencies, actions } = makeDependencies({
      findLesson: vi.fn(async () => ({ ...lesson, durationSeconds: 0 })),
      getProgress: vi.fn(async () => ({
        lastPositionSeconds: 0,
        maxWatchedPercentage: 0.95,
        completedAt: null,
        completionMethod: null,
      })),
    });
    const result = await actions.saveLessonProgress({
      courseSlug: "course-one",
      lessonSlug: "lesson-one",
      lastPositionSeconds: 0,
    });

    expect(result).toEqual({
      ok: true,
      data: { completed: false, courseProgress: 50 },
    });
    expect(dependencies.upsertProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        maxWatchedPercentage: 0.95,
        completedAt: null,
        completionMethod: null,
      }),
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
