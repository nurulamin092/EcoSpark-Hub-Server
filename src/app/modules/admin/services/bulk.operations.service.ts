/**
 * @file bulk.operations.service.ts
 * @description Bulk operations for Admin module
 * @version 1.0.0
 */

import status from "http-status";
import AppError from "../../../errorHelpers/AppError";
import { prisma } from "../../../lib/prisma";
import { AuditLogService } from "../../auditLog/auditLog.service";
import { IdeaStatus, UserStatus } from "../../../../generated/prisma/enums";

/**
 * Bulk approve ideas
 */
export const bulkApproveIdeas = async (adminId: string, ideaIds: string[]) => {
  if (!ideaIds?.length) {
    throw new AppError(status.BAD_REQUEST, "No idea IDs provided");
  }

  return prisma.$transaction(async (tx) => {
    const ideas = await tx.idea.findMany({
      where: { id: { in: ideaIds }, status: IdeaStatus.UNDER_REVIEW },
    });

    if (ideas.length !== ideaIds.length) {
      throw new AppError(status.BAD_REQUEST, "Invalid ideas");
    }

    await tx.idea.updateMany({
      where: { id: { in: ideaIds } },
      data: {
        status: IdeaStatus.APPROVED,
        reviewedByUserId: adminId,
        reviewedAt: new Date(),
      },
    });

    await AuditLogService.createAuditLog(
      {
        userId: adminId,
        action: "BULK_APPROVE",
        entity: "IDEA",
        entityId: ideaIds.join(","),
        oldValue: ideas,
        newValue: { status: "APPROVED" },
      },
      tx,
    );

    return { count: ideaIds.length };
  });
};

/**
 * Bulk reject ideas with feedback
 */
export const bulkRejectIdeas = async (
  adminId: string,
  ideaIds: string[],
  feedback: string,
) => {
  if (!feedback) {
    throw new AppError(status.BAD_REQUEST, "Feedback required");
  }

  return prisma.$transaction(async (tx) => {
    const ideas = await tx.idea.findMany({
      where: { id: { in: ideaIds }, status: IdeaStatus.UNDER_REVIEW },
    });

    await tx.idea.updateMany({
      where: { id: { in: ideaIds } },
      data: {
        status: IdeaStatus.REJECTED,
        reviewedByUserId: adminId,
        reviewedAt: new Date(),
        adminFeedback: feedback,
      },
    });

    await AuditLogService.createAuditLog(
      {
        userId: adminId,
        action: "BULK_REJECT",
        entity: "IDEA",
        entityId: ideaIds.join(","),
        oldValue: ideas,
        newValue: { status: "REJECTED" },
      },
      tx,
    );

    return { count: ideaIds.length };
  });
};

/**
 * Bulk activate members
 */
export const bulkActivateMembers = async (memberIds: string[]) => {
  if (!memberIds?.length) {
    throw new AppError(status.BAD_REQUEST, "No member IDs provided");
  }

  return prisma.$transaction(async (tx) => {
    const members = await tx.member.findMany({
      where: { id: { in: memberIds } },
      select: { userId: true },
    });

    if (members.length !== memberIds.length) {
      throw new AppError(status.BAD_REQUEST, "Invalid member IDs");
    }

    const userIds = members.map((m) => m.userId);

    await tx.user.updateMany({
      where: { id: { in: userIds } },
      data: { status: UserStatus.ACTIVE },
    });

    return tx.member.updateMany({
      where: { id: { in: memberIds } },
      data: { isDeleted: false, deletedAt: null },
    });
  });
};

/**
 * Bulk deactivate members
 */
export const bulkDeactivateMembers = async (memberIds: string[]) => {
  if (!memberIds?.length) {
    throw new AppError(status.BAD_REQUEST, "No member IDs provided");
  }

  return prisma.$transaction(async (tx) => {
    const members = await tx.member.findMany({
      where: { id: { in: memberIds } },
      select: { userId: true },
    });

    if (members.length !== memberIds.length) {
      throw new AppError(status.BAD_REQUEST, "Invalid member IDs");
    }

    const userIds = members.map((m) => m.userId);

    await tx.user.updateMany({
      where: { id: { in: userIds } },
      data: { status: UserStatus.BLOCKED },
    });

    await tx.session.deleteMany({
      where: { userId: { in: userIds } },
    });

    return tx.member.updateMany({
      where: { id: { in: memberIds } },
      data: { isDeleted: false },
    });
  });
};
