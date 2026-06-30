// src/app/modules/admin/admin.controller.ts

import { Request, Response } from "express";
import status from "http-status";
import { Parser } from "json2csv";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { AdminService } from "./admin.service";
import AppError from "../../errorHelpers/AppError";

// ==================== User Management ====================

const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.getAllUsers(req.query);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "All users fetched successfully",
    data: result,
  });
});

const updateUserRole = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { role } = req.body;

  const result = await AdminService.updateUserRole(userId as string, role, {
    userId: req.user?.userId,
    ipAddress: req.ip, 
    userAgent: req.headers["user-agent"],
  });

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "User role updated successfully",
    data: result,
  });
});

// ==================== Admin Management ====================

const getAllAdmins = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.getAllAdmins(req.query);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Admins fetched successfully",
    data: result,
  });
});

const getAdminById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await AdminService.getAdminById(id as string);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Admin fetched successfully",
    data: result,
  });
});

const updateAdmin = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await AdminService.updateAdmin(id as string, req.body, {
    userId: req.user?.userId,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Admin updated successfully",
    data: result,
  });
});

const deleteAdmin = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await AdminService.deleteAdmin(id as string, req.user);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Admin deleted successfully",
    data: result,
  });
});

// ==================== Member Management ====================

const getAllMembers = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.getAllMembers(req.query);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Members fetched successfully",
    data: result,
  });
});

const getMemberById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await AdminService.getMemberById(id as string);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Member fetched successfully",
    data: result,
  });
});

const updateMember = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await AdminService.updateMember(id as string, req.body, {
    userId: req.user?.userId,
    ipAddress: req.ip, // ✅ ipAddress
    userAgent: req.headers["user-agent"],
  });

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Member updated successfully",
    data: result,
  });
});

const deleteMember = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await AdminService.deleteMember(id as string, {
    userId: req.user?.userId,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Member deleted successfully",
    data: result,
  });
});

const activateMember = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await AdminService.activateMember(id as string, {
    userId: req.user?.userId,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Member activated successfully",
    data: result,
  });
});

const deactivateMember = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;

  if (!reason || reason.trim().length === 0) {
    throw new AppError(
      status.BAD_REQUEST,
      "Reason is required for deactivation",
    );
  }

  const result = await AdminService.deactivateMember(id as string, reason, {
    userId: req.user?.userId,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Member deactivated successfully",
    data: result,
  });
});

// ==================== Bulk Operations ====================

const bulkApproveIdeas = catchAsync(async (req: Request, res: Response) => {
  const { ids } = req.body;
  const result = await AdminService.bulkApproveIdeas(req.user.userId, ids);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Ideas approved successfully",
    data: result,
  });
});

const bulkRejectIdeas = catchAsync(async (req: Request, res: Response) => {
  const { ids, feedback } = req.body;
  const result = await AdminService.bulkRejectIdeas(
    req.user.userId,
    ids,
    feedback,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Ideas rejected successfully",
    data: result,
  });
});

const bulkActivateMembers = catchAsync(async (req: Request, res: Response) => {
  const { ids } = req.body;
  const result = await AdminService.bulkActivateMembers(ids);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Members activated successfully",
    data: result,
  });
});

const bulkDeactivateMembers = catchAsync(
  async (req: Request, res: Response) => {
    const { ids } = req.body;
    const result = await AdminService.bulkDeactivateMembers(ids);

    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Members deactivated successfully",
      data: result,
    });
  },
);

// ==================== Dashboard ====================

const getDashboard = catchAsync(async (_req: Request, res: Response) => {
  const result = await AdminService.getFullDashboard();

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Dashboard fetched successfully",
    data: result,
  });
});

// ==================== Export ====================

const exportUsers = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.exportUsers({
    format: (req.query.format as "csv" | "json") || "csv",
    startDate: req.query.startDate as string,
    endDate: req.query.endDate as string,
  });

  if (req.query.format === "json") {
    return sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Users exported successfully",
      data: result,
    });
  }

  const parser = new Parser();
  const csv = parser.parse(result);

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=users.csv");

  res.status(status.OK).send(csv);
});

const exportIdeas = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.exportIdeas({
    format: (req.query.format as "csv" | "json") || "csv",
    startDate: req.query.startDate as string,
    endDate: req.query.endDate as string,
  });

  if (req.query.format === "json") {
    return sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Ideas exported successfully",
      data: result,
    });
  }

  const parser = new Parser();
  const csv = parser.parse(result);

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=ideas.csv");

  res.status(status.OK).send(csv);
});

// ==================== Exports ====================

export const AdminController = {
  // User Management
  getAllUsers,
  updateUserRole,

  // Admin Management
  getAllAdmins,
  getAdminById,
  updateAdmin,
  deleteAdmin,

  // Member Management
  getAllMembers,
  getMemberById,
  updateMember,
  deleteMember,
  activateMember,
  deactivateMember,

  // Bulk Operations
  bulkApproveIdeas,
  bulkRejectIdeas,
  bulkActivateMembers,
  bulkDeactivateMembers,

  // Dashboard
  getDashboard,

  // Export
  exportUsers,
  exportIdeas,
};
