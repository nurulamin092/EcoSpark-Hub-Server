/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file idea.admin.service.ts
 * @description Admin operations for Idea module
 * @version 1.0.0
 */

import { prisma } from "../../../lib/prisma";
import { ideaCache } from "../utils/idea.cache";
import AppError from "../../../errorHelpers/AppError";
import status from "http-status";
import { IdeaStatus } from "../../../../generated/prisma/enums";
import { NotificationService } from "../../notification/notification.service";

/**
 * Approve an idea (admin only)
 */
export const approveIdea = async (adminId: string, ideaId: string) => {
  const currentIdea = await prisma.idea.findUnique({
    where: { id: ideaId },
    select: {
      id: true,
      status: true,
      title: true,
      authorId: true,
    },
  });

  console.log("📊 Current idea status:", currentIdea?.status);
  if (currentIdea?.status === IdeaStatus.DRAFT) {
    console.log("🔄 Moving idea from DRAFT to UNDER_REVIEW first...");

    await prisma.idea.update({
      where: { id: ideaId },
      data: {
        status: IdeaStatus.UNDER_REVIEW,
      },
    });

    console.log("✅ Status updated to UNDER_REVIEW");
  }

  const idea = await prisma.idea.findUnique({
    where: { id: ideaId, isDeleted: false },
    select: { id: true, status: true, authorId: true, title: true },
  });

  console.log(`🔍 [approveIdea] Idea found:`, {
    id: idea?.id,
    status: idea?.status,
    title: idea?.title,
  });

  if (!idea) {
    console.error(`❌ [approveIdea] Idea not found: ${ideaId}`);
    throw new AppError(status.NOT_FOUND, "Idea not found");
  }

  if (idea.status !== IdeaStatus.UNDER_REVIEW) {
    console.error(
      `❌ [approveIdea] Invalid status: ${idea.status}, expected UNDER_REVIEW`,
    );
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

/**
 * Reject an idea with feedback (admin only)
 */

export const rejectIdea = async (
  adminId: string,
  ideaId: string,
  feedback: string,
) => {
  // Validate feedback first
  if (!feedback?.trim()) {
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

  const rejectedIdea = await prisma.$transaction(async (tx) => {
    // 1. Get current idea
    const currentIdea = await tx.idea.findUnique({
      where: { id: ideaId, isDeleted: false },
      select: { id: true, status: true, authorId: true, title: true },
    });

    if (!currentIdea) {
      throw new AppError(status.NOT_FOUND, "Idea not found");
    }

    console.log("📊 Current idea status:", currentIdea.status);

    // 2. Determine final status flow
    const finalStatus = IdeaStatus.REJECTED;

    // 3. If DRAFT, first update to UNDER_REVIEW (optional but good for audit)
    if (currentIdea.status === IdeaStatus.DRAFT) {
      console.log("🔄 DRAFT → UNDER_REVIEW → REJECTED");
      await tx.idea.update({
        where: { id: ideaId },
        data: { status: IdeaStatus.UNDER_REVIEW },
      });
    } else if (currentIdea.status !== IdeaStatus.UNDER_REVIEW) {
      throw new AppError(
        status.BAD_REQUEST,
        `Cannot reject idea with status: ${currentIdea.status}. Only DRAFT or UNDER_REVIEW ideas can be rejected.`,
      );
    }

    // 4. Perform rejection
    return await tx.idea.update({
      where: { id: ideaId },
      data: {
        status: finalStatus,
        reviewedByUserId: adminId,
        reviewedAt: new Date(),
        adminFeedback: feedback.trim(),
      },
    });
  });

  // Clear caches after transaction
  await Promise.allSettled([
    ideaCache.invalidate(`idea:${ideaId}`),
    ideaCache.invalidate("ideas:list"),
    ideaCache.clear(),
  ]);

  // Send notification
  NotificationService.createNotification(
    rejectedIdea.authorId,
    "IDEA_REJECTED",
    "Idea Needs Revision ❌",
    `Your idea "${rejectedIdea.title}" was rejected. Feedback: ${feedback.substring(0, 200)}${feedback.length > 200 ? "..." : ""}`,
    { ideaId: rejectedIdea.id, feedback: feedback.trim() },
  ).catch(console.error);

  return rejectedIdea;
};
/**
 *
 * Get pending ideas for admin review
 */
export const getPendingIdeasForAdmin = async (limit: number = 10) => {
  return prisma.idea.findMany({
    where: { status: IdeaStatus.UNDER_REVIEW, isDeleted: false },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      author: { select: { id: true, name: true, email: true } },
      category: { select: { id: true, name: true } },
    },
  });
};

/**
 * Get all ideas for admin (with filters)
 */

export const getAllIdeasForAdmin = async (query: any) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;
  const status = query.status as IdeaStatus | undefined;
  const search = query.search || "";

  const where: any = { isDeleted: false };

  if (status) where.status = status;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  const [ideas, total] = await Promise.all([
    prisma.idea.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: { id: true, name: true, email: true } },
        category: { select: { id: true, name: true } },
      },
    }),
    prisma.idea.count({ where }),
  ]);

  return {
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    data: ideas,
  };
};
