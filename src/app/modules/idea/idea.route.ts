/**
 * @file idea.route.ts
 * @description Route definitions for Idea module
 * @version 5.0.0 (Production - Public single idea route)
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
import { writeRateLimiter } from "../../middleware/rateLimiter";
import { optionalAuth } from "../../middleware/optionalAuth";

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
router.get(
  "/pending",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  IdeaController.getPendingIdeas,
);
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
router.patch(
  "/:id/approve",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  IdeaController.approveIdea,
);
router.patch(
  "/:id/reject",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(rejectIdeaSchema),
  IdeaController.rejectIdea,
);

//https://www.facebook.com/reel/2454958974928955

// ==================== Dynamic Route (ALWAYS LAST) ====================
//  PUBLIC: No authentication required. Paid idea locking handled by service.
router.get("/:id", optionalAuth, IdeaController.getSingleIdea);

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
