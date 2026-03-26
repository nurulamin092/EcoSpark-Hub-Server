import { Request, Response } from "express";
import { BookmarkService } from "./bookmark.service";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import status from "http-status";

const toggleBookmark = catchAsync(async (req: Request, res: Response) => {
  const result = await BookmarkService.toggleBookmark(
    req.user.userId,
    req.body.ideaId,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: result.message,
  });
});

const getMyBookmarks = catchAsync(async (req: Request, res: Response) => {
  const result = await BookmarkService.getMyBookmarks(
    req.user.userId,
    req.query,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Bookmarks fetched",
    data: result,
  });
});

export const BookmarkController = {
  toggleBookmark,
  getMyBookmarks,
};
