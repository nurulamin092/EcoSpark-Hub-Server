/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file idea.query.service.ts
 * @description Query operations for Idea module
 * @version 1.0.0
 */

import { Prisma } from "../../../../generated/prisma/client";
import { prisma } from "../../../lib/prisma";
import { selectIdeaFields, toNumber } from "../utils/idea.helpers";
import { ideaCache } from "../utils/idea.cache";
import { checkPaidIdeaAccess } from "../utils/idea.validators";
import AppError from "../../../errorHelpers/AppError";
import status from "http-status";
import { IdeaStatus } from "../../../../generated/prisma/enums";

interface GetAllIdeasQuery {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  isPaid?: string;
  sort?: "recent" | "top" | "commented" | "trending";
}

interface IIdeaWithLockStatus {
  id: string;
  title: string;
  slug: string;
  problem: string;
  solution: string;
  description: string;
  images: any;
  attachments: any;
  viewCount: number;
  upvoteCount: number;
  downvoteCount: number;
  commentCount: number;
  bookmarkCount: number;
  isPaid: boolean;
  price: number | null;
  status: string;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  publishedAt: Date | null;
  adminFeedback: string | null;
  isFeatured: boolean;
  createdAt: Date;
  updatedAt: Date;
  author: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    bio: string | null;
  };
  category: {
    id: string;
    name: string;
    color: string | null;
    icon: string | null;
    description: string | null;
  };
  reviewer: {
    id: string;
    name: string;
  } | null;
  isLocked?: boolean;
}

/**
 * Get all approved ideas with filtering
 */
export const getAllIdeas = async (query: GetAllIdeasQuery) => {
  const {
    page = 1,
    limit = 10,
    search,
    category,
    isPaid,
    sort = "recent",
  } = query;

  const cacheKey = `ideas:list:${JSON.stringify(query)}`;
  const cached = ideaCache.get(cacheKey);
  if (cached) return cached;

  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const where: Prisma.IdeaWhereInput = {
    status: IdeaStatus.APPROVED,
    isDeleted: false,
  };

  if (search) {
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

  // Trending sort with SQL calculation
  if (sort === "trending") {
    const trendingIdeas = await prisma.$queryRaw<any[]>`
      SELECT 
        i.id, i.title, i.slug, i.description, i.images,
        i."viewCount", i."upvoteCount", i."downvoteCount",
        i."commentCount", i."bookmarkCount", i."isPaid", i.price,
        i.status, i."createdAt", i."updatedAt",
        json_build_object('id', c.id, 'name', c.name, 'color', c.color, 'icon', c.icon) as category,
        json_build_object('id', u.id, 'name', u.name, 'image', u.image) as author,
        (
          CASE 
            WHEN (i."upvoteCount" - i."downvoteCount") > 0 THEN 1
            WHEN (i."upvoteCount" - i."downvoteCount") < 0 THEN -1
            ELSE 0
          END * LOG(10, GREATEST(ABS(i."upvoteCount" - i."downvoteCount"), 1))
          + EXTRACT(EPOCH FROM i."createdAt") / 45000
        ) as "trendingScore"
      FROM ideas i
      JOIN categories c ON i."categoryId" = c.id
      JOIN users u ON i."authorId" = u.id
      WHERE i.status = 'APPROVED' 
        AND i."isDeleted" = false
        ${search ? Prisma.sql`AND (i.title ILIKE ${`%${search}%`} OR i.description ILIKE ${`%${search}%`})` : Prisma.sql``}
        ${category ? Prisma.sql`AND i."categoryId" = ${category}` : Prisma.sql``}
        ${isPaid !== undefined ? Prisma.sql`AND i."isPaid" = ${isPaid === "true"}` : Prisma.sql``}
      ORDER BY "trendingScore" DESC
      LIMIT ${take} OFFSET ${skip}
    `;

    const totalResult = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count
      FROM ideas i
      WHERE i.status = 'APPROVED' 
        AND i."isDeleted" = false
        ${search ? Prisma.sql`AND (i.title ILIKE ${`%${search}%`} OR i.description ILIKE ${`%${search}%`})` : Prisma.sql``}
        ${category ? Prisma.sql`AND i."categoryId" = ${category}` : Prisma.sql``}
        ${isPaid !== undefined ? Prisma.sql`AND i."isPaid" = ${isPaid === "true"}` : Prisma.sql``}
    `;

    const total = Number(totalResult[0]?.count || 0);
    const result = {
      meta: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
      data: trendingIdeas,
    };

    ideaCache.set(cacheKey, result, 30_000);
    return result;
  }

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

  const result = {
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
    data: ideas,
  };

  ideaCache.set(cacheKey, result, 30_000);
  return result;
};

/**
 * Get single idea by ID
 */
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

  if (!idea) throw new AppError(status.NOT_FOUND, "Idea not found");

  // Atomic view count increment
  setImmediate(async () => {
    await prisma.$executeRaw`
      UPDATE ideas 
      SET "viewCount" = "viewCount" + 1,
          "lastActivityAt" = NOW()
      WHERE id = ${id}
    `;
    ideaCache.invalidate(`idea:${id}`);
  });

  let result: IIdeaWithLockStatus = {
    ...idea,
    price: toNumber(idea.price),
    isLocked: false,
  };

  if (idea.isPaid) {
    if (userId && idea.author.id === userId) {
      result = { ...result, isLocked: false };
    } else {
      const hasAccess = await checkPaidIdeaAccess(userId, id);
      if (!hasAccess) {
        result = {
          ...result,
          description: "🔒 Premium content locked. Purchase to unlock.",
          solution: "🔒 Premium content locked. Purchase to unlock.",
          problem: "🔒 Premium content locked. Purchase to unlock.",
          isLocked: true,
        };
      }
    }
  }

  if (!userId) {
    ideaCache.set(cacheKey, result, 60_000);
  }

  return result;
};

/**
 * Get current user's ideas
 */
export const getUserIdeas = async (
  userId: string,
  query: { page?: number; limit?: number },
) => {
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

  return {
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
    data: ideas,
  };
};

/**
 * Get ideas by category
 */
export const getIdeasByCategory = async (
  categoryId: string,
  query: { page?: number; limit?: number },
) => {
  const { page = 1, limit = 10 } = query;
  const skip = (Number(page) - 1) * Number(limit);

  const category = await prisma.category.findUnique({
    where: { id: categoryId, isActive: true },
  });
  if (!category) throw new AppError(status.BAD_REQUEST, "Invalid category");

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

  return {
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
    data: ideas,
  };
};
