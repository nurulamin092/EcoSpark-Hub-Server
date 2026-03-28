import { Router } from "express";
import { checkAuth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";
import { NotificationController } from "./notification.controller";

const router = Router();

router.get(
  "/me",
  checkAuth(Role.MEMBER, Role.ADMIN, Role.SUPER_ADMIN),
  NotificationController.getMyNotifications,
);

router.patch(
  "/:id/read",
  checkAuth(Role.MEMBER, Role.ADMIN, Role.SUPER_ADMIN),
  NotificationController.markAsRead,
);

router.patch(
  "/read-all",
  checkAuth(Role.MEMBER, Role.ADMIN, Role.SUPER_ADMIN),
  NotificationController.markAllAsRead,
);

export const NotificationRoutes = router;
