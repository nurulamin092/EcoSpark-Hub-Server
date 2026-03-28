import { Router } from "express";
import { ActivityController } from "./activity.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";

const router = Router();

router.get(
  "/me",
  checkAuth(Role.MEMBER, Role.ADMIN, Role.SUPER_ADMIN),
  ActivityController.getMyActivities,
);

export const ActivityRoutes: Router = router;
