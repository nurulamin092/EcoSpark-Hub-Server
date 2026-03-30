import { Request, Response } from "express";

import { SettingService } from "./setting.service";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import status from "http-status";

const createSetting = catchAsync(async (req: Request, res: Response) => {
  const result = await SettingService.createSetting(req.body);

  sendResponse(res, {
    success: true,
    httpStatusCode: status.OK,
    message: "Setting created successfully",
    data: result,
  });
});

const getPublicSettings = catchAsync(async (_req, res) => {
  const result = await SettingService.getPublicSettings();

  sendResponse(res, {
    success: true,
    httpStatusCode: status.OK,
    message: "Public settings retrieved successfully",
    data: result,
  });
});

export const SettingController = {
  createSetting,
  getPublicSettings,
};
