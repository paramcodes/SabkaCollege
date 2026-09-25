import { z } from "zod";

const nonEmptyText = z.string().trim().min(1);
const optionalText = z.string().trim().min(1).nullable().optional();
const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(160)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use lowercase letters, numbers, and single hyphens",
  );

export const lessonVideoProviderSchema = z.enum([
  "youtube",
  "vimeo",
  "mux",
  "cloudflare_stream",
  "external",
]);

export const videoReferenceSchema = nonEmptyText;
export const externalVideoReferenceSchema = nonEmptyText;

export const lessonInputSchema = z.object({
  moduleId: z.string().uuid(),
  slug: slugSchema,
  title: nonEmptyText,
  description: optionalText,
  position: z.number().int().nonnegative(),
  videoProvider: lessonVideoProviderSchema,
  videoReference: videoReferenceSchema.nullable().optional(),
  durationSeconds: z.number().int().nonnegative(),
  isPreview: z.boolean(),
});

export type LessonInput = z.infer<typeof lessonInputSchema>;
