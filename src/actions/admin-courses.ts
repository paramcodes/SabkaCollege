"use server";

import { revalidatePath, revalidateTag } from "next/cache";

import { requireAdmin } from "@/src/lib/auth/guards";
import {
  courseCacheTag,
  publishedCoursesCacheTag,
} from "@/src/lib/cache/tags";

import {
  createAdminCourseActions,
  type AdminCourseActions,
} from "./admin-course-action-core";

let actionsPromise: Promise<AdminCourseActions> | undefined;

const getActions = async (): Promise<AdminCourseActions> => {
  if (!actionsPromise) {
    actionsPromise = (async () => {
      const { adminCourseRepository } = await import(
        "@/src/db/admin-courses"
      );

      return createAdminCourseActions({
        requireAdmin,
        repository: adminCourseRepository,
        invalidateCourse: async (courseId) => {
          revalidateTag(publishedCoursesCacheTag, "max");
          revalidateTag(courseCacheTag(courseId), "max");
        },
        refreshCourseEditor: async (courseId) => {
          revalidatePath("/admin", "layout");
          revalidatePath(`/admin/courses/${courseId}/edit`);
        },
      });
    })();
  }

  return actionsPromise;
};

export async function saveCourse(
  input: Parameters<AdminCourseActions["saveCourse"]>[0],
) {
  return (await getActions()).saveCourse(input);
}

export async function saveModule(
  input: Parameters<AdminCourseActions["saveModule"]>[0],
) {
  return (await getActions()).saveModule(input);
}

export async function saveLesson(
  input: Parameters<AdminCourseActions["saveLesson"]>[0],
) {
  return (await getActions()).saveLesson(input);
}

export async function reorderModules(
  input: Parameters<AdminCourseActions["reorderModules"]>[0],
) {
  return (await getActions()).reorderModules(input);
}

export async function reorderLessons(
  input: Parameters<AdminCourseActions["reorderLessons"]>[0],
) {
  return (await getActions()).reorderLessons(input);
}

export async function setCourseStatus(
  input: Parameters<AdminCourseActions["setCourseStatus"]>[0],
) {
  return (await getActions()).setCourseStatus(input);
}

export async function deleteCourse(
  input: Parameters<AdminCourseActions["deleteCourse"]>[0],
) {
  return (await getActions()).deleteCourse(input);
}

export async function deleteModule(
  input: Parameters<AdminCourseActions["deleteModule"]>[0],
) {
  return (await getActions()).deleteModule(input);
}

export async function deleteLesson(
  input: Parameters<AdminCourseActions["deleteLesson"]>[0],
) {
  return (await getActions()).deleteLesson(input);
}
