import { z } from "zod";

export const completionMethodSchema = z.enum(["automatic", "manual"]);

export const progressUpdateSchema = z.object({
  userId: z.string().trim().min(1),
  lessonId: z.string().uuid(),
  lastPositionSeconds: z.number().int().nonnegative(),
  maxWatchedPercentage: z.number().finite().min(0).max(1),
  completedAt: z.date().nullable().optional(),
  completionMethod: completionMethodSchema.nullable().optional(),
});

export type ProgressUpdate = z.infer<typeof progressUpdateSchema>;
