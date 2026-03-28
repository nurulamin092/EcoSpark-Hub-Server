import { Router } from "express";
import { ReportController } from "./report.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";
import { validateRequest } from "../../middleware/validateRequest";
import { createReportZodSchema } from "./report.validation";

const router = Router();

router.post(
  "/",
  checkAuth(Role.MEMBER),
  validateRequest(createReportZodSchema),
  ReportController.createReport,
);

router.get(
  "/",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  ReportController.getAllReports,
);

router.patch(
  "/:id",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  ReportController.updateReportStatus,
);

export const ReportRoutes: Router = router;
