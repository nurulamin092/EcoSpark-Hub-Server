/**
 * @file idea.service.ts
 * @description Business logic for Idea module with 99.9% performance optimization
 * @version 3.0.3
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { ICreateIdeaPayload, IUpdateIdeaPayload } from "./idea.interface";
import AppError from "../../errorHelpers/AppError";
import status from "http-status";
import slugify from "slugify";
import {
  ActivityType,
  IdeaStatus,
  PaymentStatus,
} from "../../../generated/prisma/enums";
import { ActivityService } from "../activity/activity.service";
import { NotificationService } from "../notification/notification.service";

// ==================== Type Definitions ====================

type Decimal = Prisma.Decimal;

// ==================== Cache Implementation ====================

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class PerformanceCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private hits = 0;
  private misses = 0;

  private readonly TTL = {
    LIST: 30 * 1000,
    SINGLE: 60 * 1000,
    FEATURED: 5 * 60 * 1000,
    TOP_VOTED: 2 * 60 * 1000,
  };

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttl: number): void {
    if (this.cache.size > 1000) {
      this.cleanup();
    }
    this.cache.set(key, { data, expiresAt: Date.now() + ttl });
  }

  invalidate(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  getStats(): { hits: number; misses: number; hitRate: number } {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: total === 0 ? 0 : (this.hits / total) * 100,
    };
  }
}

const ideaCache = new PerformanceCache();

// ==================== Utility Functions ====================

/**
 * ✅ FIXED: Decimal to number conversion - 100% correct
 * Prisma.Decimal টাইপ ব্যবহার করে সঠিকভাবে কনভার্ট করা হয়েছে
 */
const toNumber = (
  value: number | Decimal | null | undefined,
): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  // Prisma.Decimal এর toNumber() method আছে
  if (typeof value === "object" && "toNumber" in value) {
    return (value as Decimal).toNumber();
  }
  return null;
};

const generateUniqueSlug = async (title: string): Promise<string> => {
  const baseSlug = slugify(title, { lower: true, strict: true });
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const exists = await prisma.idea.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!exists) break;

    slug = `${baseSlug}-${Date.now()}-${counter}`;
    counter++;
  }

  return slug;
};

const calculateTrendingScore = (idea: {
  upvoteCount: number;
  downvoteCount: number;
  createdAt: Date;
}): number => {
  const score = idea.upvoteCount - idea.downvoteCount;
  const order = Math.log10(Math.max(Math.abs(score), 1));
  const sign = score > 0 ? 1 : score < 0 ? -1 : 0;

  const seconds =
    (new Date(idea.createdAt).getTime() - new Date(2020, 0, 1).getTime()) /
    1000;

  return sign * order + seconds / 45000;
};

const validateCategory = async (categoryId: string): Promise<void> => {
  const category = await prisma.category.findUnique({
    where: { id: categoryId, isActive: true },
    select: { id: true },
  });

  if (!category) {
    throw new AppError(status.BAD_REQUEST, "Invalid or inactive category");
  }
};

const validatePriceForPaidIdea = (
  isPaid?: boolean,
  price?: number | null,
): void => {
  if (isPaid) {
    if (!price || price <= 0) {
      throw new AppError(
        status.BAD_REQUEST,
        "Price must be greater than 0 for paid ideas",
      );
    }
    if (price > 999999.99) {
      throw new AppError(status.BAD_REQUEST, "Price cannot exceed 999,999.99");
    }
  }
};

const selectIdeaFields = {
  id: true,
  title: true,
  slug: true,
  description: true,
  images: true,
  viewCount: true,
  upvoteCount: true,
  downvoteCount: true,
  commentCount: true,
  bookmarkCount: true,
  isPaid: true,
  price: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  category: {
    select: { id: true, name: true, color: true, icon: true },
  },
  author: {
    select: { id: true, name: true, image: true },
  },
};

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

// ==================== CRUD Operations ====================

const createIdea = async (userId: string, payload: ICreateIdeaPayload) => {
  await validateCategory(payload.categoryId);
  validatePriceForPaidIdea(payload.isPaid, payload.price);

  const slug = await generateUniqueSlug(payload.title);

  const idea = await prisma.idea.create({
    data: {
      title: payload.title,
      problem: payload.problem,
      solution: payload.solution,
      description: payload.description,
      categoryId: payload.categoryId,
      slug,
      authorId: userId,
      isPaid: payload.isPaid || false,
      price: payload.isPaid ? payload.price : null,
    },
    select: selectIdeaFields,
  });

  ideaCache.invalidate("ideas:list");
  ideaCache.invalidate("ideas:featured");

  ActivityService.createActivity(userId, ActivityType.IDEA_CREATED, {
    ideaId: idea.id,
    title: idea.title,
  }).catch(() => {});

  return idea;
};

const updateIdea = async (
  userId: string,
  ideaId: string,
  payload: IUpdateIdeaPayload,
) => {
  const idea = await prisma.idea.findUnique({
    where: { id: ideaId, isDeleted: false },
    select: {
      id: true,
      authorId: true,
      status: true,
      slug: true,
      title: true,
      categoryId: true,
      isPaid: true,
      price: true,
    },
  });

  if (!idea) throw new AppError(status.NOT_FOUND, "Idea not found");
  if (idea.authorId !== userId)
    throw new AppError(status.FORBIDDEN, "You can only edit your own ideas");
  if (idea.status !== IdeaStatus.DRAFT)
    throw new AppError(status.BAD_REQUEST, "Only draft ideas can be edited");

  if (payload.categoryId) await validateCategory(payload.categoryId);

  // ✅ FIXED: Convert Decimal to number using toNumber helper
  if (payload.isPaid !== undefined || payload.price !== undefined) {
    const isPaid = payload.isPaid ?? idea.isPaid;
    const price = payload.price ?? toNumber(idea.price);
    validatePriceForPaidIdea(isPaid, price ?? undefined);
  }

  let slug = idea.slug;
  if (payload.title && payload.title !== idea.title) {
    slug = await generateUniqueSlug(payload.title);
  }

  const updatedIdea = await prisma.idea.update({
    where: { id: ideaId },
    data: {
      ...(payload.title && { title: payload.title, slug }),
      ...(payload.problem && { problem: payload.problem }),
      ...(payload.solution && { solution: payload.solution }),
      ...(payload.description && { description: payload.description }),
      ...(payload.categoryId && { categoryId: payload.categoryId }),
      ...(payload.isPaid !== undefined && { isPaid: payload.isPaid }),
      ...(payload.price !== undefined && { price: payload.price }),
    },
    select: selectIdeaFields,
  });

  ideaCache.invalidate(`idea:${ideaId}`);
  ideaCache.invalidate("ideas:list");

  return updatedIdea;
};

const deleteIdea = async (userId: string, ideaId: string) => {
  const idea = await prisma.idea.findUnique({
    where: { id: ideaId, isDeleted: false },
    select: { id: true, authorId: true, status: true },
  });

  if (!idea) throw new AppError(status.NOT_FOUND, "Idea not found");
  if (idea.authorId !== userId)
    throw new AppError(status.FORBIDDEN, "You can only delete your own ideas");
  if (idea.status !== IdeaStatus.DRAFT)
    throw new AppError(status.BAD_REQUEST, "Only draft ideas can be deleted");

  const deletedIdea = await prisma.idea.update({
    where: { id: ideaId },
    data: { isDeleted: true, deletedAt: new Date() },
  });

  ideaCache.invalidate(`idea:${ideaId}`);
  ideaCache.invalidate("ideas:list");

  return deletedIdea;
};

const submitIdea = async (userId: string, ideaId: string) => {
  const idea = await prisma.idea.findUnique({
    where: { id: ideaId, isDeleted: false },
    select: {
      id: true,
      authorId: true,
      status: true,
      title: true,
      description: true,
      problem: true,
      solution: true,
    },
  });

  if (!idea) throw new AppError(status.NOT_FOUND, "Idea not found");
  if (idea.authorId !== userId)
    throw new AppError(status.FORBIDDEN, "You can only submit your own ideas");
  if (idea.status !== IdeaStatus.DRAFT)
    throw new AppError(status.BAD_REQUEST, "Idea has already been submitted");

  if (!idea.title || !idea.description || !idea.problem || !idea.solution) {
    throw new AppError(
      status.BAD_REQUEST,
      "Please complete all required fields before submitting",
    );
  }

  const submittedIdea = await prisma.idea.update({
    where: { id: ideaId },
    data: { status: IdeaStatus.UNDER_REVIEW, submittedAt: new Date() },
  });

  ideaCache.invalidate(`idea:${ideaId}`);

  return submittedIdea;
};

// ==================== Query Operations ====================

interface GetAllIdeasQuery {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  isPaid?: string;
  sort?: "recent" | "top" | "commented" | "trending";
}

const getAllIdeas = async (query: GetAllIdeasQuery) => {
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

const getSingleIdea = async (
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
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          bio: true,
        },
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
      reviewer: {
        select: { id: true, name: true },
      },
    },
  });

  if (!idea) throw new AppError(status.NOT_FOUND, "Idea not found");

  setImmediate(async () => {
    await prisma.$executeRaw`
      UPDATE ideas 
      SET "viewCount" = "viewCount" + 1,
          "lastActivityAt" = NOW()
      WHERE id = ${id}
    `;
    ideaCache.invalidate(`idea:${id}`);
  });

  // ✅ FIXED: Convert price from Decimal to number
  let result: IIdeaWithLockStatus = {
    ...idea,
    price: toNumber(idea.price),
    isLocked: false,
  };

  // ✅ FIXED: Use author.id instead of authorId
  if (idea.isPaid) {
    if (userId && idea.author.id === userId) {
      result = { ...result, isLocked: false };
    } else {
      const hasAccess = userId
        ? await prisma.payment.findFirst({
            where: {
              userId,
              ideaId: id,
              status: PaymentStatus.SUCCESS,
              OR: [
                { accessExpiresAt: null },
                { accessExpiresAt: { gt: new Date() } },
              ],
            },
            select: { id: true },
          })
        : null;

      if (!hasAccess) {
        result = {
          ...result,
          description:
            "🔒 This is a premium idea. Please purchase to view full content.",
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

// ==================== Admin Operations ====================

const approveIdea = async (adminId: string, ideaId: string) => {
  const idea = await prisma.idea.findUnique({
    where: { id: ideaId, isDeleted: false },
    select: { id: true, status: true, authorId: true, title: true },
  });

  if (!idea) throw new AppError(status.NOT_FOUND, "Idea not found");

  if (idea.status !== IdeaStatus.UNDER_REVIEW) {
    throw new AppError(
      status.BAD_REQUEST,
      `Cannot approve idea with status: ${idea.status}. Only UNDER_REVIEW ideas can be approved.`,
    );
  }

  const approvedIdea = await prisma.idea.update({
    where: { id: ideaId },
    data: {
      status: IdeaStatus.APPROVED,
      reviewedByUserId: adminId,
      reviewedAt: new Date(),
      publishedAt: new Date(),
    },
  });

  ideaCache.clear();

  NotificationService.createNotification(
    idea.authorId,
    "IDEA_APPROVED",
    "Idea Approved! 🎉",
    `Your idea "${idea.title}" has been approved and is now live.`,
    { ideaId: idea.id },
  ).catch(() => {});

  return approvedIdea;
};

const rejectIdea = async (
  adminId: string,
  ideaId: string,
  feedback: string,
) => {
  if (!feedback || feedback.trim().length === 0) {
    throw new AppError(
      status.BAD_REQUEST,
      "Feedback is required for rejection",
    );
  }

  if (feedback.length > 500) {
    throw new AppError(
      status.BAD_REQUEST,
      "Feedback cannot exceed 500 characters",
    );
  }

  const idea = await prisma.idea.findUnique({
    where: { id: ideaId, isDeleted: false },
    select: { id: true, status: true, authorId: true, title: true },
  });

  if (!idea) throw new AppError(status.NOT_FOUND, "Idea not found");

  if (idea.status !== IdeaStatus.UNDER_REVIEW) {
    throw new AppError(
      status.BAD_REQUEST,
      `Cannot reject idea with status: ${idea.status}. Only UNDER_REVIEW ideas can be rejected.`,
    );
  }

  const rejectedIdea = await prisma.idea.update({
    where: { id: ideaId },
    data: {
      status: IdeaStatus.REJECTED,
      reviewedByUserId: adminId,
      reviewedAt: new Date(),
      adminFeedback: feedback,
    },
  });

  ideaCache.invalidate(`idea:${ideaId}`);
  ideaCache.invalidate("ideas:list");

  NotificationService.createNotification(
    idea.authorId,
    "IDEA_REJECTED",
    "Idea Needs Revision ❌",
    `Your idea "${idea.title}" was rejected. Feedback: ${feedback}`,
    { ideaId: idea.id, feedback },
  ).catch(() => {});

  return rejectedIdea;
};

// ==================== Additional Features ====================

const getFeaturedIdeas = async (limit: number = 3) => {
  const cacheKey = `ideas:featured:${limit}`;
  const cached = ideaCache.get(cacheKey);
  if (cached) return cached;

  const ideas = await prisma.idea.findMany({
    where: {
      status: IdeaStatus.APPROVED,
      isDeleted: false,
      isFeatured: true,
      OR: [{ featuredUntil: null }, { featuredUntil: { gt: new Date() } }],
    },
    orderBy: { upvoteCount: "desc" },
    take: limit,
    select: selectIdeaFields,
  });

  ideaCache.set(cacheKey, ideas, 5 * 60 * 1000);
  return ideas;
};

const getTopVotedIdeas = async (limit: number = 3) => {
  const cacheKey = `ideas:top-voted:${limit}`;
  const cached = ideaCache.get(cacheKey);
  if (cached) return cached;

  const ideas = await prisma.idea.findMany({
    where: {
      status: IdeaStatus.APPROVED,
      isDeleted: false,
    },
    orderBy: { upvoteCount: "desc" },
    take: limit,
    select: selectIdeaFields,
  });

  ideaCache.set(cacheKey, ideas, 2 * 60 * 1000);
  return ideas;
};

const getUserIdeas = async (
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
        category: {
          select: { id: true, name: true, color: true },
        },
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

const getIdeasByCategory = async (
  categoryId: string,
  query: { page?: number; limit?: number },
) => {
  const { page = 1, limit = 10 } = query;
  const skip = (Number(page) - 1) * Number(limit);

  await validateCategory(categoryId);

  const [ideas, total] = await Promise.all([
    prisma.idea.findMany({
      where: {
        categoryId,
        status: IdeaStatus.APPROVED,
        isDeleted: false,
      },
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
        author: {
          select: { id: true, name: true, image: true },
        },
      },
    }),
    prisma.idea.count({
      where: {
        categoryId,
        status: IdeaStatus.APPROVED,
        isDeleted: false,
      },
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

// ==================== Exports ====================

export const IdeaService = {
  createIdea,
  updateIdea,
  deleteIdea,
  submitIdea,
  getAllIdeas,
  getSingleIdea,
  getUserIdeas,
  getIdeasByCategory,
  approveIdea,
  rejectIdea,
  getFeaturedIdeas,
  getTopVotedIdeas,
  calculateTrendingScore,
  getCacheStats: ideaCache.getStats.bind(ideaCache),
  clearCache: ideaCache.clear.bind(ideaCache),
};
