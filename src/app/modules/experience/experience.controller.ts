/**
 * @file experience.controller.ts
 * @description HTTP request handlers for Experience module
 * @version 1.0.0
 */

import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import status from "http-status";
import * as ExperienceService from "./experience.service";
import { ExperienceStatus } from "../../../generated/prisma/enums";

// ==================== User Experience Controllers ====================

export const createExperience = catchAsync(
  async (req: Request, res: Response) => {
    const result = await ExperienceService.createExperience(
      req.user.userId,
      req.body,
    );

    sendResponse(res, {
      httpStatusCode: status.CREATED,
      success: true,
      message: "Experience shared successfully. Awaiting moderation.",
      data: result,
    });
  },
);

export const updateExperience = catchAsync(
  async (req: Request, res: Response) => {
    const result = await ExperienceService.updateExperience(
      req.user.userId,
      req.params.id as string,
      req.body,
    );

    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Experience updated successfully",
      data: result,
    });
  },
);

export const deleteExperience = catchAsync(
  async (req: Request, res: Response) => {
    const isAdmin =
      req.user.role === "ADMIN" || req.user.role === "SUPER_ADMIN";
    await ExperienceService.deleteExperience(
      req.user.userId,
      req.params.id as string,
      isAdmin,
    );

    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Experience deleted successfully",
    });
  },
);

// ==================== Query Controllers ====================

export const getExperiences = catchAsync(
  async (req: Request, res: Response) => {
    const result = await ExperienceService.getExperiences(
      req.query,
      req.user?.userId,
    );

    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Experiences fetched successfully",
      data: result,
    });
  },
);

export const getExperienceById = catchAsync(
  async (req: Request, res: Response) => {
    const result = await ExperienceService.getExperienceById(
      req.params.id as string,
      req.user?.userId,
    );

    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Experience fetched successfully",
      data: result,
    });
  },
);

export const getUserExperienceForIdea = catchAsync(
  async (req: Request, res: Response) => {
    const { ideaId } = req.params;
    const result = await ExperienceService.getUserExperienceForIdea(
      req.user.userId,
      ideaId as string,
    );

    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: result
        ? "Experience found"
        : "No experience found for this idea",
      data: result,
    });
  },
);

export const getIdeaExperienceStats = catchAsync(
  async (req: Request, res: Response) => {
    const { ideaId } = req.params;
    const result = await ExperienceService.getIdeaExperienceStats(
      ideaId as string,
    );

    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Experience statistics fetched successfully",
      data: result,
    });
  },
);

// ==================== Interaction Controllers ====================

export const toggleHelpful = catchAsync(async (req: Request, res: Response) => {
  const result = await ExperienceService.toggleHelpful(
    req.user.userId,
    req.params.id as string,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: result.message,
    data: { helpful: result.helpful },
  });
});

export const toggleLike = catchAsync(async (req: Request, res: Response) => {
  const result = await ExperienceService.toggleLike(
    req.user.userId,
    req.params.id as string,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: result.message,
    data: { liked: result.liked },
  });
});

// ==================== Admin Controllers ====================

export const getAllExperiencesForAdmin = catchAsync(
  async (req: Request, res: Response) => {
    const result = await ExperienceService.getAllExperiencesForAdmin(req.query);

    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "All experiences fetched successfully",
      data: result,
    });
  },
);

export const moderateExperience = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, feedback } = req.body;

    const result = await ExperienceService.moderateExperience(
      req.user.userId,
      id as string,
      status as ExperienceStatus,
      feedback,
    );

    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: `Experience ${status.toLowerCase()} successfully`,
      data: result,
    });
  },
);
