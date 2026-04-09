/**
 * @file experience.route.ts
 * @description Route definitions for Experience module
 * @version 1.0.0
 */

import { Router } from "express";
import * as ExperienceController from "./experience.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";
import { validateRequest } from "../../middleware/validateRequest";
import {
  createExperienceZodSchema,
  updateExperienceZodSchema,
  experienceQueryZodSchema,
  moderateExperienceZodSchema,
} from "./experience.validation";
import { writeRateLimiter } from "../../middleware/rateLimiter";

const router = Router();

// ==================== Public Routes (Read-only) ====================

// Get all experiences (approved only)
router.get(
  "/",
  validateRequest(experienceQueryZodSchema),
  ExperienceController.getExperiences,
);

// Get experience by ID
router.get("/:id", ExperienceController.getExperienceById);

// Get experience statistics for an idea
router.get("/stats/idea/:ideaId", ExperienceController.getIdeaExperienceStats);

// ==================== Protected Routes (Auth Required) ====================

// Create experience
router.post(
  "/",
  writeRateLimiter,
  checkAuth(Role.MEMBER, Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(createExperienceZodSchema),
  ExperienceController.createExperience,
);

// Update experience
router.patch(
  "/:id",
  checkAuth(Role.MEMBER, Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(updateExperienceZodSchema),
  ExperienceController.updateExperience,
);

// Delete experience
router.delete(
  "/:id",
  checkAuth(Role.MEMBER, Role.ADMIN, Role.SUPER_ADMIN),
  ExperienceController.deleteExperience,
);

// Get user's experience for a specific idea
router.get(
  "/user/idea/:ideaId",
  checkAuth(Role.MEMBER, Role.ADMIN, Role.SUPER_ADMIN),
  ExperienceController.getUserExperienceForIdea,
);

// Mark experience as helpful
router.post(
  "/:id/helpful",
  checkAuth(Role.MEMBER, Role.ADMIN, Role.SUPER_ADMIN),
  ExperienceController.toggleHelpful,
);

// Like experience
router.post(
  "/:id/like",
  checkAuth(Role.MEMBER, Role.ADMIN, Role.SUPER_ADMIN),
  ExperienceController.toggleLike,
);

// ==================== Admin Routes ====================

// Get all experiences (including pending)
router.get(
  "/admin/all",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(experienceQueryZodSchema),
  ExperienceController.getAllExperiencesForAdmin,
);

// Moderate experience (approve/reject/feature)
router.patch(
  "/admin/:id/moderate",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(moderateExperienceZodSchema),
  ExperienceController.moderateExperience,
);

export const ExperienceRoutes: Router = router;
