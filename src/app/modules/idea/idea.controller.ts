import { Request, Response } from "express";
import { IdeaService } from "./idea.service";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import status from "http-status";

const createIdea = catchAsync(async (req: Request, res: Response) => {
  const result = await IdeaService.createIdea(req.user.userId, req.body);

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Idea created",
    data: result,
  });
});

const updateIdea = catchAsync(async (req: Request, res: Response) => {
  const result = await IdeaService.updateIdea(
    req.user.userId,
    req.params.id as string,
    req.body,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Idea updated",
    data: result,
  });
});

const deleteIdea = catchAsync(async (req: Request, res: Response) => {
  await IdeaService.deleteIdea(req.user.userId, req.params.id as string);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Idea deleted",
  });
});

const submitIdea = catchAsync(async (req: Request, res: Response) => {
  const result = await IdeaService.submitIdea(
    req.user.userId,
    req.params.id as string,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Idea submitted for review",
    data: result,
  });
});

const getAllIdeas = catchAsync(async (req: Request, res: Response) => {
  const result = await IdeaService.getAllIdeas(req.query);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Ideas fetched",
    data: result,
  });
});

const getSingleIdea = catchAsync(async (req: Request, res: Response) => {
  const result = await IdeaService.getSingleIdea(req.params.id as string);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Idea fetched",
    data: result,
  });
});

const approveIdea = catchAsync(async (req: Request, res: Response) => {
  const result = await IdeaService.approveIdea(
    req.user.userId,
    req.params.id as string,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Idea approved",
    data: result,
  });
});

const rejectIdea = catchAsync(async (req: Request, res: Response) => {
  const result = await IdeaService.rejectIdea(
    req.user.userId,
    req.params.id as string,
    req.body.feedback,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Idea rejected",
    data: result,
  });
});

export const IdeaController = {
  createIdea,
  updateIdea,
  deleteIdea,
  submitIdea,
  getAllIdeas,
  getSingleIdea,
  approveIdea,
  rejectIdea,
};
