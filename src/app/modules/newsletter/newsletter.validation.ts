import { z } from "zod";

export const subscribeSchema = z.object({
  body: z.object({
    email: z.string().email(),
  }),
});
