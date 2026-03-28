import { Request, Response } from "express";
import { ReportService } from "./report.service";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import status from "http-status";

const createReport = catchAsync(async (req: Request, res: Response) => {
  const result = await ReportService.createReport(req.user.userId, req.body);

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Report submitted",
    data: result,
  });
});

const getAllReports = catchAsync(async (req: Request, res: Response) => {
  const result = await ReportService.getAllReports();

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Reports fetched",
    data: result,
  });
});

const updateReportStatus = catchAsync(async (req: Request, res: Response) => {
  const result = await ReportService.updateReportStatus(
    req.user.userId,
    req.params.id as string,
    req.body.status,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Report updated",
    data: result,
  });
});

export const ReportController = {
  createReport,
  getAllReports,
  updateReportStatus,
};
