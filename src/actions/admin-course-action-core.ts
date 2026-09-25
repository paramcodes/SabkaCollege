import { z } from "zod";

import type { AppUser } from "@/src/lib/validation/user";
import { normalizePositions } from "@/src/lib/utils/course-order";

const uuidSchema = z.string().uuid();
const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(160)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens");
const optionalText = z.string().trim().min(1).nullable().optional();

const saveCourseSchema = z.object({
  id: uuidSchema.optional(),
  slug: slugSchema,
  title: z.string().trim().min(1).max(200),
  shortDescription: optionalText,
  description: z.string().trim().min(1).max(20_000),
  coverImageUrl: z.string().url().max(2_000).nullable().optional(),
  status: z.enum(["draft", "published", "archived"]),
  priceAmount: z.number().int().nonnegative().max(100_000_000),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/),
  stripeProductId: optionalText,
  stripePriceId: optionalText,
  estimatedDurationMinutes: z.number().int().nonnegative().max(100_000),
});

const saveModuleSchema = z.object({
  id: uuidSchema.optional(),
  courseId: uuidSchema,
  title: z.string().trim().min(1).max(200),
  description: optionalText,
  position: z.number().int().nonnegative().max(100_000),
});

const saveLessonSchema = z.object({
  id: uuidSchema.optional(),
  moduleId: uuidSchema,
  slug: slugSchema,
  title: z.string().trim().min(1).max(200),
  description: optionalText,
  position: z.number().int().nonnegative().max(100_000),
  videoProvider: z.enum([
    "youtube",
    "vimeo",
    "mux",
    "cloudflare_stream",
    "external",
  ]),
  videoReference: optionalText,
  durationSeconds: z.number().int().nonnegative().max(100_000_000),
  isPreview: z.boolean(),
});

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

export type SaveCourseInput = z.input<typeof saveCourseSchema>;
export type SaveModuleInput = z.input<typeof saveModuleSchema>;
export type SaveLessonInput = z.input<typeof saveLessonSchema>;
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
  | "DATABASE_ERROR";

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
    input: z.output<typeof saveCourseSchema>,
  ) => Promise<{ id: string }>;
  saveModule: (
    input: z.output<typeof saveModuleSchema>,
  ) => Promise<{ id: string }>;
  saveLesson: (
    input: z.output<typeof saveLessonSchema>,
  ) => Promise<{ id: string; courseId: string }>;
  reorderModules: (input: {
    courseId: string;
    moduleIds: string[];
  }) => Promise<void>;
  reorderLessons: (input: {
    moduleId: string;
    lessonIds: string[];
  }) => Promise<void>;
  setCourseStatus: (input: {
    courseId: string;
    status: "draft" | "published" | "archived";
  }) => Promise<void>;
  deleteCourse: (input: { courseId: string }) => Promise<void>;
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

      const parsed = saveCourseSchema.safeParse(input);
      if (!parsed.success) return invalidInput();

      const normalized = normalizePositions([
        {
          ...parsed.data,
          position: 0,
        },
      ])[0];

      try {
        const saved = await repository.saveCourse(normalized);
        await afterCourseWrite(saved.id);
        return { ok: true, data: saved };
      } catch {
        return databaseError();
      }
    },

    saveModule: async (
      input: SaveModuleInput,
    ): Promise<AdminCourseActionResult<{ id: string }>> => {
      const authorization = await authorize(requireAdmin);
      if (!authorization.ok) return authorization;

      const parsed = saveModuleSchema.safeParse(input);
      if (!parsed.success) return invalidInput();
      const normalized = normalizePositions([parsed.data])[0];

      try {
        const saved = await repository.saveModule(normalized);
        await afterCourseWrite(normalized.courseId);
        return { ok: true, data: saved };
      } catch {
        return databaseError();
      }
    },

    saveLesson: async (
      input: SaveLessonInput,
    ): Promise<AdminCourseActionResult<{ id: string }>> => {
      const authorization = await authorize(requireAdmin);
      if (!authorization.ok) return authorization;

      const parsed = saveLessonSchema.safeParse(input);
      if (!parsed.success) return invalidInput();
      const normalized = normalizePositions([parsed.data])[0];

      try {
        const saved = await repository.saveLesson(normalized);
        await afterCourseWrite(saved.courseId);
        return { ok: true, data: { id: saved.id } };
      } catch {
        return databaseError();
      }
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
        await afterCourseWrite(parsed.data.courseId);
        return { ok: true, data: { courseId: parsed.data.courseId } };
      } catch {
        return databaseError();
      }
    },

    reorderLessons: async (
      input: ReorderLessonsInput,
    ): Promise<AdminCourseActionResult<{ moduleId: string }>> => {
      const authorization = await authorize(requireAdmin);
      if (!authorization.ok) return authorization;

      const parsed = reorderLessonsSchema.safeParse(input);
      if (!parsed.success) return invalidInput();
      const lessonIds = orderedIds(parsed.data.lessonIds);

      try {
        await repository.reorderLessons({
          moduleId: parsed.data.moduleId,
          lessonIds,
        });
        await afterCourseWrite(parsed.data.courseId);
        return { ok: true, data: { moduleId: parsed.data.moduleId } };
      } catch {
        return databaseError();
      }
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
        await afterCourseWrite(parsed.data.courseId);
        return { ok: true, data: { courseId: parsed.data.courseId } };
      } catch {
        return databaseError();
      }
    },

    deleteCourse: async (
      input: DeleteCourseInput,
    ): Promise<AdminCourseActionResult<{ courseId: string }>> => {
      const authorization = await authorize(requireAdmin);
      if (!authorization.ok) return authorization;

      const parsed = deleteCourseSchema.safeParse(input);
      if (!parsed.success) return invalidInput();

      try {
        await repository.deleteCourse(parsed.data);
        await invalidateCourse(parsed.data.courseId);
        return { ok: true, data: { courseId: parsed.data.courseId } };
      } catch {
        return databaseError();
      }
    },

    deleteModule: async (
      input: DeleteModuleInput,
    ): Promise<AdminCourseActionResult<{ courseId: string }>> => {
      const authorization = await authorize(requireAdmin);
      if (!authorization.ok) return authorization;

      const parsed = deleteModuleSchema.safeParse(input);
      if (!parsed.success) return invalidInput();

      try {
        const deleted = await repository.deleteModule(parsed.data);
        await afterCourseWrite(deleted.courseId);
        return { ok: true, data: deleted };
      } catch {
        return databaseError();
      }
    },

    deleteLesson: async (
      input: DeleteLessonInput,
    ): Promise<AdminCourseActionResult<{ courseId: string }>> => {
      const authorization = await authorize(requireAdmin);
      if (!authorization.ok) return authorization;

      const parsed = deleteLessonSchema.safeParse(input);
      if (!parsed.success) return invalidInput();

      try {
        const deleted = await repository.deleteLesson(parsed.data);
        await afterCourseWrite(deleted.courseId);
        return { ok: true, data: deleted };
      } catch {
        return databaseError();
      }
    },
  };
}

export type AdminCourseActions = ReturnType<typeof createAdminCourseActions>;
