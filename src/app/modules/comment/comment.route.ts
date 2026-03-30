import { Router } from "express";
import { CommentController } from "./comment.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";
import { writeRateLimiter } from "../../middleware/rateLimiter";

const router = Router();

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

export const CommentRoutes: Router = router;
