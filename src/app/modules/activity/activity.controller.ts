import { Request, Response } from "express";
import { ActivityService } from "./activity.service";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import status from "http-status";

const getMyActivities = catchAsync(async (req: Request, res: Response) => {
  const result = await ActivityService.getUserActivities(req.user.userId);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Activities fetched",
    data: result,
  });
});

export const ActivityController = {
  getMyActivities,
};
