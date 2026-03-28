import { Router } from "express";
import { AuditLogController } from "./auditLog.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";

const router = Router();

router.get(
  "/",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  AuditLogController.getLogs,
);

export const AuditLogRoutes = router;
