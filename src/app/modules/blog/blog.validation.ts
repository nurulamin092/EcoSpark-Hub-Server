/**
 * @file blog.validation.ts
 * @description Zod validation schemas for Blog module
 * @version 1.0.0
 */

import z from "zod";

export const createBlogZodSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(200),
  content: z.string().min(50, "Content must be at least 50 characters"),
  excerpt: z
    .string()
    .max(300, "Excerpt cannot exceed 300 characters")
    .optional(),
  featuredImage: z.string().url("Invalid image URL").optional(),
  images: z.array(z.any()).optional(),
  videoUrl: z.string().url("Invalid video URL").optional(),
  categoryId: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
  metaTitle: z
    .string()
    .max(70, "Meta title cannot exceed 70 characters")
    .optional(),
  metaDescription: z
    .string()
    .max(160, "Meta description cannot exceed 160 characters")
    .optional(),
  metaKeywords: z.string().optional(),
});

export const updateBlogZodSchema = createBlogZodSchema.partial().extend({
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  isFeatured: z.boolean().optional(),
});

export const blogQueryZodSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
  search: z.string().optional(),
  category: z.string().uuid().optional(),
  tag: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  sort: z.enum(["recent", "popular", "trending"]).default("recent"),
});

export const createCommentZodSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty").max(5000),
  blogId: z.string().uuid(),
  parentId: z.string().uuid().optional(),
});

export const updateCommentZodSchema = z.object({
  content: z.string().min(1).max(5000),
});

export const createCategoryZodSchema = z.object({
  name: z.string().min(2).max(50),
  description: z.string().max(500).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format")
    .optional(),
  icon: z.string().optional(),
  image: z.string().url().optional(),
});

export const createTagZodSchema = z.object({
  name: z.string().min(2).max(30),
  description: z.string().max(200).optional(),
});
