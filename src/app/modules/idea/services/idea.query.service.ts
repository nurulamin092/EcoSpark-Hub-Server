/**
 * @file idea.query.service.ts
 * @description Query operations for Idea module - NO RAW SQL, NO N+1
 * @version 2.1.0
 */

import { Prisma } from "../../../../generated/prisma/client";
import { prisma } from "../../../lib/prisma";
import { IImageData, selectIdeaFields, toNumber } from "../utils/idea.helpers";
import { ideaCache } from "../utils/idea.cache";
import { checkPaidIdeaAccess } from "../utils/idea.validators";
import AppError from "../../../errorHelpers/AppError";
import httpStatus from "http-status";
import { IdeaStatus } from "../../../../generated/prisma/enums";
import {
  GetAllIdeasQuery,
  IIdeaWithLockStatus,
  IUserIdea,
  ICategoryIdea,
  PaginatedResult,
  IdeaWithRelations,
} from "../idea.interface";

// ==================== Full Idea with Relations (for main list) ====================

export const getAllIdeas = async (
  query: GetAllIdeasQuery,
): Promise<PaginatedResult<IdeaWithRelations>> => {
  const {
    page = 1,
    limit = 10,
    search,
    category,
    isPaid,
    sort = "recent",
  } = query;

  const cacheKey = `ideas:list:${JSON.stringify(query)}`;
  const cached = ideaCache.get<PaginatedResult<IdeaWithRelations>>(cacheKey);
  if (cached) return cached;

  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const where: Prisma.IdeaWhereInput = {
    status: IdeaStatus.APPROVED,
    isDeleted: false,
  };

  if (search && search.trim()) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { problem: { contains: search, mode: "insensitive" } },
      { solution: { contains: search, mode: "insensitive" } },
    ];
  }

  if (category) where.categoryId = category;
  if (isPaid !== undefined) where.isPaid = isPaid === "true";

  let orderBy: Prisma.IdeaOrderByWithRelationInput = { createdAt: "desc" };
  if (sort === "top") orderBy = { upvoteCount: "desc" };
  if (sort === "commented") orderBy = { commentCount: "desc" };

  const [ideas, total] = await Promise.all([
    prisma.idea.findMany({
      where,
      skip,
      take,
      orderBy,
      select: selectIdeaFields,
    }),
    prisma.idea.count({ where }),
  ]);

  const result: PaginatedResult<IdeaWithRelations> = {
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
    data: ideas as IdeaWithRelations[],
  };

  ideaCache.set(cacheKey, result, 30_000);
  return result;
};

// ==================== Single Idea ====================

export const getSingleIdea = async (
  id: string,
  userId?: string,
): Promise<IIdeaWithLockStatus> => {
  const cacheKey = `idea:${id}:${userId || "guest"}`;

  if (!userId) {
    const cached = ideaCache.get<IIdeaWithLockStatus>(cacheKey);
    if (cached) return cached;
  }

  const idea = await prisma.idea.findUnique({
    where: { id, isDeleted: false },
    select: {
      id: true,
      title: true,
      slug: true,
      problem: true,
      solution: true,
      description: true,
      images: true,
      attachments: true,
      viewCount: true,
      upvoteCount: true,
      downvoteCount: true,
      commentCount: true,
      bookmarkCount: true,
      isPaid: true,
      price: true,
      status: true,
      submittedAt: true,
      reviewedAt: true,
      publishedAt: true,
      adminFeedback: true,
      isFeatured: true,
      createdAt: true,
      updatedAt: true,
      author: {
        select: { id: true, name: true, email: true, image: true, bio: true },
      },
      category: {
        select: {
          id: true,
          name: true,
          color: true,
          icon: true,
          description: true,
        },
      },
      reviewer: { select: { id: true, name: true } },
    },
  });

  if (!idea) {
    throw new AppError(httpStatus.NOT_FOUND, "Idea not found");
  }

  // Atomic view count increment (non-blocking)
  void prisma.$executeRaw`
    UPDATE ideas 
    SET "viewCount" = "viewCount" + 1, "lastActivityAt" = NOW()
    WHERE id = ${id}
  `;

  const result: IIdeaWithLockStatus = {
    ...idea,
    images: idea.images as IImageData[] | null,
    price: toNumber(idea.price),
    isLocked: false,
  };

  if (idea.isPaid && userId && idea.author.id !== userId) {
    const hasAccess = await checkPaidIdeaAccess(userId, id);
    if (!hasAccess) {
      result.description = "🔒 Premium content locked. Purchase to unlock.";
      result.solution = "🔒 Premium content locked. Purchase to unlock.";
      result.problem = "🔒 Premium content locked. Purchase to unlock.";
      result.isLocked = true;
    }
  }

  if (!userId) {
    ideaCache.set(cacheKey, result, 60_000);
  }

  return result;
};

// ==================== User's Own Ideas ====================

export const getUserIdeas = async (
  userId: string,
  query: { page?: number; limit?: number },
): Promise<PaginatedResult<IUserIdea>> => {
  const { page = 1, limit = 10 } = query;
  const skip = (Number(page) - 1) * Number(limit);

  const [ideas, total] = await Promise.all([
    prisma.idea.findMany({
      where: { authorId: userId, isDeleted: false },
      skip,
      take: Number(limit),
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        status: true,
        upvoteCount: true,
        downvoteCount: true,
        viewCount: true,
        isPaid: true,
        price: true,
        createdAt: true,
        category: { select: { id: true, name: true, color: true } },
      },
    }),
    prisma.idea.count({ where: { authorId: userId, isDeleted: false } }),
  ]);

  const transformedIdeas: IUserIdea[] = ideas.map((idea) => ({
    id: idea.id,
    title: idea.title,
    slug: idea.slug,
    description: idea.description,
    status: idea.status,
    upvoteCount: idea.upvoteCount,
    downvoteCount: idea.downvoteCount,
    viewCount: idea.viewCount,
    isPaid: idea.isPaid,
    price: idea.price ? toNumber(idea.price) : null,
    createdAt: idea.createdAt,
    category: idea.category,
  }));

  return {
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
    data: transformedIdeas,
  };
};

// ==================== Ideas by Category ====================

export const getIdeasByCategory = async (
  categoryId: string,
  query: { page?: number; limit?: number },
): Promise<PaginatedResult<ICategoryIdea>> => {
  const { page = 1, limit = 10 } = query;
  const skip = (Number(page) - 1) * Number(limit);

  const category = await prisma.category.findUnique({
    where: { id: categoryId, isActive: true },
    select: { id: true, name: true },
  });

  if (!category) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid category");
  }

  const [ideas, total] = await Promise.all([
    prisma.idea.findMany({
      where: { categoryId, status: IdeaStatus.APPROVED, isDeleted: false },
      skip,
      take: Number(limit),
      orderBy: { upvoteCount: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        upvoteCount: true,
        downvoteCount: true,
        viewCount: true,
        isPaid: true,
        price: true,
        createdAt: true,
        author: { select: { id: true, name: true, image: true } },
      },
    }),
    prisma.idea.count({
      where: { categoryId, status: IdeaStatus.APPROVED, isDeleted: false },
    }),
  ]);

  const transformedIdeas: ICategoryIdea[] = ideas.map((idea) => ({
    id: idea.id,
    title: idea.title,
    slug: idea.slug,
    description: idea.description,
    upvoteCount: idea.upvoteCount,
    downvoteCount: idea.downvoteCount,
    viewCount: idea.viewCount,
    isPaid: idea.isPaid,
    price: idea.price ? toNumber(idea.price) : null,
    createdAt: idea.createdAt,
    author: idea.author,
  }));

  return {
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
    data: transformedIdeas,
  };
};
