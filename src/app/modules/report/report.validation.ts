import z from "zod";

export const createReportZodSchema = z.object({
  body: z.object({
    type: z.enum(["IDEA", "COMMENT"]),
    ideaId: z.string().optional(),
    commentId: z.string().optional(),
    reason: z.string().min(3),
    details: z.string().optional(),
  }),
});
