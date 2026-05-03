/**
 * @file idea.route.ts
 * @description Route definitions for Idea module
 * @version 4.0.0 (Production Grade - Fixed ordering)
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

// ==================== Public Routes ====================
router.get(
  "/",
  validateRequest(ideaQueryZodSchema),
  IdeaController.getAllIdeas,
);
router.get("/featured", IdeaController.getFeaturedIdeas);
router.get("/top-voted", IdeaController.getTopVotedIdeas);
router.get(
  "/category/:categoryId",
  validateRequest(ideaQueryZodSchema),
  IdeaController.getIdeasByCategory,
);

// ==================== Testimonials Routes ====================
router.get("/testimonials", IdeaController.getTestimonials);
router.get("/testimonials/:id", IdeaController.getTestimonialById);

// ==================== Admin Routes (MUST BE BEFORE dynamic :id) ====================
//  CRITICAL: These specific routes must come BEFORE the dynamic /:id route

// Get pending ideas (admin only)
router.get(
  "/pending",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  IdeaController.getPendingIdeas,
);

// Get all ideas with filters (admin only)
router.get(
  "/all",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  IdeaController.getAllIdeasForAdmin,
);

// ==================== Protected Routes (User) ====================
router.post(
  "/",
  writeRateLimiter,
  checkAuth(Role.MEMBER, Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(createIdeaZodSchema),
  IdeaController.createIdea,
);

router.get(
  "/my-ideas",
  checkAuth(Role.MEMBER, Role.ADMIN, Role.SUPER_ADMIN),
  IdeaController.getMyIdeas,
);

// ==================== Update/Delete Routes (with :id) ====================
// These come BEFORE the final dynamic route

router.patch(
  "/:id",
  checkAuth(Role.MEMBER, Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(updateIdeaZodSchema),
  IdeaController.updateIdea,
);

router.delete(
  "/:id",
  checkAuth(Role.MEMBER, Role.ADMIN, Role.SUPER_ADMIN),
  IdeaController.deleteIdea,
);

router.patch(
  "/:id/submit",
  checkAuth(Role.MEMBER, Role.ADMIN, Role.SUPER_ADMIN),
  IdeaController.submitIdea,
);

//  Approve route - specific pattern (admin only)
router.patch(
  "/:id/approve",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  IdeaController.approveIdea,
);

//  Reject route - specific pattern (admin only)
router.patch(
  "/:id/reject",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(rejectIdeaSchema),
  IdeaController.rejectIdea,
);

// ==================== Dynamic Route (ALWAYS LAST) ====================
//  This must be the LAST route - it matches any :id
router.get(
  "/:id",
  checkAuth(Role.MEMBER, Role.ADMIN, Role.SUPER_ADMIN),
  checkPaymentAccess,
  IdeaController.getSingleIdea,
);

// ==================== Admin Testimonials ====================
router.get(
  "/admin/testimonials/stats",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  IdeaController.getTestimonialsStats,
);

router.post(
  "/admin/testimonials/refresh-cache",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  IdeaController.refreshTestimonialsCache,
);

export const IdeaRoutes: Router = router;
