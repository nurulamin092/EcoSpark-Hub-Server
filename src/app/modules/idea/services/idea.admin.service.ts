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

/**
 * Reject an idea with feedback (admin only)
 */
export const rejectIdea = async (
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
