import { Router } from "express";
import { IdeaController } from "./idea.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";
import { validateRequest } from "../../middleware/validateRequest";
import {
  createIdeaZodSchema,
  updateIdeaZodSchema,
  ideaQueryZodSchema,
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

// ==================== Protected Routes (Member+) ====================
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

router.get(
  "/:id",
  checkAuth(Role.MEMBER, Role.ADMIN, Role.SUPER_ADMIN),
  checkPaymentAccess,
  IdeaController.getSingleIdea,
);

// ==================== Admin Only Routes ====================
router.patch(
  "/:id/approve",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  IdeaController.approveIdea,
);

router.patch(
  "/:id/reject",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  IdeaController.rejectIdea,
);

router.get(
  "/category/:categoryId",
  validateRequest(ideaQueryZodSchema),
  IdeaController.getIdeasByCategory,
);

export const IdeaRoutes: Router = router;
