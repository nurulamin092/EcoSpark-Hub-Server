/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { prisma } from "../../lib/prisma";
import { Prisma } from "../../../generated/prisma/client";
import { ICreateAuditLogPayload } from "./auditLog.interface";

const toJson = (
  value: any,
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput => {
  if (value === undefined || value === null) return Prisma.JsonNull;

  try {
    return value as Prisma.InputJsonValue;
  } catch {
    return Prisma.JsonNull;
  }
};

const createAuditLog = async (
  payload: ICreateAuditLogPayload,
  tx?: Prisma.TransactionClient,
) => {
  const client = tx || prisma;
  return client.auditLog.create({
    data: {
      userId: payload.userId,
      userEmail: payload.userEmail,
      action: payload.action,
      entity: payload.entity,
      entityId: payload.entityId,
      oldValue: toJson(payload.oldValue),
      newValue: toJson(payload.newValue),
      ipAddress: payload.ipAddress,
      userAgent: payload.userAgent,
    },
  });
};

const getAuditLogs = async (query: any) => {
  let { page = 1, limit = 10, userId, entity, action } = query;

  page = Number(page) || 1;
  limit = Math.min(Number(limit) || 10, 100);

  const skip = (page - 1) * limit;

  const where: any = {};

  if (userId) where.userId = String(userId);
  if (entity) where.entity = String(entity);
  if (action) where.action = String(action);

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    data: logs,
  };
};

export const AuditLogService = {
  createAuditLog,
  getAuditLogs,
};
