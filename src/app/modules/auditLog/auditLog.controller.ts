import { Request, Response } from "express";
import { AuditLogService } from "./auditLog.service";

const getLogs = async (req: Request, res: Response) => {
  const result = await AuditLogService.getAuditLogs(req.query);

  res.json({
    success: true,
    message: "Audit logs fetched",
    data: result,
  });
};

export const AuditLogController = {
  getLogs,
};
