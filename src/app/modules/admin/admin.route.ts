// src/app/modules/admin/admin.route.ts

import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { AdminController } from "./admin.controller";
import {
  updateAdminZodSchema,
  updateMemberZodSchema,
  bulkActionZodSchema,
  exportOptionsZodSchema,
} from "./admin.validation";

const router = Router();

// ==================== Dashboard Routes ====================

router.get(
  "/dashboard",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  AdminController.getDashboard,
);

// ==================== user Management Routes ==========

router.get(
  "/users",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  AdminController.getAllUsers,
);
router.patch(
  "/users/:userId/role",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  AdminController.updateUserRole,
);

// ==================== Admin Management Routes ====================

router.get(
  "/",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  AdminController.getAllAdmins,
);

// ==================== Member Management Routes ====================

router.get(
  "/members",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  AdminController.getAllMembers,
);

router.get(
  "/members/:id",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  AdminController.getMemberById,
);

router.patch(
  "/members/:id",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(updateMemberZodSchema),
  AdminController.updateMember,
);

router.delete(
  "/members/:id",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  AdminController.deleteMember,
);

router.patch(
  "/members/:id/activate",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  AdminController.activateMember,
);

router.patch(
  "/members/:id/deactivate",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  AdminController.deactivateMember,
);

// ==================== Bulk Operations Routes ====================

router.post(
  "/ideas/bulk/approve",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(bulkActionZodSchema),
  AdminController.bulkApproveIdeas,
);

router.post(
  "/ideas/bulk/reject",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(bulkActionZodSchema),
  AdminController.bulkRejectIdeas,
);

router.post(
  "/members/bulk/activate",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(bulkActionZodSchema),
  AdminController.bulkActivateMembers,
);

router.post(
  "/members/bulk/deactivate",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(bulkActionZodSchema),
  AdminController.bulkDeactivateMembers,
);

// ==================== Export Routes ====================
router.get(
  "/export/users",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(exportOptionsZodSchema),
  AdminController.exportUsers,
);

router.get(
  "/export/ideas",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(exportOptionsZodSchema),
  AdminController.exportIdeas,
);
// ==================== Admin Dynamic Routes (ALWAYS LAST) ====================

router.get(
  "/:id",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  AdminController.getAdminById,
);

router.patch(
  "/:id",
  checkAuth(Role.SUPER_ADMIN),
  validateRequest(updateAdminZodSchema),
  AdminController.updateAdmin,
);

router.delete("/:id", checkAuth(Role.SUPER_ADMIN), AdminController.deleteAdmin);

export const AdminRoutes: Router = router;
