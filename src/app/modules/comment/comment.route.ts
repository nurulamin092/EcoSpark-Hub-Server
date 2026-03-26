import { Router } from "express";
import { CommentController } from "./comment.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";

const router = Router();

router.post(
  "/",
  checkAuth(Role.MEMBER, Role.ADMIN, Role.SUPER_ADMIN),
  CommentController.createComment,
);

router.get("/", CommentController.getComments);

router.patch(
  "/:id",
  checkAuth(Role.MEMBER, Role.ADMIN, Role.SUPER_ADMIN),
  CommentController.updateComment,
);

router.delete(
  "/:id",
  checkAuth(Role.MEMBER, Role.ADMIN, Role.SUPER_ADMIN),
  CommentController.deleteComment,
);

export const CommentRoutes = router;
