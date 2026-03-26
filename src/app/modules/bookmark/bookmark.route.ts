import { Router } from "express";
import { BookmarkController } from "./bookmark.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";

const router = Router();

router.post(
  "/",
  checkAuth(Role.MEMBER, Role.ADMIN, Role.SUPER_ADMIN),
  BookmarkController.toggleBookmark,
);

router.get(
  "/me",
  checkAuth(Role.MEMBER, Role.ADMIN, Role.SUPER_ADMIN),
  BookmarkController.getMyBookmarks,
);

export const BookmarkRoutes: Router = router;
