/**
 * @file idea.route.ts
 * @description Route definitions for Idea module
 * @version 3.0.0
 */

import { Router } from "express";
import { IdeaController } from "./idea.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";
import { validateRequest } from "../../middleware/validateRequest";
import {
  createIdeaZodSchema,
  updateIdeaZodSchema,
  ideaQueryZodSchema,
  rejectIdeaSchema,
} from "./idea.validation";
import { checkPaymentAccess } from "../../middleware/checkPaymentAccess";
import { writeRateLimiter } from "../../middleware/rateLimiter";

const router = Router();

// ==================== Public Routes (No Authentication Required) ====================

/**
 * @route GET /api/v1/ideas
 * @description Get all approved ideas with filtering, sorting, and pagination
 * @access Public
 * @query {number} page - Page number (default: 1)
 * @query {number} limit - Items per page (default: 10, max: 50)
 * @query {string} search - Search term
 * @query {string} category - Category ID filter
 * @query {string} isPaid - Filter by paid status ('true' or 'false')
 * @query {string} sort - Sort method ('recent', 'top', 'commented', 'trending')
 */
router.get(
  "/",
  validateRequest(ideaQueryZodSchema),
  IdeaController.getAllIdeas,
);

/**
 * @route GET /api/v1/ideas/featured
 * @description Get featured ideas for homepage
 * @access Public
 * @query {number} limit - Number of ideas to fetch (default: 3)
 */
router.get("/featured", IdeaController.getFeaturedIdeas);

/**
 * @route GET /api/v1/ideas/top-voted
 * @description Get top voted ideas for testimonials section
 * @access Public
 * @query {number} limit - Number of ideas to fetch (default: 3)
 */
router.get("/top-voted", IdeaController.getTopVotedIdeas);

/**
 * @route GET /api/v1/ideas/category/:categoryId
 * @description Get ideas by category
 * @access Public
 * @param {string} categoryId - Category UUID
 * @query {number} page - Page number (default: 1)
 * @query {number} limit - Items per page (default: 10)
 */
router.get(
  "/category/:categoryId",
  validateRequest(ideaQueryZodSchema),
  IdeaController.getIdeasByCategory,
);

// ==================== Protected Routes (Authentication Required) ====================

/**
 * @route POST /api/v1/ideas
 * @description Create a new idea (draft)
 * @access Member, Admin, Super Admin
 * @body {ICreateIdeaPayload} - Idea creation payload
 */
router.post(
  "/",
  writeRateLimiter,
  checkAuth(Role.MEMBER, Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(createIdeaZodSchema),
  IdeaController.createIdea,
);

/**
 * @route GET /api/v1/ideas/my-ideas
 * @description Get current user's ideas
 * @access Member, Admin, Super Admin
 * @query {number} page - Page number (default: 1)
 * @query {number} limit - Items per page (default: 10)
 */
router.get(
  "/my-ideas",
  checkAuth(Role.MEMBER, Role.ADMIN, Role.SUPER_ADMIN),
  IdeaController.getMyIdeas,
);

/**
 * @route PATCH /api/v1/ideas/:id
 * @description Update a draft idea
 * @access Member (owner only)
 * @param {string} id - Idea UUID
 * @body {IUpdateIdeaPayload} - Update payload
 */
router.patch(
  "/:id",
  checkAuth(Role.MEMBER, Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(updateIdeaZodSchema),
  IdeaController.updateIdea,
);

/**
 * @route DELETE /api/v1/ideas/:id
 * @description Delete a draft idea (soft delete)
 * @access Member (owner only)
 * @param {string} id - Idea UUID
 */
router.delete(
  "/:id",
  checkAuth(Role.MEMBER, Role.ADMIN, Role.SUPER_ADMIN),
  IdeaController.deleteIdea,
);

/**
 * @route PATCH /api/v1/ideas/:id/submit
 * @description Submit draft idea for admin review
 * @access Member (owner only)
 * @param {string} id - Idea UUID
 */
router.patch(
  "/:id/submit",
  checkAuth(Role.MEMBER, Role.ADMIN, Role.SUPER_ADMIN),
  IdeaController.submitIdea,
);

/**
 * @route GET /api/v1/ideas/:id
 * @description Get single idea by ID (with payment access check)
 * @access Member, Admin, Super Admin
 * @param {string} id - Idea UUID
 */
router.get(
  "/:id",
  checkAuth(Role.MEMBER, Role.ADMIN, Role.SUPER_ADMIN),
  checkPaymentAccess,
  IdeaController.getSingleIdea,
);

// ==================== Admin Only Routes ====================

/**
 * @route PATCH /api/v1/ideas/:id/approve
 * @description Approve an idea (makes it public)
 * @access Admin, Super Admin
 * @param {string} id - Idea UUID
 */
router.patch(
  "/:id/approve",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  IdeaController.approveIdea,
);

/**
 * @route PATCH /api/v1/ideas/:id/reject
 * @description Reject an idea with feedback
 * @access Admin, Super Admin
 * @param {string} id - Idea UUID
 * @body {string} feedback - Rejection reason
 */
router.patch(
  "/:id/reject",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(rejectIdeaSchema),
  IdeaController.rejectIdea,
);
// ==================== Testimonials Routes ====================
// Public routes (no authentication required)

// Get testimonials for home page
router.get("/testimonials", IdeaController.getTestimonials);

// Get single testimonial by ID
router.get("/testimonials/:id", IdeaController.getTestimonialById);

// Get top voted ideas (alias for testimonials)
router.get("/top-voted", IdeaController.getTestimonials);

// ==================== Admin Testimonials Routes ====================
// Admin only routes

// Get testimonials statistics
router.get(
  "/admin/testimonials/stats",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  IdeaController.getTestimonialsStats,
);

// Refresh testimonials cache
router.post(
  "/admin/testimonials/refresh-cache",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  IdeaController.refreshTestimonialsCache,
);

export const IdeaRoutes: Router = router;
