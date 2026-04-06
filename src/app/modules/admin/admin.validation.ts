import z from "zod";

export const updateAdminZodSchema = z.object({
  admin: z
    .object({
      name: z.string().min(2, "Name must be at least 2 characters").optional(),
      profilePhoto: z
        .string()
        .url("Profile photo must be a valid URL")
        .optional(),
      contactNumber: z
        .string()
        .regex(
          /^[0-9+]{11,15}$/,
          "Contact number must be 11-15 characters and can include +",
        )
        .optional(),
    })
    .optional(),
});

export const updateMemberZodSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  email: z.string().email("Invalid email format").optional(),
  profilePhoto: z.string().url("Invalid URL").optional(),
  contactNumber: z
    .string()
    .regex(/^[0-9+]{11,15}$/, "Invalid phone number format")
    .optional(),
  address: z.string().max(200, "Address too long").optional(),
  bio: z.string().max(500, "Bio must be less than 500 characters").optional(),
  status: z.enum(["ACTIVE", "BLOCKED"]).optional(),
  role: z.enum(["MEMBER", "MODERATOR"]).optional(),
});

export const bulkActionZodSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, "At least one ID is required"),
  feedback: z.string().max(500, "Feedback too long").optional(),
});

export const exportOptionsZodSchema = z.object({
  format: z.enum(["csv", "json"]).default("csv"),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});
