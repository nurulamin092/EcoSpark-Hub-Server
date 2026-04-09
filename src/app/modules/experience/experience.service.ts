/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file experience.service.ts
 * @description Service layer for User Experience module
 * @version 3.0.0
 */

import { prisma } from "../../lib/prisma";
import { Prisma } from "../../../generated/prisma/client";
import {
  ICreateExperiencePayload,
  IUpdateExperiencePayload,
  IExperienceFilters,
  IExperienceResponse,
  IMeasurableResult,
} from "./experience.interface";
import AppError from "../../errorHelpers/AppError";
import httpStatus from "http-status";
import { ExperienceStatus, IdeaStatus } from "../../../generated/prisma/enums";
import { NotificationService } from "../notification/notification.service";

// ==================== Helper Functions ====================

/**
 * Convert IMeasurableResult[] to Prisma Json (for database storage)
 * FIXED: Returns null instead of Prisma.JsonNull to avoid type issues
 */
const toPrismaJson = (
  results: IMeasurableResult[] | undefined,
): Prisma.InputJsonValue | null => {
  if (!results || results.length === 0) {
    return null;
  }
  return results as unknown as Prisma.InputJsonValue;
};

/**
 * Parse Prisma Json to IMeasurableResult[] (for API response)
 */
const fromPrismaJson = (json: any): IMeasurableResult[] | null => {
  if (!json || json === null) {
    return null;
  }
  if (Array.isArray(json)) {
    return json as IMeasurableResult[];
  }
  return null;
};

/**
 * Format experience data for API response
 */
const formatExperience = async (
  experience: any,
  currentUserId?: string,
): Promise<IExperienceResponse> => {
  const [hasUserVotedHelpful, hasUserLiked] = currentUserId
    ? await Promise.all([
        prisma.experienceHelpfulVote.findUnique({
          where: {
            experienceId_userId: {
              experienceId: experience.id,
              userId: currentUserId,
            },
          },
        }),
        prisma.experienceLike.findUnique({
          where: {
            experienceId_userId: {
              experienceId: experience.id,
              userId: currentUserId,
            },
          },
        }),
      ])
    : [null, null];

  return {
    id: experience.id,
    ideaId: experience.ideaId,
    userId: experience.userId,
    rating: experience.rating,
    title: experience.title,
    content: experience.content,
    images: experience.images,
    results: fromPrismaJson(experience.results),
    helpfulCount: experience.helpfulCount,
    likeCount: experience.likeCount,
    status: experience.status,
    isOwner: currentUserId === experience.userId,
    hasUserVotedHelpful: !!hasUserVotedHelpful,
    hasUserLiked: !!hasUserLiked,
    author: {
      id: experience.user.id,
      name: experience.user.name,
      image: experience.user.image,
    },
    idea: {
      id: experience.idea.id,
      title: experience.idea.title,
      slug: experience.idea.slug,
    },
    createdAt: experience.createdAt,
    updatedAt: experience.updatedAt,
  };
};

// ==================== CRUD Operations ====================

/**
 * Create a new user experience
 */
export const createExperience = async (
  userId: string,
  payload: ICreateExperiencePayload,
): Promise<IExperienceResponse> => {
  // Check if idea exists and is approved
  const idea = await prisma.idea.findUnique({
    where: {
      id: payload.ideaId,
      status: IdeaStatus.APPROVED,
      isDeleted: false,
    },
    select: { id: true, title: true, authorId: true },
  });

  if (!idea) {
    throw new AppError(httpStatus.NOT_FOUND, "Idea not found or not approved");
  }

  // Check if user already has an experience for this idea
  const existing = await prisma.userExperience.findUnique({
    where: { ideaId_userId: { ideaId: payload.ideaId, userId } },
  });

  if (existing) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "You have already shared an experience for this idea",
    );
  }

  // Create experience with proper JSON conversion
  const experienceData: any = {
    ideaId: payload.ideaId,
    userId,
    rating: payload.rating,
    title: payload.title,
    content: payload.content,
    images: payload.images || [],
    status: ExperienceStatus.PENDING,
  };

  // Only add results if provided
  if (payload.results && payload.results.length > 0) {
    experienceData.results = toPrismaJson(payload.results);
  }

  const experience = await prisma.userExperience.create({
    data: experienceData,
    include: {
      user: {
        select: { id: true, name: true, image: true },
      },
      idea: {
        select: { id: true, title: true, slug: true },
      },
    },
  });

  // Notify idea author (if not the same user)
  if (idea.authorId !== userId) {
    await NotificationService.createNotification(
      idea.authorId,
      "IDEA_REPORTED",
      "New Experience Shared 📝",
      `Someone shared their experience with your idea "${idea.title}"`,
      { experienceId: experience.id, ideaId: idea.id },
    );
  }

  return formatExperience(experience, userId);
};

/**
 * Update an existing experience
 */
export const updateExperience = async (
  userId: string,
  experienceId: string,
  payload: IUpdateExperiencePayload,
): Promise<IExperienceResponse> => {
  const experience = await prisma.userExperience.findUnique({
    where: { id: experienceId },
  });

  if (!experience) {
    throw new AppError(httpStatus.NOT_FOUND, "Experience not found");
  }

  if (experience.userId !== userId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You can only edit your own experiences",
    );
  }

  if (experience.status !== ExperienceStatus.PENDING) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Only pending experiences can be edited",
    );
  }

  // Build update data dynamically
  const updateData: any = {};

  if (payload.rating !== undefined) {
    updateData.rating = payload.rating;
  }
  if (payload.title) {
    updateData.title = payload.title;
  }
  if (payload.content) {
    updateData.content = payload.content;
  }
  if (payload.images !== undefined) {
    updateData.images = payload.images;
  }
  if (payload.results !== undefined) {
    if (payload.results.length > 0) {
      updateData.results = toPrismaJson(payload.results);
    } else {
      updateData.results = null;
    }
  }

  const updated = await prisma.userExperience.update({
    where: { id: experienceId },
    data: updateData,
    include: {
      user: { select: { id: true, name: true, image: true } },
      idea: { select: { id: true, title: true, slug: true } },
    },
  });

  return formatExperience(updated, userId);
};

/**
 * Delete an experience
 */
export const deleteExperience = async (
  userId: string,
  experienceId: string,
  isAdmin: boolean = false,
): Promise<{ success: boolean; message: string }> => {
  const experience = await prisma.userExperience.findUnique({
    where: { id: experienceId },
  });

  if (!experience) {
    throw new AppError(httpStatus.NOT_FOUND, "Experience not found");
  }

  if (experience.userId !== userId && !isAdmin) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You can only delete your own experiences",
    );
  }

  await prisma.userExperience.delete({ where: { id: experienceId } });

  return { success: true, message: "Experience deleted successfully" };
};

// ==================== Query Operations ====================

/**
 * Get experiences with filters
 */
export const getExperiences = async (
  filters: IExperienceFilters,
  currentUserId?: string,
): Promise<{
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  data: IExperienceResponse[];
}> => {
  const {
    page = 1,
    limit = 10,
    ideaId,
    userId,
    minRating,
    maxRating,
    status,
    sort = "recent",
  } = filters;
  const skip = (page - 1) * limit;

  const where: any = {};

  if (ideaId) where.ideaId = ideaId;
  if (userId) where.userId = userId;
  if (status) {
    where.status = status;
  } else {
    where.status = ExperienceStatus.APPROVED;
  }
  if (minRating) where.rating = { gte: minRating };
  if (maxRating) where.rating = { ...where.rating, lte: maxRating };

  let orderBy: any = { createdAt: "desc" };
  if (sort === "helpful") orderBy = { helpfulCount: "desc" };
  if (sort === "rating") orderBy = { rating: "desc" };
  if (sort === "mostLiked") orderBy = { likeCount: "desc" };

  const [experiences, total] = await Promise.all([
    prisma.userExperience.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        user: { select: { id: true, name: true, image: true } },
        idea: { select: { id: true, title: true, slug: true } },
      },
    }),
    prisma.userExperience.count({ where }),
  ]);

  const formattedExperiences = await Promise.all(
    experiences.map((exp) => formatExperience(exp, currentUserId)),
  );

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    data: formattedExperiences,
  };
};

/**
 * Get single experience by ID
 */
export const getExperienceById = async (
  experienceId: string,
  currentUserId?: string,
): Promise<IExperienceResponse> => {
  const experience = await prisma.userExperience.findUnique({
    where: { id: experienceId },
    include: {
      user: { select: { id: true, name: true, image: true, bio: true } },
      idea: {
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          author: { select: { name: true } },
        },
      },
    },
  });

  if (!experience) {
    throw new AppError(httpStatus.NOT_FOUND, "Experience not found");
  }

  return formatExperience(experience, currentUserId);
};

/**
 * Get user's experience for a specific idea
 */
export const getUserExperienceForIdea = async (
  userId: string,
  ideaId: string,
): Promise<IExperienceResponse | null> => {
  const experience = await prisma.userExperience.findUnique({
    where: { ideaId_userId: { ideaId, userId } },
    include: {
      user: { select: { id: true, name: true, image: true } },
      idea: { select: { id: true, title: true, slug: true } },
    },
  });

  if (!experience) return null;

  return formatExperience(experience, userId);
};

// ==================== Interaction Operations ====================

/**
 * Toggle helpful vote on an experience
 */
export const toggleHelpful = async (
  userId: string,
  experienceId: string,
): Promise<{ helpful: boolean; message: string }> => {
  const experience = await prisma.userExperience.findUnique({
    where: { id: experienceId },
  });

  if (!experience) {
    throw new AppError(httpStatus.NOT_FOUND, "Experience not found");
  }

  const existing = await prisma.experienceHelpfulVote.findUnique({
    where: { experienceId_userId: { experienceId, userId } },
  });

  if (existing) {
    await prisma.experienceHelpfulVote.delete({ where: { id: existing.id } });
    await prisma.userExperience.update({
      where: { id: experienceId },
      data: { helpfulCount: { decrement: 1 } },
    });
    return { helpful: false, message: "Removed helpful vote" };
  }

  await prisma.experienceHelpfulVote.create({
    data: { experienceId, userId },
  });
  await prisma.userExperience.update({
    where: { id: experienceId },
    data: { helpfulCount: { increment: 1 } },
  });
  return { helpful: true, message: "Marked as helpful" };
};

/**
 * Toggle like on an experience
 */
export const toggleLike = async (
  userId: string,
  experienceId: string,
): Promise<{ liked: boolean; message: string }> => {
  const experience = await prisma.userExperience.findUnique({
    where: { id: experienceId },
  });

  if (!experience) {
    throw new AppError(httpStatus.NOT_FOUND, "Experience not found");
  }

  const existing = await prisma.experienceLike.findUnique({
    where: { experienceId_userId: { experienceId, userId } },
  });

  if (existing) {
    await prisma.experienceLike.delete({ where: { id: existing.id } });
    await prisma.userExperience.update({
      where: { id: experienceId },
      data: { likeCount: { decrement: 1 } },
    });
    return { liked: false, message: "Removed like" };
  }

  await prisma.experienceLike.create({
    data: { experienceId, userId },
  });
  await prisma.userExperience.update({
    where: { id: experienceId },
    data: { likeCount: { increment: 1 } },
  });
  return { liked: true, message: "Liked experience" };
};

// ==================== Statistics ====================

/**
 * Get experience statistics for an idea
 */
export const getIdeaExperienceStats = async (ideaId: string) => {
  const stats = await prisma.userExperience.aggregate({
    where: { ideaId, status: ExperienceStatus.APPROVED },
    _avg: { rating: true },
    _count: { id: true },
  });

  const ratingDistribution = await prisma.userExperience.groupBy({
    by: ["rating"],
    where: { ideaId, status: ExperienceStatus.APPROVED },
    _count: { rating: true },
  });

  const topExperiences = await prisma.userExperience.findMany({
    where: { ideaId, status: ExperienceStatus.APPROVED },
    orderBy: { helpfulCount: "desc" },
    take: 3,
    include: {
      user: { select: { id: true, name: true, image: true } },
      idea: { select: { id: true, title: true, slug: true } },
    },
  });

  const formattedTop = await Promise.all(
    topExperiences.map((exp) => formatExperience(exp)),
  );

  return {
    totalExperiences: stats._count.id,
    averageRating: stats._avg.rating || 0,
    ratingDistribution: ratingDistribution.map((r) => ({
      rating: r.rating,
      count: r._count.rating,
    })),
    topExperiences: formattedTop,
  };
};

// ==================== Admin Operations ====================

/**
 * Moderate an experience (approve/reject/feature)
 */
export const moderateExperience = async (
  adminId: string,
  experienceId: string,
  status: ExperienceStatus,
  feedback?: string,
) => {
  const experience = await prisma.userExperience.findUnique({
    where: { id: experienceId },
    include: { user: true, idea: true },
  });

  if (!experience) {
    throw new AppError(httpStatus.NOT_FOUND, "Experience not found");
  }

  const updateData: any = {
    status,
    adminFeedback: feedback || null,
  };

  if (status === ExperienceStatus.APPROVED) {
    updateData.verifiedAt = new Date();
  }
  if (status === ExperienceStatus.FEATURED) {
    updateData.featuredAt = new Date();
    updateData.verifiedAt = new Date();
  }

  const updated = await prisma.userExperience.update({
    where: { id: experienceId },
    data: updateData,
  });

  const notificationTitle =
    status === ExperienceStatus.APPROVED
      ? "Experience Approved ✅"
      : status === ExperienceStatus.FEATURED
        ? "Experience Featured 🌟"
        : "Experience Needs Revision ❌";

  await NotificationService.createNotification(
    experience.userId,
    "IDEA_REJECTED",
    notificationTitle,
    feedback ||
      `Your experience for "${experience.idea.title}" has been ${status.toLowerCase()}.`,
    { experienceId, ideaId: experience.ideaId, feedback },
  );

  return updated;
};

/**
 * Get all experiences for admin (including pending)
 */
export const getAllExperiencesForAdmin = async (
  filters: IExperienceFilters,
) => {
  const { page = 1, limit = 20, status, sort = "recent" } = filters;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (status) where.status = status;

  let orderBy: any = { createdAt: "desc" };
  if (sort === "recent") orderBy = { createdAt: "desc" };
  if (sort === "rating") orderBy = { rating: "desc" };

  const [experiences, total] = await Promise.all([
    prisma.userExperience.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
        idea: {
          select: {
            id: true,
            title: true,
            slug: true,
            author: { select: { name: true } },
          },
        },
      },
    }),
    prisma.userExperience.count({ where }),
  ]);

  const formattedExperiences = await Promise.all(
    experiences.map((exp) => formatExperience(exp)),
  );

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    data: formattedExperiences,
  };
};
