import { z } from "zod";

const nonEmptyText = z.string().trim().min(1);
const optionalText = z.string().trim().min(1).nullable().optional();

export const courseStatusSchema = z.enum(["draft", "published", "archived"]);

export const courseInputSchema = z
  .object({
    slug: nonEmptyText,
    title: nonEmptyText,
    shortDescription: optionalText,
    description: nonEmptyText,
    coverImageUrl: z.string().url().nullable().optional(),
    status: courseStatusSchema,
    priceAmount: z.number().int().nonnegative(),
    currency: nonEmptyText,
    clerkProductId: optionalText,
    clerkPriceId: optionalText,
    estimatedDurationMinutes: z.number().int().nonnegative(),
    purchasable: z.boolean().optional(),
  })
  .superRefine((course, context) => {
    if ((course.purchasable === true || course.clerkPriceId) && course.priceAmount <= 0) {
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
