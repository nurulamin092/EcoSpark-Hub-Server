import { Router } from "express";
import { AuditLogController } from "./auditLog.controller";
import { Role } from "../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";

const router = Router();

router.get(
  "/",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  AuditLogController.getLogs,
);

export const AuditLogRoutes: Router = router;
