import { z } from "zod";

const nonEmptyText = z.string().trim().min(1);
const optionalText = z.string().trim().min(1).nullable().optional();

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
  slug: nonEmptyText,
  title: nonEmptyText,
  description: optionalText,
  position: z.number().int().nonnegative(),
  videoProvider: lessonVideoProviderSchema,
  videoReference: videoReferenceSchema.nullable().optional(),
  durationSeconds: z.number().int().nonnegative(),
  isPreview: z.boolean(),
});

export type LessonInput = z.infer<typeof lessonInputSchema>;
