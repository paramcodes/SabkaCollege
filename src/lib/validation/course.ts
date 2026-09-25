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

export const courseStatusSchema = z.enum(["draft", "published", "archived"]);

export const courseInputSchema = z
  .object({
    slug: slugSchema,
    title: nonEmptyText,
    shortDescription: optionalText,
    description: nonEmptyText,
    coverImageUrl: z.string().url().nullable().optional(),
    status: courseStatusSchema,
    priceAmount: z.number().int().nonnegative(),
    currency: nonEmptyText,
    stripeProductId: optionalText,
    stripePriceId: optionalText,
    estimatedDurationMinutes: z.number().int().nonnegative(),
    purchasable: z.boolean().optional(),
  })
  .superRefine((course, context) => {
    if ((course.purchasable === true || course.stripePriceId) && course.priceAmount <= 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["priceAmount"],
        message: "Purchasable courses require a positive price",
      });
    }
  });

export const moduleInputSchema = z.object({
  courseId: z.string().uuid(),
  title: nonEmptyText,
  description: optionalText,
  position: z.number().int().nonnegative(),
});

export type CourseInput = z.infer<typeof courseInputSchema>;
export type ModuleInput = z.infer<typeof moduleInputSchema>;
