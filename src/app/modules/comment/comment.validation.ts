import z from "zod";

export const createCommentZodSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty"),
  ideaId: z.string().uuid(),
  parentId: z.string().uuid().optional(),
});

export const updateCommentZodSchema = z.object({
  content: z.string().min(1),
});
