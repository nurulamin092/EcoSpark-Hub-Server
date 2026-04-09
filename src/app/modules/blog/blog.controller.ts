/**
 * @file blog.controller.ts
 * @description HTTP request handlers for Blog module
 * @version 1.0.0
 */

import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import status from "http-status";
import * as BlogService from "./blog.service";

// ==================== Blog Controllers ====================

export const createBlog = catchAsync(async (req: Request, res: Response) => {
  const result = await BlogService.createBlog(req.user.userId, req.body);

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Blog created successfully",
    data: result,
  });
});

export const updateBlog = catchAsync(async (req: Request, res: Response) => {
  const result = await BlogService.updateBlog(
    req.params.id as string,
    req.user.userId,
    req.body,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Blog updated successfully",
    data: result,
  });
});

export const deleteBlog = catchAsync(async (req: Request, res: Response) => {
  const isAdmin = req.user.role === "ADMIN" || req.user.role === "SUPER_ADMIN";
  await BlogService.deleteBlog(
    req.params.id as string,
    req.user.userId,
    isAdmin,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Blog deleted successfully",
  });
});

export const publishBlog = catchAsync(async (req: Request, res: Response) => {
  const result = await BlogService.publishBlog(
    req.params.id as string,
    req.user.userId,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Blog published successfully",
    data: result,
  });
});

export const getAllBlogs = catchAsync(async (req: Request, res: Response) => {
  const result = await BlogService.getAllBlogs(req.query);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Blogs fetched successfully",
    data: result,
  });
});

export const getBlogBySlug = catchAsync(async (req: Request, res: Response) => {
  const result = await BlogService.getBlogBySlug(req.params.slug as string);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Blog fetched successfully",
    data: result,
  });
});

export const getRelatedBlogs = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const limit = Number(req.query.limit) || 3;

    const blog = await BlogService.getBlogBySlug(id as string);
    const result = await BlogService.getRelatedBlogs(
      blog.id,
      blog.category?.id || null,
      limit,
    );

    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Related blogs fetched successfully",
      data: result,
    });
  },
);

// ==================== Comment Controllers ====================

export const createComment = catchAsync(async (req: Request, res: Response) => {
  const result = await BlogService.createComment(req.user.userId, req.body);

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Comment added successfully",
    data: result,
  });
});

export const getComments = catchAsync(async (req: Request, res: Response) => {
  const { blogId } = req.params;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;

  const result = await BlogService.getCommentsByBlog(
    blogId as string,
    page,
    limit,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Comments fetched successfully",
    data: result,
  });
});

export const deleteComment = catchAsync(async (req: Request, res: Response) => {
  const isAdmin = req.user.role === "ADMIN" || req.user.role === "SUPER_ADMIN";
  await BlogService.deleteComment(
    req.params.commentId as string,
    req.user.userId,
    isAdmin,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Comment deleted successfully",
  });
});

// ==================== Category Controllers ====================

export const getAllCategories = catchAsync(
  async (req: Request, res: Response) => {
    const result = await BlogService.getAllCategories();

    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Categories fetched successfully",
      data: result,
    });
  },
);

export const createCategory = catchAsync(
  async (req: Request, res: Response) => {
    const result = await BlogService.createCategory(req.body);

    sendResponse(res, {
      httpStatusCode: status.CREATED,
      success: true,
      message: "Category created successfully",
      data: result,
    });
  },
);

export const updateCategory = catchAsync(
  async (req: Request, res: Response) => {
    const result = await BlogService.updateCategory(
      req.params.id as string,
      req.body,
    );

    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Category updated successfully",
      data: result,
    });
  },
);

export const deleteCategory = catchAsync(
  async (req: Request, res: Response) => {
    await BlogService.deleteCategory(req.params.id as string);

    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Category deleted successfully",
    });
  },
);

// ==================== Tag Controllers ====================

export const getAllTags = catchAsync(async (req: Request, res: Response) => {
  const result = await BlogService.getAllTags();

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Tags fetched successfully",
    data: result,
  });
});

export const createTag = catchAsync(async (req: Request, res: Response) => {
  const result = await BlogService.createTag(req.body);

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Tag created successfully",
    data: result,
  });
});

// ==================== Like Controller ====================

export const toggleLike = catchAsync(async (req: Request, res: Response) => {
  const result = await BlogService.toggleLike(
    req.params.id as string as string,
    req.user.userId,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: result.message,
    data: { liked: result.liked },
  });
});
