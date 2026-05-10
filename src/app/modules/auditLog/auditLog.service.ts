// src/app/modules/auditLog/auditLog.service.ts

/* eslint-disable @typescript-eslint/no-explicit-any */

import { prisma } from "../../lib/prisma";
import { Prisma } from "../../../generated/prisma/client";
import { ICreateAuditLogPayload } from "./auditLog.interface";

const toJson = (
  value: any,
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput => {
  if (value === undefined || value === null) return Prisma.JsonNull;

  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return Prisma.JsonNull;
  }
};

const createAuditLog = async (
  payload: ICreateAuditLogPayload,
  tx?: Prisma.TransactionClient,
) => {
  try {
    const client = tx ?? prisma;

    // Merge metadata into the data field or store separately
    const auditData: any = {
      userId: payload.userId ?? null,
      userEmail: payload.userEmail ?? null,
      action: payload.action,
      entity: payload.entity,
      entityId: payload.entityId,
      oldValue: toJson(payload.oldValue),
      newValue: toJson(payload.newValue),
      ipAddress: payload.ipAddress ?? null,
      userAgent: payload.userAgent ?? null,
    };

    // If metadata exists, add it to the data field
    if (payload.metadata) {
      auditData.data = toJson(payload.metadata);
    }

    return await client.auditLog.create({
      data: auditData,
    });
  } catch (error) {
    console.error("AuditLog Error:", error);
    // NEVER break main flow
    return null;
  }
};

const getAuditLogs = async (query: any) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 100);

  const skip = (page - 1) * limit;

  const where: Prisma.AuditLogWhereInput = {};

  if (query.userId) where.userId = String(query.userId);
  if (query.entity) where.entity = String(query.entity);
  if (query.action) where.action = String(query.action);

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
