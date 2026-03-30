import { Router } from "express";
import { IdeaController } from "./idea.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";
import { validateRequest } from "../../middleware/validateRequest";
import { createIdeaZodSchema, updateIdeaZodSchema } from "./idea.validation";
import { checkPaymentAccess } from "../../middleware/checkPaymentAccess";
import { writeRateLimiter } from "../../middleware/rateLimiter";

const router = Router();

router.post(
  "/",
  writeRateLimiter,
  checkAuth(Role.MEMBER, Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(createIdeaZodSchema),
  IdeaController.createIdea,
);

router.patch(
  "/:id",
  checkAuth(Role.MEMBER),
  validateRequest(updateIdeaZodSchema),
  IdeaController.updateIdea,
);

router.delete("/:id", checkAuth(Role.MEMBER), IdeaController.deleteIdea);

router.patch("/:id/submit", checkAuth(Role.MEMBER), IdeaController.submitIdea);

router.get("/", IdeaController.getAllIdeas);
router.get(
  "/:id",
  checkAuth(Role.MEMBER, Role.ADMIN, Role.SUPER_ADMIN),
  checkPaymentAccess,
  IdeaController.getSingleIdea,
);

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

export const IdeaRoutes: Router = router;
