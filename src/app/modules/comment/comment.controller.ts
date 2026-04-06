import { Request, Response } from "express";
import { CommentService } from "./comment.service";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import status from "http-status";

const createComment = catchAsync(async (req: Request, res: Response) => {
  const { content, ideaId, parentId } = req.body;

  const result = await CommentService.createComment(
    req.user.userId,
    ideaId,
    content,
    parentId,
    { ip: req.ip, userAgent: req.headers["user-agent"] },
  );

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Comment created",
    data: result,
  });
});

const getComments = catchAsync(async (req: Request, res: Response) => {
  const { ideaId } = req.query;

  if (!ideaId) {
    return sendResponse(res, {
      httpStatusCode: status.BAD_REQUEST,
      success: false,
      message: "ideaId is required",
    });
  }

  const result = await CommentService.getCommentsByIdea(ideaId as string);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Comments fetched",
    data: result,
  });
});

const updateComment = catchAsync(async (req: Request, res: Response) => {
  const { content } = req.body;

  if (!content) {
    return sendResponse(res, {
      httpStatusCode: status.BAD_REQUEST,
      success: false,
      message: "Content is required",
    });
  }

  const result = await CommentService.updateComment(
    req.user.userId,
    req.params.id as string,
    content,
    { ip: req.ip, userAgent: req.headers["user-agent"] },
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Comment updated",
    data: result,
  });
});

const deleteComment = catchAsync(async (req: Request, res: Response) => {
  await CommentService.deleteComment(
    req.user.userId,
    req.params.id as string,
    req.user.role,
    { ip: req.ip, userAgent: req.headers["user-agent"] },
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Comment deleted",
  });
});

// New: Hard delete for admins
const hardDeleteComment = catchAsync(async (req: Request, res: Response) => {
  const { reason } = req.body;

  const result = await CommentService.hardDeleteComment(
    req.user.userId,
    req.params.id as string,
    req.user.role,
    reason,
    { ip: req.ip, userAgent: req.headers["user-agent"] },
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Comment permanently deleted",
    data: result,
  });
});

export const CommentController = {
  createComment,
  getComments,
  updateComment,
  deleteComment,
  hardDeleteComment,
};
