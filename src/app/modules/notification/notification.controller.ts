import { Request, Response } from "express";
import { NotificationService } from "./notification.service";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import status from "http-status";

const getMyNotifications = catchAsync(async (req: Request, res: Response) => {
  const result = await NotificationService.getMyNotifications(req.user.userId);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Notifications fetched",
    data: result,
  });
});

const markAsRead = catchAsync(async (req: Request, res: Response) => {
  const result = await NotificationService.markAsRead(
    req.user.userId,
    req.params.id as string,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Notification marked as read",
    data: result,
  });
});

const markAllAsRead = catchAsync(async (req: Request, res: Response) => {
  const result = await NotificationService.markAllAsRead(req.user.userId);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "All notifications marked as read",
    data: result,
  });
});

export const NotificationController = {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
};
