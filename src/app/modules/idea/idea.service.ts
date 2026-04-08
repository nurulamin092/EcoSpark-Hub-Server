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

// ==================== Utility Functions ====================

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

    // Use timestamp for uniqueness to avoid collisions
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

const validatePriceForPaidIdea = (isPaid?: boolean, price?: number): void => {
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

// ==================== CRUD Operations ====================

const createIdea = async (userId: string, payload: ICreateIdeaPayload) => {
  // Validate category
  await validateCategory(payload.categoryId);

  // Validate price
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
    include: {
      category: {
        select: {
          id: true,
          name: true,
          color: true,
        },
      },
      author: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  // Create activity log (don't await to not block response)
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

  if (!idea) {
    throw new AppError(status.NOT_FOUND, "Idea not found");
  }

  if (idea.authorId !== userId) {
    throw new AppError(status.FORBIDDEN, "You can only edit your own ideas");
  }

  if (idea.status !== IdeaStatus.DRAFT) {
    throw new AppError(status.BAD_REQUEST, "Only draft ideas can be edited");
  }

  // Validate category if provided
  if (payload.categoryId) {
    await validateCategory(payload.categoryId);
  }

  // Validate price if isPaid is being updated
  if (payload.isPaid !== undefined || payload.price !== undefined) {
    const isPaid = payload.isPaid ?? idea.isPaid;
    const price = payload.price ?? (idea as any).price;
    validatePriceForPaidIdea(isPaid, price);
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
    include: {
      category: {
        select: { id: true, name: true, color: true },
      },
    },
  });

  return updatedIdea;
};

const deleteIdea = async (userId: string, ideaId: string) => {
  const idea = await prisma.idea.findUnique({
    where: { id: ideaId, isDeleted: false },
    select: { id: true, authorId: true, status: true },
  });

  if (!idea) {
    throw new AppError(status.NOT_FOUND, "Idea not found");
  }

  if (idea.authorId !== userId) {
    throw new AppError(status.FORBIDDEN, "You can only delete your own ideas");
  }

  if (idea.status !== IdeaStatus.DRAFT) {
    throw new AppError(status.BAD_REQUEST, "Only draft ideas can be deleted");
  }

  return prisma.idea.update({
    where: { id: ideaId },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
    },
  });
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

  if (!idea) {
    throw new AppError(status.NOT_FOUND, "Idea not found");
  }

  if (idea.authorId !== userId) {
    throw new AppError(status.FORBIDDEN, "You can only submit your own ideas");
  }

  if (idea.status !== IdeaStatus.DRAFT) {
    throw new AppError(status.BAD_REQUEST, "Idea has already been submitted");
  }

  // Validate that required fields are filled
  if (!idea.title || !idea.description || !idea.problem || !idea.solution) {
    throw new AppError(
      status.BAD_REQUEST,
      "Please complete all required fields before submitting",
    );
  }

  const submittedIdea = await prisma.idea.update({
    where: { id: ideaId },
    data: {
      status: IdeaStatus.UNDER_REVIEW,
      submittedAt: new Date(),
    },
  });

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

  if (category) {
    where.categoryId = category;
  }

  if (isPaid !== undefined) {
    where.isPaid = isPaid === "true";
  }

  // Build orderBy based on sort type
  let orderBy: Prisma.IdeaOrderByWithRelationInput = { createdAt: "desc" };

  if (sort === "top") {
    orderBy = { upvoteCount: "desc" };
  } else if (sort === "commented") {
    orderBy = { commentCount: "desc" };
  }

  // For trending, we need to fetch and calculate
  if (sort === "trending") {
    const ideas = await prisma.idea.findMany({
      where,
      include: {
        category: {
          select: { id: true, name: true, color: true },
        },
        author: {
          select: { id: true, name: true, profilePhoto: true },
        },
      },
    });

    const trendingIdeas = ideas
      .map((idea) => ({
        ...idea,
        trendingScore: calculateTrendingScore(idea),
      }))
      .sort((a, b) => b.trendingScore - a.trendingScore)
      .slice(skip, skip + take);

    const total = ideas.length;

    return {
      meta: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
      data: trendingIdeas,
    };
  }

  // Regular queries with pagination
  const [ideas, total] = await Promise.all([
    prisma.idea.findMany({
      where,
      skip,
      take,
      orderBy,
      include: {
        category: {
          select: { id: true, name: true, color: true },
        },
        author: {
          select: { id: true, name: true, profilePhoto: true },
        },
      },
    }),
    prisma.idea.count({ where }),
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

const getSingleIdea = async (id: string, userId?: string) => {
  const idea = await prisma.idea.findUnique({
    where: { id, isDeleted: false },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          profilePhoto: true,
          bio: true,
        },
      },
      category: {
        select: {
          id: true,
          name: true,
          color: true,
          icon: true,
        },
      },
      reviewer: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!idea) {
    throw new AppError(status.NOT_FOUND, "Idea not found");
  }

  // Increment view count atomically
  await prisma.$executeRaw`
    UPDATE ideas 
    SET "viewCount" = "viewCount" + 1,
        "lastActivityAt" = NOW()
    WHERE id = ${id}
  `;

  // Check if user has access to paid content
  if (idea.isPaid) {
    // Author always has access
    if (userId && idea.authorId === userId) {
      return idea;
    }

    // Check if user has purchased
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
      // Return partial content for non-paying users
      return {
        ...idea,
        description:
          "🔒 This is a premium idea. Please purchase to view full content.",
        solution: "🔒 Premium content locked. Purchase to unlock.",
        problem: "🔒 Premium content locked. Purchase to unlock.",
        isLocked: true,
      };
    }
  }

  return idea;
};

// ==================== Admin Operations ====================

const approveIdea = async (adminId: string, ideaId: string) => {
  const idea = await prisma.idea.findUnique({
    where: { id: ideaId, isDeleted: false },
    select: { id: true, status: true, authorId: true, title: true },
  });

  if (!idea) {
    throw new AppError(status.NOT_FOUND, "Idea not found");
  }

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

  // Send notification to author (don't await to not block response)
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

  if (!idea) {
    throw new AppError(status.NOT_FOUND, "Idea not found");
  }

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

  // Send rejection notification to author
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
  const ideas = await prisma.idea.findMany({
    where: {
      status: IdeaStatus.APPROVED,
      isDeleted: false,
      isFeatured: true,
      OR: [{ featuredUntil: null }, { featuredUntil: { gt: new Date() } }],
    },
    orderBy: { upvoteCount: "desc" },
    take: limit,
    include: {
      category: {
        select: { id: true, name: true, color: true },
      },
      author: {
        select: { id: true, name: true, profilePhoto: true },
      },
    },
  });

  return ideas;
};

const getTopVotedIdeas = async (limit: number = 3) => {
  const ideas = await prisma.idea.findMany({
    where: {
      status: IdeaStatus.APPROVED,
      isDeleted: false,
    },
    orderBy: { upvoteCount: "desc" },
    take: limit,
    include: {
      category: {
        select: { id: true, name: true, color: true },
      },
      author: {
        select: { id: true, name: true, profilePhoto: true },
      },
    },
  });

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
      include: {
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

  // Validate category exists
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
      include: {
        author: {
          select: { id: true, name: true, profilePhoto: true },
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
  // CRUD
  createIdea,
  updateIdea,
  deleteIdea,
  submitIdea,

  // Queries
  getAllIdeas,
  getSingleIdea,
  getUserIdeas,
  getIdeasByCategory,

  // Admin
  approveIdea,
  rejectIdea,

  // Additional
  getFeaturedIdeas,
  getTopVotedIdeas,
  calculateTrendingScore,
};
