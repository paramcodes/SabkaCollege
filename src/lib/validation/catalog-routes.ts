import { z } from "zod";

export const MAX_COURSE_SLUG_LENGTH = 100;
export const MAX_LESSON_SLUG_LENGTH = 100;

const safeSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const courseSlugSchema = z
  .string()
  .min(1)
  .max(MAX_COURSE_SLUG_LENGTH)
  .regex(safeSlugPattern);

export const lessonSlugSchema = z
  .string()
  .min(1)
  .max(MAX_LESSON_SLUG_LENGTH)
  .regex(safeSlugPattern);
