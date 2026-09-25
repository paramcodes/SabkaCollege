import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AppUser } from "../../../src/lib/validation/user";

const courseId = "10000000-0000-4000-8000-000000000001";
const moduleId = "20000000-0000-4000-8000-000000000001";
const lessonId = "30000000-0000-4000-8000-000000000001";

const admin: AppUser = {
  id: "user_admin",
  email: "admin@example.com",
  name: "Admin",
  avatarUrl: null,
  role: "admin",
  lastSyncedAt: new Date("2026-09-25T00:00:00.000Z"),
  createdAt: new Date("2026-09-25T00:00:00.000Z"),
  updatedAt: new Date("2026-09-25T00:00:00.000Z"),
};

const repository = {
  saveCourse: vi.fn(async () => ({ id: courseId })),
  saveModule: vi.fn(async () => ({ id: moduleId })),
  saveLesson: vi.fn(async () => ({ id: lessonId, courseId })),
  reorderModules: vi.fn(async () => undefined),
  reorderLessons: vi.fn(async () => undefined),
  setCourseStatus: vi.fn(async () => undefined),
  deleteCourse: vi.fn(async () => ({ courseId })),
  deleteModule: vi.fn(async () => ({ courseId })),
  deleteLesson: vi.fn(async () => ({ courseId })),
};

const requireAdmin = vi.fn<() => Promise<AppUser>>();
const invalidateCourse = vi.fn(async () => undefined);
const refreshCourseEditor = vi.fn(async () => undefined);

const { createAdminCourseActions } = await import(
  "../../../src/actions/admin-course-action-core"
);

const actions = createAdminCourseActions({
  requireAdmin,
  repository,
  invalidateCourse,
  refreshCourseEditor,
});

const validInputs = {
  saveCourse: {
    id: courseId,
    slug: "  design-systems-101  ",
    title: "  Design systems 101  ",
    shortDescription: "A focused course",
    description: "Learn the core system.",
    coverImageUrl: null,
    status: "draft" as const,
    priceAmount: 49900,
    currency: "INR",
    stripeProductId: "prod_test",
    stripePriceId: "price_test",
    estimatedDurationMinutes: 120,
  },
  saveModule: {
    id: moduleId,
    courseId,
    title: "  Foundations  ",
    description: "Start here.",
    position: 0,
  },
  saveLesson: {
    id: lessonId,
    courseId,
    moduleId,
    slug: "  course-outline  ",
    title: "  Course outline  ",
    description: "Meet the syllabus.",
    position: 0,
    videoProvider: "youtube" as const,
    videoReference: "video_123",
    durationSeconds: 600,
    isPreview: true,
  },
  reorderModules: { courseId, moduleIds: [moduleId] },
  reorderLessons: { courseId, moduleId, lessonIds: [lessonId] },
  setCourseStatus: { courseId, status: "published" as const },
} as const;

beforeEach(() => {
  requireAdmin.mockReset();
  invalidateCourse.mockReset();
  refreshCourseEditor.mockReset();
  for (const method of Object.values(repository)) method.mockClear();
  requireAdmin.mockResolvedValue(admin);
});

describe("admin course action authorization", () => {
  const cases = [
    ["saveCourse", validInputs.saveCourse],
    ["saveModule", validInputs.saveModule],
    ["saveLesson", validInputs.saveLesson],
    ["reorderModules", validInputs.reorderModules],
    ["reorderLessons", validInputs.reorderLessons],
    ["setCourseStatus", validInputs.setCourseStatus],
  ] as const;

  for (const [name, input] of cases) {
    it(`${name} fails closed for a signed-out user`, async () => {
      requireAdmin.mockRejectedValue(new Error("Authentication required"));

      const result = await actions[name](input as never);

      expect(result).toEqual({
        ok: false,
        error: {
          code: "UNAUTHENTICATED",
          message: "Sign in with an administrator account.",
        },
      });
      expect(invalidateCourse).not.toHaveBeenCalled();
    });

    it(`${name} rejects a student`, async () => {
      requireAdmin.mockRejectedValue(new Error("Admin access required"));

      const result = await actions[name](input as never);

      expect(result).toEqual({
        ok: false,
        error: {
          code: "FORBIDDEN",
          message: "Administrator access is required.",
        },
      });
      expect(invalidateCourse).not.toHaveBeenCalled();
    });
  }
});

describe("admin course action validation", () => {
  it("rejects an invalid course slug before writing", async () => {
    const result = await actions.saveCourse({
      ...validInputs.saveCourse,
      slug: "not a course slug",
    });

    expect(result.ok).toBe(false);
    expect(repository.saveCourse).not.toHaveBeenCalled();
    expect(invalidateCourse).not.toHaveBeenCalled();
  });

  it("rejects an invalid lesson slug before writing", async () => {
    const result = await actions.saveLesson({
      ...validInputs.saveLesson,
      slug: "Not A Slug",
    });

    expect(result.ok).toBe(false);
    expect(repository.saveLesson).not.toHaveBeenCalled();
    expect(invalidateCourse).not.toHaveBeenCalled();
  });

  it("rejects reorder input that repeats an id", async () => {
    const result = await actions.reorderModules({
      courseId,
      moduleIds: [moduleId, moduleId],
    });

    expect(result.ok).toBe(false);
    expect(repository.reorderModules).not.toHaveBeenCalled();
  });
});

describe("admin course action success", () => {
  it("normalizes course content before persistence", async () => {
    const result = await actions.saveCourse(validInputs.saveCourse);

    expect(result).toEqual({ ok: true, data: { id: courseId } });
    expect(repository.saveCourse).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: "design-systems-101",
        title: "Design systems 101",
      }),
    );
    expect(invalidateCourse).toHaveBeenCalledWith(courseId);
  });

  it("normalizes lesson content before persistence", async () => {
    const result = await actions.saveLesson(validInputs.saveLesson);

    expect(result).toEqual({ ok: true, data: { id: lessonId } });
    expect(repository.saveLesson).toHaveBeenCalledWith(
      expect.objectContaining({
        id: lessonId,
        moduleId,
        slug: "course-outline",
        title: "Course outline",
      }),
    );
  });

  it("invalidates caches only after a successful repository write", async () => {
    repository.saveModule.mockRejectedValueOnce(new Error("database unavailable"));

    const result = await actions.saveModule(validInputs.saveModule);

    expect(result).toEqual({
      ok: false,
      error: {
        code: "DATABASE_ERROR",
        message: "The course could not be saved. Please try again.",
      },
    });
    expect(invalidateCourse).not.toHaveBeenCalled();
    expect(refreshCourseEditor).not.toHaveBeenCalled();
  });

  it("reorders exact id sets using normalized positions", async () => {
    const secondModuleId = "20000000-0000-4000-8000-000000000002";

    const result = await actions.reorderModules({
      courseId,
      moduleIds: [secondModuleId, moduleId],
    });

    expect(result).toEqual({ ok: true, data: { courseId } });
    expect(repository.reorderModules).toHaveBeenCalledWith({
      courseId,
      moduleIds: [secondModuleId, moduleId],
    });
  });

  it("passes course ownership through lesson reordering", async () => {
    const result = await actions.reorderLessons({
      ...validInputs.reorderLessons,
      lessonIds: [...validInputs.reorderLessons.lessonIds],
    });

    expect(result).toEqual({ ok: true, data: { courseId } });
    expect(repository.reorderLessons).toHaveBeenCalledWith({
      courseId,
      moduleId,
      lessonIds: [lessonId],
    });
  });

  it("does not report a cache failure as a database failure", async () => {
    invalidateCourse.mockRejectedValueOnce(new Error("cache unavailable"));

    const result = await actions.saveCourse(validInputs.saveCourse);

    expect(result).toEqual({
      ok: false,
      error: {
        code: "CACHE_ERROR",
        message: "The course was saved, but the page could not be refreshed. Please try again.",
      },
    });
    expect(repository.saveCourse).toHaveBeenCalledTimes(1);
  });

  it("rejects publishing when the repository reports incomplete content", async () => {
    repository.setCourseStatus.mockRejectedValueOnce(
      new Error("Course is not ready to publish"),
    );

    const result = await actions.setCourseStatus({
      courseId,
      status: "published",
    });

    expect(result).toEqual({
      ok: false,
      error: {
        code: "NOT_READY",
        message:
          "The course is not ready to publish. Add a price, Stripe product and price, a module, and a lesson before publishing.",
      },
    });
    expect(invalidateCourse).not.toHaveBeenCalled();
  });

  it("reports missing repository content as not found", async () => {
    repository.deleteCourse.mockRejectedValueOnce(new Error("Course not found"));

    const result = await actions.deleteCourse({ courseId });

    expect(result).toEqual({
      ok: false,
      error: {
        code: "NOT_FOUND",
        message: "The requested course content could not be found.",
      },
    });
    expect(repository.deleteCourse).toHaveBeenCalledTimes(1);
    expect(invalidateCourse).not.toHaveBeenCalled();
  });
});
