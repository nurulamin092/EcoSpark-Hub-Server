import z from "zod";

export const createIdeaZodSchema = z
  .object({
    title: z
      .string()
      .min(3, "Title must be at least 3 characters")
      .max(200, "Title cannot exceed 200 characters"),
    problem: z
      .string()
      .min(10, "Problem statement must be at least 10 characters")
      .max(5000, "Problem statement cannot exceed 5000 characters"),
    solution: z
      .string()
      .min(10, "Solution must be at least 10 characters")
      .max(5000, "Solution cannot exceed 5000 characters"),
    description: z
      .string()
      .min(20, "Description must be at least 20 characters")
      .max(10000, "Description cannot exceed 10000 characters"),
    categoryId: z.string().uuid("Invalid category ID format"),
    isPaid: z.boolean().optional().default(false),
    price: z
      .number()
      .positive("Price must be positive")
      .max(999999.99, "Price cannot exceed 999,999.99")
      .optional(),
  })
  .refine(
    (data) => {
      if (data.isPaid && (!data.price || data.price <= 0)) {
        return false;
      }
      return true;
    },
    {
      message: "Valid price is required for paid ideas",
      path: ["price"],
    },
  );

export const updateIdeaZodSchema = z
  .object({
    title: z
      .string()
      .min(3, "Title must be at least 3 characters")
      .max(200, "Title cannot exceed 200 characters")
      .optional(),
    problem: z
      .string()
      .min(10, "Problem statement must be at least 10 characters")
      .max(5000, "Problem statement cannot exceed 5000 characters")
      .optional(),
    solution: z
      .string()
      .min(10, "Solution must be at least 10 characters")
      .max(5000, "Solution cannot exceed 5000 characters")
      .optional(),
    description: z
      .string()
      .min(20, "Description must be at least 20 characters")
      .max(10000, "Description cannot exceed 10000 characters")
      .optional(),
    categoryId: z.string().uuid("Invalid category ID format").optional(),
    isPaid: z.boolean().optional(),
    price: z
      .number()
      .positive("Price must be positive")
      .max(999999.99, "Price cannot exceed 999,999.99")
      .optional(),
  })
  .refine(
    (data) => {
      if (data.isPaid === true && (!data.price || data.price <= 0)) {
        return false;
      }
      return true;
    },
    {
      message: "Valid price is required for paid ideas",
      path: ["price"],
    },
  );

export const ideaQueryZodSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
  search: z.string().optional(),
  category: z.string().uuid().optional(),
  isPaid: z.enum(["true", "false"]).optional(),
  sort: z.enum(["recent", "top", "commented", "trending"]).default("recent"),
  status: z.enum(["DRAFT", "UNDER_REVIEW", "APPROVED", "REJECTED"]).optional(),
});
