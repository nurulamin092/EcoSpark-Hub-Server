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
  meta?: { userId?: string; ip?: string; userAgent?: string },
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
    ipAddress: meta?.ip,
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
