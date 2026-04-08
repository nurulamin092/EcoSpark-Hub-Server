/**
 * @file admin.service.ts
 * @description Main service entry point for Admin module
 * @version 2.0.0
 */

// Import all services
import {
  // Admin Management
  getAllAdmins as getAllAdminsService,
  getAdminById as getAdminByIdService,
  updateAdmin as updateAdminService,
  deleteAdmin as deleteAdminService,
  // Member Management
  getAllMembers as getAllMembersService,
  getMemberById as getMemberByIdService,
  updateMember as updateMemberService,
  deleteMember as deleteMemberService,
  activateMember as activateMemberService,
  deactivateMember as deactivateMemberService,
  // Bulk Operations
  bulkApproveIdeas as bulkApproveIdeasService,
  bulkRejectIdeas as bulkRejectIdeasService,
  bulkActivateMembers as bulkActivateMembersService,
  bulkDeactivateMembers as bulkDeactivateMembersService,
  // Dashboard
  getFullDashboard as getFullDashboardService,
  getAllIdeasForAdmin as getAllIdeasForAdminService,
  // Export
  exportUsers as exportUsersService,
  exportIdeas as exportIdeasService,
} from "./services";

// Create and export AdminService object
export const AdminService = {
  // Admin Management
  getAllAdmins: getAllAdminsService,
  getAdminById: getAdminByIdService,
  updateAdmin: updateAdminService,
  deleteAdmin: deleteAdminService,

  // Member Management
  getAllMembers: getAllMembersService,
  getMemberById: getMemberByIdService,
  updateMember: updateMemberService,
  deleteMember: deleteMemberService,
  activateMember: activateMemberService,
  deactivateMember: deactivateMemberService,

  // Bulk Operations
  bulkApproveIdeas: bulkApproveIdeasService,
  bulkRejectIdeas: bulkRejectIdeasService,
  bulkActivateMembers: bulkActivateMembersService,
  bulkDeactivateMembers: bulkDeactivateMembersService,

  // Dashboard
  getFullDashboard: getFullDashboardService,
  getAllIdeasForAdmin: getAllIdeasForAdminService,

  // Export
  exportUsers: exportUsersService,
  exportIdeas: exportIdeasService,
};

// Also export individually for flexibility
export {
  getAllAdminsService as getAllAdmins,
  getAdminByIdService as getAdminById,
  updateAdminService as updateAdmin,
  deleteAdminService as deleteAdmin,
  getAllMembersService as getAllMembers,
  getMemberByIdService as getMemberById,
  updateMemberService as updateMember,
  deleteMemberService as deleteMember,
  activateMemberService as activateMember,
  deactivateMemberService as deactivateMember,
  bulkApproveIdeasService as bulkApproveIdeas,
  bulkRejectIdeasService as bulkRejectIdeas,
  bulkActivateMembersService as bulkActivateMembers,
  bulkDeactivateMembersService as bulkDeactivateMembers,
  getFullDashboardService as getFullDashboard,
  getAllIdeasForAdminService as getAllIdeasForAdmin,
  exportUsersService as exportUsers,
  exportIdeasService as exportIdeas,
};
