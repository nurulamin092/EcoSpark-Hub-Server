/**
 * @file index.ts
 * @description Service exports for Admin module
 * @version 1.0.0
 */

// Admin Management
export {
  getAllUsers,
  updateUserRole,
  getAllAdmins,
  getAdminById,
  updateAdmin,
  deleteAdmin,
} from "./admin.management.service";

// Member Management
export {
  getAllMembers,
  getMemberById,
  updateMember,
  deleteMember,
  activateMember,
  deactivateMember,
} from "./member.management.service";

// Bulk Operations
export {
  bulkApproveIdeas,
  bulkRejectIdeas,
  bulkActivateMembers,
  bulkDeactivateMembers,
} from "./bulk.operations.service";

// Dashboard
export { getFullDashboard } from "./dashboard.service";

// Idea Moderation Services

// Export
export { exportUsers, exportIdeas } from "./export.service";
