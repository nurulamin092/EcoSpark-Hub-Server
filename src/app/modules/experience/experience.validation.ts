/**
 * @file experience.validation.ts
 * @description Zod validation schemas for Experience module
 * @version 1.0.0
 */

import z from "zod";

export const createExperienceZodSchema = z.object({
  ideaId: z.string().uuid("Invalid idea ID"),
  rating: z
    .number()
    .int()
    .min(1, "Rating must be at least 1")
    .max(10, "Rating cannot exceed 10"),
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title cannot exceed 200 characters"),
  content: z
    .string()
    .min(10, "Content must be at least 10 characters")
    .max(5000, "Content cannot exceed 5000 characters"),
  images: z.array(z.any()).max(10, "Maximum 10 images allowed").optional(),
  results: z
    .array(
      z.object({
        type: z.enum([
          "COST_SAVING",
          "ENERGY_SAVED",
          "WASTE_REDUCED",
          "CO2_REDUCED",
          "TIME_SAVED",
          "OTHER",
        ]),
        amount: z.number().positive(),
        unit: z.string(),
        description: z.string().optional(),
      }),
    )
    .max(5, "Maximum 5 results allowed")
    .optional(),
});

export const updateExperienceZodSchema = createExperienceZodSchema.partial();

export const experienceQueryZodSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
  ideaId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  minRating: z.coerce.number().int().min(1).max(10).optional(),
  maxRating: z.coerce.number().int().min(1).max(10).optional(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "FEATURED"]).optional(),
  sort: z.enum(["recent", "helpful", "rating", "mostLiked"]).default("recent"),
});

export const moderateExperienceZodSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "FEATURED"]),
  feedback: z
    .string()
    .max(500, "Feedback cannot exceed 500 characters")
    .optional(),
});
