/**
 * @file idea.route.ts
 * @description Route definitions for Idea module
 * @version 3.1.0 (Fixed duplicates + ordering issues)
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

// ✅ Keep ONLY one top-voted route
router.get("/top-voted", IdeaController.getTopVotedIdeas);

router.get(
  "/category/:categoryId",
  validateRequest(ideaQueryZodSchema),
  IdeaController.getIdeasByCategory,
);

// ==================== Testimonials Routes ====================

router.get("/testimonials", IdeaController.getTestimonials);
router.get("/testimonials/:id", IdeaController.getTestimonialById);

// ==================== Protected Routes ====================

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

// ⚠️ Keep dynamic route AFTER specific ones
router.get(
  "/:id",
  checkAuth(Role.MEMBER, Role.ADMIN, Role.SUPER_ADMIN),
  checkPaymentAccess,
  IdeaController.getSingleIdea,
);

// ==================== Admin Routes ====================

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
