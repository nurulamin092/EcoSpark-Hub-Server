import z from "zod";

export const voteZodSchema = z.object({
  ideaId: z.string().uuid("Invalid idea ID format"),
  type: z.enum(["UP", "DOWN"]),
});
