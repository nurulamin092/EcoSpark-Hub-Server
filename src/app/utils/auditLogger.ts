/* eslint-disable @typescript-eslint/no-explicit-any */

import { Request } from "express";
import { AuditLogService } from "../modules/auditLog/auditLog.service";

interface LogParams {
  req?: Request;
  userId?: string;
  userEmail?: string;
  action: string;
  entity: string;
  entityId?: string;
  oldValue?: any;
  newValue?: any;
}

export const logAudit = async (params: LogParams) => {
  try {
    const ip =
      (params.req?.headers["x-forwarded-for"] as string) ||
      params.req?.socket?.remoteAddress ||
      "";

    const userAgent = params.req?.headers["user-agent"] || "";

    await AuditLogService.createAuditLog({
      userId: params.userId,
      userEmail: params.userEmail,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      oldValue: params.oldValue,
      newValue: params.newValue,
      ipAddress: ip,
      userAgent,
    });
  } catch (error) {
    console.error("AuditLog Error:", error);
  }
};
