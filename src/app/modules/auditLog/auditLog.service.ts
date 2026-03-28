/* eslint-disable @typescript-eslint/no-explicit-any */

import { prisma } from "../../lib/prisma";
import { ICreateAuditLogPayload } from "./auditLog.interface";

const createAuditLog = async (payload: ICreateAuditLogPayload) => {
  return prisma.auditLog.create({
    data: {
      userId: payload.userId,
      userEmail: payload.userEmail,
      action: payload.action,
      entity: payload.entity,
      entityId: payload.entityId,
      oldValue: payload.oldValue,
      newValue: payload.newValue,
      ipAddress: payload.ipAddress,
      userAgent: payload.userAgent,
    },
  });
};

const getAuditLogs = async (query: any) => {
  const { page = 1, limit = 10, userId, entity, action } = query;

  const skip = (Number(page) - 1) * Number(limit);

  const where: any = {};

  if (userId) where.userId = userId;
  if (entity) where.entity = entity;
  if (action) where.action = action;

  const logs = await prisma.auditLog.findMany({
    where,
    skip,
    take: Number(limit),
    orderBy: { createdAt: "desc" },
  });

  const total = await prisma.auditLog.count({ where });

  return {
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
    },
    data: logs,
  };
};

export const AuditLogService = {
  createAuditLog,
  getAuditLogs,
};
