/**
 * @file blog.route.ts
 * @description Route definitions for Blog module
 * @version 1.0.0
 */

import { Router } from "express";
import * as BlogController from "./blog.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";
import { validateRequest } from "../../middleware/validateRequest";
import {
  createBlogZodSchema,
  updateBlogZodSchema,
  blogQueryZodSchema,
  createCommentZodSchema,
  createCategoryZodSchema,
  createTagZodSchema,
} from "./blog.validation";
import { writeRateLimiter } from "../../middleware/rateLimiter";

const router = Router();

// ==================== Public Routes ====================

// Get all blogs (published only)
router.get(
  "/",
  validateRequest(blogQueryZodSchema),
  BlogController.getAllBlogs,
);

// Get blog by slug
router.get("/:slug", BlogController.getBlogBySlug);

// Get related blogs
router.get("/:id/related", BlogController.getRelatedBlogs);

// Get comments for a blog
router.get("/:blogId/comments", BlogController.getComments);

// Get all categories
router.get("/categories/all", BlogController.getAllCategories);

// Get all tags
router.get("/tags/all", BlogController.getAllTags);

// ==================== Protected Routes (Auth Required) ====================

// Create blog
router.post(
  "/",
  writeRateLimiter,
  checkAuth(Role.MEMBER, Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(createBlogZodSchema),
  BlogController.createBlog,
);

// Update blog
router.patch(
  "/:id",
  checkAuth(Role.MEMBER, Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(updateBlogZodSchema),
  BlogController.updateBlog,
);

// Delete blog
router.delete(
  "/:id",
  checkAuth(Role.MEMBER, Role.ADMIN, Role.SUPER_ADMIN),
  BlogController.deleteBlog,
);

// Publish blog
router.patch(
  "/:id/publish",
  checkAuth(Role.MEMBER, Role.ADMIN, Role.SUPER_ADMIN),
  BlogController.publishBlog,
);

// Like/Unlike blog
router.post(
  "/:id/like",
  checkAuth(Role.MEMBER, Role.ADMIN, Role.SUPER_ADMIN),
  BlogController.toggleLike,
);

// Add comment
router.post(
  "/comments",
  writeRateLimiter,
  checkAuth(Role.MEMBER, Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(createCommentZodSchema),
  BlogController.createComment,
);

// Delete comment
router.delete(
  "/comments/:commentId",
  checkAuth(Role.MEMBER, Role.ADMIN, Role.SUPER_ADMIN),
  BlogController.deleteComment,
);

// ==================== Admin Only Routes ====================

// Categories management
router.post(
  "/categories",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(createCategoryZodSchema),
  BlogController.createCategory,
);

router.patch(
  "/categories/:id",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(createCategoryZodSchema.partial()),
  BlogController.updateCategory,
);

router.delete(
  "/categories/:id",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  BlogController.deleteCategory,
);

// Tags management
router.post(
  "/tags",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(createTagZodSchema),
  BlogController.createTag,
);

export const BlogRoutes: Router = router;
