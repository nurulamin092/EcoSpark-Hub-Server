/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file admin.management.service.ts
 * @description Admin CRUD operations
 * @version 1.0.0
 */

import status from "http-status";
import AppError from "../../../errorHelpers/AppError";
import { prisma } from "../../../lib/prisma";
import { IRequestUser } from "../../../interface/requestUser.interface";
import { IUpdateAdminPayload } from "../admin.interface";
import { AuditLogService } from "../../auditLog/auditLog.service";

import { buildAdminWhereClause } from "../utils/admin.helpers";
import { paginationHelper } from "../../../utils/paginationHelper";

/**
 * Get all users with pagination
 */
export const getAllUsers = async (query: any) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;
  const search = query.search || "";
  const role = query.role;
  const status = query.status;

  const where: any = { isDeleted: false };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  if (role && role !== "ALL") {
    where.role = role;
  }

  if (status && status !== "ALL") {
    where.status = status;
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        member: true,
        admin: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    data: users,
  };
};

/**
 * Update user role with audit logging
 */
export const updateUserRole = async (
  userId: string,
  newRole: "SUPER_ADMIN" | "ADMIN" | "MEMBER",
  meta?: { userId?: string; ipAddress?: string; userAgent?: string },
) => {
  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: userId, isDeleted: false },
    include: { member: true, admin: true },
  });

  if (!user) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  if (meta?.userId && meta.userId === userId) {
    const currentUser = await prisma.user.findUnique({
      where: { id: meta.userId },
    });
    if (currentUser?.role === "SUPER_ADMIN") {
      throw new AppError(status.FORBIDDEN, "You cannot change your own role");
    }
  }

  // Update user role
  const updatedUser = await prisma.$transaction(async (tx) => {
    // Update user role
    const updated = await tx.user.update({
      where: { id: userId },
      data: { role: newRole },
    });

    // Handle member/admin records based on new role
    if (newRole === "MEMBER") {
      if (user.admin) {
        await tx.admin.update({
          where: { userId },
          data: { isDeleted: true, deletedAt: new Date() },
        });
      }
      const existingMember = await tx.member.findUnique({
        where: { userId },
      });
      if (!existingMember) {
        await tx.member.create({
          data: {
            userId,
            name: user.name,
            email: user.email,
          },
        });
      }
    } else {
      const existingAdmin = await tx.admin.findUnique({
        where: { userId },
      });
      if (!existingAdmin) {
        await tx.admin.create({
          data: {
            userId,
            name: user.name,
            email: user.email,
          },
        });
      } else if (existingAdmin.isDeleted) {
        await tx.admin.update({
          where: { userId },
          data: { isDeleted: false, deletedAt: null },
        });
      }
    }

    return updated;
  });

  await AuditLogService.createAuditLog({
    userId: meta?.userId,
    userEmail: user.email,
    action: "UPDATE_ROLE",
    entity: "USER",
    entityId: userId,
    oldValue: { role: user.role },
    newValue: { role: newRole },
    ipAddress: meta?.ipAddress,
    userAgent: meta?.userAgent,
  });

  return updatedUser;
};
/**
 * Get all admins with pagination
 */
export const getAllAdmins = async (query: any) => {
  const { page, limit, skip } = paginationHelper(query.page, query.limit); // Changed this line
  const where = buildAdminWhereClause(query);

  const [data, total] = await Promise.all([
    prisma.admin.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { user: true },
    }),
    prisma.admin.count({ where }),
  ]);

  return {
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    data,
  };
};
/**
 * Get single admin by ID
 */
export const getAdminById = async (id: string) => {
  const admin = await prisma.admin.findFirst({
    where: { id, isDeleted: false },
    include: { user: true },
  });

  if (!admin) {
    throw new AppError(status.NOT_FOUND, "Admin not found");
  }

  return admin;
};

/**
 * Update admin information
 */
export const updateAdmin = async (
  id: string,
  payload: IUpdateAdminPayload,
  meta?: { userId?: string; ipAddress?: string; userAgent?: string },
) => {
  const adminExist = await prisma.admin.findUnique({ where: { id } });

  if (!adminExist || adminExist.isDeleted) {
    throw new AppError(status.NOT_FOUND, "Admin not found");
  }

  const updatedAdmin = await prisma.admin.update({
    where: { id },
    data: { ...(payload?.admin ?? {}) },
  });

  await AuditLogService.createAuditLog({
    userId: meta?.userId,
    action: "UPDATE",
    entity: "ADMIN",
    entityId: id,
    oldValue: adminExist,
    newValue: updatedAdmin,
    ipAddress: meta?.ipAddress,
    userAgent: meta?.userAgent,
  });

  return updatedAdmin;
};

/**
 * Delete admin (soft delete)
 */
export const deleteAdmin = async (id: string, user: IRequestUser) => {
  const admin = await prisma.admin.findUnique({ where: { id } });

  if (!admin || admin.isDeleted) {
    throw new AppError(status.NOT_FOUND, "Admin not found");
  }

  if (admin.userId === user.userId) {
    throw new AppError(status.BAD_REQUEST, "You cannot delete yourself");
  }

  return prisma.$transaction(async (tx) => {
    const deletedAdmin = await tx.admin.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    await tx.user.update({
      where: { id: admin.userId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        status: "DELETED",
      },
    });

    await tx.session.deleteMany({ where: { userId: admin.userId } });
    await tx.account.deleteMany({ where: { userId: admin.userId } });

    await AuditLogService.createAuditLog(
      {
        userId: user.userId,
        action: "DELETE",
        entity: "ADMIN",
        entityId: id,
        oldValue: admin,
        newValue: deletedAdmin,
      },
      tx,
    );

    return deletedAdmin;
  });
};
