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
    message: "Idea created successfully",
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
    message: "Idea updated successfully",
    data: result,
  });
});

const deleteIdea = catchAsync(async (req: Request, res: Response) => {
  await IdeaService.deleteIdea(req.user.userId, req.params.id as string);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Idea deleted successfully",
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
    message: "Idea submitted for review successfully",
    data: result,
  });
});

const getAllIdeas = catchAsync(async (req: Request, res: Response) => {
  const result = await IdeaService.getAllIdeas(req.query);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Ideas fetched successfully",
    data: result,
  });
});

const getSingleIdea = catchAsync(async (req: Request, res: Response) => {
  const result = await IdeaService.getSingleIdea(
    req.params.id as string as string,
    req.user?.userId,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Idea fetched successfully",
    data: result,
  });
});

const approveIdea = catchAsync(async (req: Request, res: Response) => {
  const result = await IdeaService.approveIdea(
    req.user.userId,
    req.params.id as string as string,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Idea approved successfully",
    data: result,
  });
});

const rejectIdea = catchAsync(async (req: Request, res: Response) => {
  const { feedback } = req.body;

  if (!feedback) {
    return sendResponse(res, {
      httpStatusCode: status.BAD_REQUEST,
      success: false,
      message: "Feedback is required for rejection",
    });
  }

  const result = await IdeaService.rejectIdea(
    req.user.userId,
    req.params.id as string,
    feedback,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Idea rejected successfully",
    data: result,
  });
});

const getMyIdeas = catchAsync(async (req: Request, res: Response) => {
  const result = await IdeaService.getUserIdeas(req.user.userId, req.query);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "My ideas fetched successfully",
    data: result,
  });
});

const getFeaturedIdeas = catchAsync(async (req: Request, res: Response) => {
  const limit = req.query.limit ? Number(req.query.limit) : 3;
  const result = await IdeaService.getFeaturedIdeas(limit);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Featured ideas fetched successfully",
    data: result,
  });
});

const getTopVotedIdeas = catchAsync(async (req: Request, res: Response) => {
  const limit = req.query.limit ? Number(req.query.limit) : 3;
  const result = await IdeaService.getTopVotedIdeas(limit);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Top voted ideas fetched successfully",
    data: result,
  });
});

const getIdeasByCategory = catchAsync(async (req: Request, res: Response) => {
  const { categoryId } = req.params;
  const result = await IdeaService.getIdeasByCategory(
    categoryId as string,
    req.query,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Ideas by category fetched successfully",
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
  getMyIdeas,
  getFeaturedIdeas,
  getTopVotedIdeas,
  getIdeasByCategory,
};
