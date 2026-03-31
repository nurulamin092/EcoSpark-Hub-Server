import { Request, Response } from "express";
import { AuditLogService } from "./auditLog.service";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import status from "http-status";

const getLogs = catchAsync(async (req: Request, res: Response) => {
  const result = await AuditLogService.getAuditLogs(req.query);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Audit logs fetched",
    data: result,
  });
});

export const AuditLogController = {
  getLogs,
};
