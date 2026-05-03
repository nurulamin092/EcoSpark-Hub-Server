/**
 * @file idea.controller.ts
 * @description HTTP request handlers for Idea module
 * @version 3.0.0
 */

import { Request, Response } from "express";
import { ideaCache, IdeaService } from "./idea.service";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import status from "http-status";
import AppError from "../../errorHelpers/AppError";

/**
 * @description Create a new idea (draft)
 * @route POST /api/v1/ideas
 */
const createIdea = catchAsync(async (req: Request, res: Response) => {
  const result = await IdeaService.createIdea(req.user.userId, req.body);

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Idea created successfully",
    data: result,
  });
});

/**
 * @description Update a draft idea
 * @route PATCH /api/v1/ideas/:id
 */
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

/**
 * @description Delete a draft idea (soft delete)
 * @route DELETE /api/v1/ideas/:id
 */
const deleteIdea = catchAsync(async (req: Request, res: Response) => {
  await IdeaService.deleteIdea(req.user.userId, req.params.id as string);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Idea deleted successfully",
  });
});

/**
 * @description Submit draft idea for admin review
 * @route PATCH /api/v1/ideas/:id/submit
 */
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

/**
 * @description Get all approved ideas with filters
 * @route GET /api/v1/ideas
 */
const getAllIdeas = catchAsync(async (req: Request, res: Response) => {
  const result = await IdeaService.getAllIdeas(req.query);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Ideas fetched successfully",
    data: result,
  });
});

/**
 * @description Get single idea by ID
 * @route GET /api/v1/ideas/:id
 */
const getSingleIdea = catchAsync(async (req: Request, res: Response) => {
  const result = await IdeaService.getSingleIdea(
    req.params.id as string,
    req.user?.userId,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Idea fetched successfully",
    data: result,
  });
});

/**
 * @description Approve an idea (admin only)
 * @route PATCH /api/v1/ideas/:id/approve
 */
const approveIdea = catchAsync(async (req: Request, res: Response) => {
  const result = await IdeaService.approveIdea(
    req.user.userId,
    req.params.id as string,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Idea approved successfully",
    data: result,
  });
});

/**
 * @description Reject an idea with feedback (admin only)
 * @route PATCH /api/v1/ideas/:id/reject
 */
const rejectIdea = catchAsync(async (req: Request, res: Response) => {
  const result = await IdeaService.rejectIdea(
    req.user.userId,
    req.params.id as string,
    req.body.feedback,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Idea rejected successfully",
    data: result,
  });
});

/**
 * @description Get current user's ideas
 * @route GET /api/v1/ideas/my-ideas
 */
const getMyIdeas = catchAsync(async (req: Request, res: Response) => {
  const result = await IdeaService.getUserIdeas(req.user.userId, req.query);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "My ideas fetched successfully",
    data: result,
  });
});

/**
 * @description Get featured ideas for homepage
 * @route GET /api/v1/ideas/featured
 */
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

/**
 * @description Get top voted ideas for testimonials
 * @route GET /api/v1/ideas/top-voted
 */
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

/**
 * @description Get ideas by category
 * @route GET /api/v1/ideas/category/:categoryId
 */
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

// ==================== Testimonials Controllers ====================

/**
 * Get testimonials for home page
 * Query params:
 * - limit: number (default: 3, max: 10)
 * - days: number (filter by last N days)
 * - criteria: 'all-time' | 'this-month' | 'this-week'
 */
const getTestimonials = catchAsync(async (req: Request, res: Response) => {
  const limit = req.query.limit ? Number(req.query.limit) : 3;
  const days = req.query.days ? Number(req.query.days) : undefined;
  const criteria =
    (req.query.criteria as "all-time" | "this-month" | "this-week") ||
    undefined;

  const testimonials = await IdeaService.getTestimonials(limit, days, criteria);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Testimonials fetched successfully",
    data: {
      testimonials,
      meta: {
        count: testimonials.length,
        limit,
        ...(days && { days }),
        ...(criteria && { criteria }),
      },
    },
  });
});

/**
 * Get single testimonial by ID
 */
const getTestimonialById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const testimonial = await IdeaService.getTestimonialById(id as string);

  if (!testimonial) {
    throw new AppError(status.NOT_FOUND, "Testimonial not found");
  }

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Testimonial fetched successfully",
    data: testimonial,
  });
});

/**
 * Get testimonials statistics (for admin dashboard)
 */
const getTestimonialsStats = catchAsync(async (req: Request, res: Response) => {
  const stats = await IdeaService.getTestimonialsStats();

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Testimonials statistics fetched successfully",
    data: stats,
  });
});

/**
 * Refresh testimonials cache (admin only)
 */
const refreshTestimonialsCache = catchAsync(
  async (req: Request, res: Response) => {
    // Clear all testimonials related cache
    ideaCache.invalidate("ideas:testimonials");
    ideaCache.invalidate("testimonial:");
    ideaCache.invalidate("testimonials:stats");

    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Testimonials cache refreshed successfully",
    });
  },
);

//* ====================  Idea Moderation ====================
const getPendingIdeas = catchAsync(async (req: Request, res: Response) => {
  const limit = req.query.limit ? Number(req.query.limit) : 10;
  const result = await IdeaService.getPendingIdeasForAdmin(limit);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Pending ideas fetched successfully",
    data: result,
  });
});

const getAllIdeasForAdmin = catchAsync(async (req: Request, res: Response) => {
  const result = await IdeaService.getAllIdeasForAdmin(req.query);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Ideas fetched successfully",
    data: result,
  });
});

export const IdeaController = {
  createIdea,
  updateIdea,
  getAllIdeasForAdmin,
  approveIdea,
  getPendingIdeas,
  deleteIdea,
  submitIdea,
  getAllIdeas,
  getSingleIdea,
  rejectIdea,
  getMyIdeas,
  getFeaturedIdeas,
  getTopVotedIdeas,
  getIdeasByCategory,
  getTestimonials,
  getTestimonialById,
  getTestimonialsStats,
  refreshTestimonialsCache,
};
