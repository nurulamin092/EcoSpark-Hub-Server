/* eslint-disable @typescript-eslint/no-explicit-any */

import { Request, Response, NextFunction } from "express";
import { AuditLogService } from "../modules/auditLog/auditLog.service";

export const auditMiddleware = (action: string, entity: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json;

    res.json = function (body: any) {
      try {
        if (body?.success) {
          AuditLogService.createAuditLog({
            userId: req.user?.userId,
            userEmail: req.user?.email,
            action,
            entity,
            entityId: body?.data?.id || req.params?.id,
            newValue: body?.data,
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"],
          }).catch(() => {});
        }
      } catch {
        // silent fail
      }

      return originalJson.call(this, body);
    };

    next();
  };
};
