import z from "zod";

export const createIdeaZodSchema = z
  .object({
    title: z.string().min(3),
    problem: z.string(),
    solution: z.string(),
    description: z.string(),
    categoryId: z.string(),

    isPaid: z.boolean().optional(),
    price: z.number().optional(),
  })
  .refine(
    (data) => {
      if (data.isPaid && !data.price) return false;
      return true;
    },
    {
      message: "Price is required for paid idea",
      path: ["price"],
    },
  );

export const updateIdeaZodSchema = z.object({
  title: z.string().optional(),
  problem: z.string().optional(),
  solution: z.string().optional(),
  description: z.string().optional(),
  categoryId: z.string().optional(),

  isPaid: z.boolean().optional(),
  price: z.number().optional(),
});
