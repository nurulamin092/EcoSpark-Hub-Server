import { Router } from "express";
import { CommentController } from "./comment.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";
import { writeRateLimiter } from "../../middleware/rateLimiter";
import { validateRequest } from "../../middleware/validateRequest";
import { z } from "zod";

const router = Router();

const hardDeleteSchema = z.object({
  reason: z.string().min(1, "Reason is required").max(500),
});

router.post(
  "/",
  writeRateLimiter,
  checkAuth(Role.MEMBER, Role.ADMIN, Role.SUPER_ADMIN),
  CommentController.createComment,
);

router.get("/", writeRateLimiter, CommentController.getComments);

router.patch(
  "/:id",
  writeRateLimiter,
  checkAuth(Role.MEMBER, Role.ADMIN, Role.SUPER_ADMIN),
  CommentController.updateComment,
);

router.delete(
  "/:id",
  writeRateLimiter,
  checkAuth(Role.MEMBER, Role.ADMIN, Role.SUPER_ADMIN),
  CommentController.deleteComment,
);

router.delete(
  "/:id/permanent",
  writeRateLimiter,
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(z.object({ body: hardDeleteSchema })),
  CommentController.hardDeleteComment,
);

export const CommentRoutes: Router = router;
