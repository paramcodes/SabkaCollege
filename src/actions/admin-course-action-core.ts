import { z } from "zod";

import type { AppUser } from "@/src/lib/validation/user";
import {
  courseInputSchema,
  moduleInputSchema,
} from "@/src/lib/validation/course";
import { lessonInputSchema } from "@/src/lib/validation/lesson";
import { normalizePositions } from "@/src/lib/utils/course-order";

const uuidSchema = z.string().uuid();
const optionalText = z.string().trim().min(1).nullable().optional();

const adminCourseSchema = courseInputSchema.and(
  z.object({
    id: uuidSchema.optional(),
    title: z.string().trim().min(1).max(200),
    shortDescription: optionalText,
    description: z.string().trim().min(1).max(20_000),
    coverImageUrl: z.string().url().max(2_000).nullable().optional(),
    currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/),
    priceAmount: z.number().int().nonnegative().max(100_000_000),
    estimatedDurationMinutes: z.number().int().nonnegative().max(100_000),
  }),
);

const adminModuleSchema = moduleInputSchema.and(
  z.object({
    id: uuidSchema.optional(),
    title: z.string().trim().min(1).max(200),
    description: optionalText,
    position: z.number().int().nonnegative().max(100_000),
  }),
);

const adminLessonSchema = lessonInputSchema.and(
  z.object({
    id: uuidSchema.optional(),
    courseId: uuidSchema,
    title: z.string().trim().min(1).max(200),
    description: optionalText,
    position: z.number().int().nonnegative().max(100_000),
    videoReference: optionalText,
    durationSeconds: z.number().int().nonnegative().max(100_000_000),
  }),
);

const uniqueUuidList = z.array(uuidSchema).min(1).max(1_000).refine(
  (ids) => new Set(ids).size === ids.length,
  "Each item must appear once",
);

const reorderModulesSchema = z.object({
  courseId: uuidSchema,
  moduleIds: uniqueUuidList,
});

const reorderLessonsSchema = z.object({
  courseId: uuidSchema,
  moduleId: uuidSchema,
  lessonIds: uniqueUuidList,
});

const setCourseStatusSchema = z.object({
  courseId: uuidSchema,
  status: z.enum(["draft", "published", "archived"]),
});

const deleteCourseSchema = z.object({ courseId: uuidSchema });
const deleteModuleSchema = z.object({
  courseId: uuidSchema,
  moduleId: uuidSchema,
});
const deleteLessonSchema = z.object({
  courseId: uuidSchema,
  moduleId: uuidSchema,
  lessonId: uuidSchema,
});

export type SaveCourseInput = z.input<typeof adminCourseSchema>;
export type SaveModuleInput = z.input<typeof adminModuleSchema>;
export type SaveLessonInput = z.input<typeof adminLessonSchema>;
export type ReorderModulesInput = z.input<typeof reorderModulesSchema>;
export type ReorderLessonsInput = z.input<typeof reorderLessonsSchema>;
export type SetCourseStatusInput = z.input<typeof setCourseStatusSchema>;
export type DeleteCourseInput = z.input<typeof deleteCourseSchema>;
export type DeleteModuleInput = z.input<typeof deleteModuleSchema>;
export type DeleteLessonInput = z.input<typeof deleteLessonSchema>;

export type AdminCourseActionErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "INVALID_INPUT"
  | "DATABASE_ERROR"
  | "CACHE_ERROR";

export type AdminCourseActionResult<T = undefined> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: {
        code: AdminCourseActionErrorCode;
        message: string;
      };
    };

export type AdminCourseRepository = {
  saveCourse: (
    input: z.output<typeof adminCourseSchema>,
  ) => Promise<{ id: string }>;
  saveModule: (
    input: z.output<typeof adminModuleSchema>,
  ) => Promise<{ id: string }>;
  saveLesson: (
    input: z.output<typeof adminLessonSchema>,
  ) => Promise<{ id: string; courseId: string }>;
  reorderModules: (input: {
    courseId: string;
    moduleIds: string[];
  }) => Promise<void>;
  reorderLessons: (input: {
    courseId: string;
    moduleId: string;
    lessonIds: string[];
  }) => Promise<void>;
  setCourseStatus: (input: {
    courseId: string;
    status: "draft" | "published" | "archived";
  }) => Promise<void>;
  deleteCourse: (input: { courseId: string }) => Promise<{ courseId: string }>;
  deleteModule: (input: {
    courseId: string;
    moduleId: string;
  }) => Promise<{ courseId: string }>;
  deleteLesson: (input: {
    courseId: string;
    moduleId: string;
    lessonId: string;
  }) => Promise<{ courseId: string }>;
};

type AdminCourseActionDependencies = {
  requireAdmin: () => Promise<AppUser>;
  repository: AdminCourseRepository;
  invalidateCourse: (courseId: string) => Promise<void>;
  refreshCourseEditor: (courseId: string) => Promise<void>;
};

const invalidInput = (): AdminCourseActionResult<never> => ({
  ok: false,
  error: {
    code: "INVALID_INPUT",
    message: "Check the course details and try again.",
  },
});

const databaseError = (): AdminCourseActionResult<never> => ({
  ok: false,
  error: {
    code: "DATABASE_ERROR",
    message: "The course could not be saved. Please try again.",
  },
});

const cacheError = (): AdminCourseActionResult<never> => ({
  ok: false,
  error: {
    code: "CACHE_ERROR",
    message: "The course was saved, but the page could not be refreshed. Please try again.",
  },
});

const authorize = async (
  requireAdmin: AdminCourseActionDependencies["requireAdmin"],
): Promise<AdminCourseActionResult<never> | { ok: true; data: AppUser }> => {
  try {
    return { ok: true, data: await requireAdmin() };
  } catch (error) {
    if (error instanceof Error && error.message === "Authentication required") {
      return {
        ok: false,
        error: {
          code: "UNAUTHENTICATED",
          message: "Sign in with an administrator account.",
        },
      };
    }

    return {
      ok: false,
      error: {
        code: "FORBIDDEN",
        message: "Administrator access is required.",
      },
    };
  }
};

const orderedIds = (ids: string[]): string[] =>
  normalizePositions(ids.map((id, position) => ({ id, position }))).map(
    ({ id }) => id,
  );

export function createAdminCourseActions({
  requireAdmin,
  repository,
  invalidateCourse,
  refreshCourseEditor,
}: AdminCourseActionDependencies) {
  const afterCourseWrite = async (courseId: string) => {
    await invalidateCourse(courseId);
    await refreshCourseEditor(courseId);
  };

  return {
    saveCourse: async (
      input: SaveCourseInput,
    ): Promise<AdminCourseActionResult<{ id: string }>> => {
      const authorization = await authorize(requireAdmin);
      if (!authorization.ok) return authorization;

      const parsed = adminCourseSchema.safeParse(input);
      if (!parsed.success) return invalidInput();

      const normalized = normalizePositions([
        {
          ...parsed.data,
          position: 0,
        },
      ])[0];

      let saved: { id: string };
      try {
        saved = await repository.saveCourse(normalized);
      } catch {
        return databaseError();
      }

      try {
        await afterCourseWrite(saved.id);
      } catch {
        return cacheError();
      }
      return { ok: true, data: saved };
    },

    saveModule: async (
      input: SaveModuleInput,
    ): Promise<AdminCourseActionResult<{ id: string }>> => {
      const authorization = await authorize(requireAdmin);
      if (!authorization.ok) return authorization;

      const parsed = adminModuleSchema.safeParse(input);
      if (!parsed.success) return invalidInput();
      const normalized = normalizePositions([parsed.data])[0];

      let saved: { id: string };
      try {
        saved = await repository.saveModule(normalized);
      } catch {
        return databaseError();
      }

      try {
        await afterCourseWrite(normalized.courseId);
      } catch {
        return cacheError();
      }
      return { ok: true, data: saved };
    },

    saveLesson: async (
      input: SaveLessonInput,
    ): Promise<AdminCourseActionResult<{ id: string }>> => {
      const authorization = await authorize(requireAdmin);
      if (!authorization.ok) return authorization;

      const parsed = adminLessonSchema.safeParse(input);
      if (!parsed.success) return invalidInput();
      const normalized = normalizePositions([parsed.data])[0];

      let saved: { id: string; courseId: string };
      try {
        saved = await repository.saveLesson(normalized);
      } catch {
        return databaseError();
      }

      try {
        await afterCourseWrite(saved.courseId);
      } catch {
        return cacheError();
      }
      return { ok: true, data: { id: saved.id } };
    },

    reorderModules: async (
      input: ReorderModulesInput,
    ): Promise<AdminCourseActionResult<{ courseId: string }>> => {
      const authorization = await authorize(requireAdmin);
      if (!authorization.ok) return authorization;

      const parsed = reorderModulesSchema.safeParse(input);
      if (!parsed.success) return invalidInput();
      const moduleIds = orderedIds(parsed.data.moduleIds);

      try {
        await repository.reorderModules({ ...parsed.data, moduleIds });
      } catch {
        return databaseError();
      }

      try {
        await afterCourseWrite(parsed.data.courseId);
      } catch {
        return cacheError();
      }
      return { ok: true, data: { courseId: parsed.data.courseId } };
    },

    reorderLessons: async (
      input: ReorderLessonsInput,
    ): Promise<AdminCourseActionResult<{ courseId: string }>> => {
      const authorization = await authorize(requireAdmin);
      if (!authorization.ok) return authorization;

      const parsed = reorderLessonsSchema.safeParse(input);
      if (!parsed.success) return invalidInput();
      const lessonIds = orderedIds(parsed.data.lessonIds);

      try {
        await repository.reorderLessons({
          courseId: parsed.data.courseId,
          moduleId: parsed.data.moduleId,
          lessonIds,
        });
      } catch {
        return databaseError();
      }

      try {
        await afterCourseWrite(parsed.data.courseId);
      } catch {
        return cacheError();
      }
      return { ok: true, data: { courseId: parsed.data.courseId } };
    },

    setCourseStatus: async (
      input: SetCourseStatusInput,
    ): Promise<AdminCourseActionResult<{ courseId: string }>> => {
      const authorization = await authorize(requireAdmin);
      if (!authorization.ok) return authorization;

      const parsed = setCourseStatusSchema.safeParse(input);
      if (!parsed.success) return invalidInput();

      try {
        await repository.setCourseStatus(parsed.data);
      } catch {
        return databaseError();
      }

      try {
        await afterCourseWrite(parsed.data.courseId);
      } catch {
        return cacheError();
      }
      return { ok: true, data: { courseId: parsed.data.courseId } };
    },

    deleteCourse: async (
      input: DeleteCourseInput,
    ): Promise<AdminCourseActionResult<{ courseId: string }>> => {
      const authorization = await authorize(requireAdmin);
      if (!authorization.ok) return authorization;

      const parsed = deleteCourseSchema.safeParse(input);
      if (!parsed.success) return invalidInput();

      let deleted: { courseId: string };
      try {
        deleted = await repository.deleteCourse(parsed.data);
      } catch {
        return databaseError();
      }

      try {
        await invalidateCourse(deleted.courseId);
      } catch {
        return cacheError();
      }
      return { ok: true, data: deleted };
    },

    deleteModule: async (
      input: DeleteModuleInput,
    ): Promise<AdminCourseActionResult<{ courseId: string }>> => {
      const authorization = await authorize(requireAdmin);
      if (!authorization.ok) return authorization;

      const parsed = deleteModuleSchema.safeParse(input);
      if (!parsed.success) return invalidInput();

      let deleted: { courseId: string };
      try {
        deleted = await repository.deleteModule(parsed.data);
      } catch {
        return databaseError();
      }

      try {
        await afterCourseWrite(deleted.courseId);
      } catch {
        return cacheError();
      }
      return { ok: true, data: deleted };
    },

    deleteLesson: async (
      input: DeleteLessonInput,
    ): Promise<AdminCourseActionResult<{ courseId: string }>> => {
      const authorization = await authorize(requireAdmin);
      if (!authorization.ok) return authorization;

      const parsed = deleteLessonSchema.safeParse(input);
      if (!parsed.success) return invalidInput();

      let deleted: { courseId: string };
      try {
        deleted = await repository.deleteLesson(parsed.data);
      } catch {
        return databaseError();
      }

      try {
        await afterCourseWrite(deleted.courseId);
      } catch {
        return cacheError();
      }
      return { ok: true, data: deleted };
    },
  };
}

export type AdminCourseActions = ReturnType<typeof createAdminCourseActions>;
