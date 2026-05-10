// src/app/modules/admin/services/member.management.service.ts

/* eslint-disable @typescript-eslint/no-explicit-any */

import { prisma } from "../../../lib/prisma";
import {
  UserStatus,
  NotificationType,
} from "../../../../generated/prisma/enums";
import AppError from "../../../errorHelpers/AppError";
import status from "http-status";
import { NotificationService } from "../../notification/notification.service";
import { AuditLogService } from "../../auditLog/auditLog.service";
import {
  IMember,
  IUpdateMemberDTO,
  IMemberFilters,
  IPaginatedResponse,
  IMemberAuditContext,
  IMemberBulkAction,
  IBulkActionResult,
  IMemberStats,
  IMemberWithDetails,
  IRecentIdea,
  IRecentActivity,
  DEFAULT_PAGINATION,
} from "../admin.interface";

/**
 * Build dynamic where clause for member filtering
 */
const buildMemberWhereClause = (filters: IMemberFilters) => {
  const where: any = {
    isDeleted: filters.isDeleted === undefined ? false : filters.isDeleted,
  };

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { user: { email: { contains: filters.search, mode: "insensitive" } } },
      { contactNumber: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  if (filters.status) {
    where.user = { status: filters.status };
  }

  if (filters.role) {
    where.user = { ...(where.user || {}), role: filters.role };
  }

  if (filters.fromDate || filters.toDate) {
    where.createdAt = {};
    if (filters.fromDate) where.createdAt.gte = filters.fromDate;
    if (filters.toDate) where.createdAt.lte = filters.toDate;
  }

  return where;
};

/**
 * Build sort configuration
 */
const buildSortConfig = (sortBy?: string, sortOrder?: "asc" | "desc") => {
  const order = sortOrder || DEFAULT_PAGINATION.SORT_ORDER;

  if (!sortBy || sortBy === "createdAt") {
    return { createdAt: order };
  }

  if (sortBy === "name") {
    return { name: order };
  }

  if (sortBy === "email") {
    return { user: { email: order } };
  }

  if (sortBy === "status") {
    return { user: { status: order } };
  }

  if (sortBy === "updatedAt") {
    return { updatedAt: order };
  }

  return { [sortBy]: order };
};

/**
 * Get all members with advanced filtering and pagination
 */
export const getAllMembers = async (
  filters: IMemberFilters,
): Promise<IPaginatedResponse<IMember>> => {
  const page = Math.max(1, filters.page || DEFAULT_PAGINATION.PAGE);
  const limit = Math.min(
    filters.limit || DEFAULT_PAGINATION.LIMIT,
    DEFAULT_PAGINATION.MAX_LIMIT,
  );
  const skip = (page - 1) * limit;

  const where = buildMemberWhereClause(filters);
  const orderBy = buildSortConfig(filters.sortBy, filters.sortOrder);

  // Execute parallel queries for performance
  const [members, total] = await Promise.all([
    prisma.member.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            status: true,
            emailVerified: true,
            needPasswordChange: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    }),
    prisma.member.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    data: members as IMember[],
    meta: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};

/**
 * Get member by ID with comprehensive details
 */
export const getMemberById = async (
  memberId: string,
): Promise<IMemberWithDetails> => {
  if (!memberId) {
    throw new AppError(status.BAD_REQUEST, "Member ID is required");
  }

  const member = await prisma.member.findFirst({
    where: { id: memberId, isDeleted: false },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          emailVerified: true,
          needPasswordChange: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!member) {
    throw new AppError(status.NOT_FOUND, "Member not found");
  }

  const userId = member.userId;

  // Parallel data fetching for performance
  const [
    ideaStats,
    voteCount,
    commentCount,
    paymentCount,
    bookmarkCount,
    reportCount,
    recentIdeas,
    recentActivities,
  ] = await Promise.all([
    prisma.idea.aggregate({
      where: { authorId: userId, isDeleted: false },
      _count: { _all: true },
    }),
    prisma.vote.count({ where: { userId } }),
    prisma.comment.count({ where: { userId, isDeleted: false } }),
    prisma.payment.count({ where: { userId } }),
    prisma.bookmark.count({ where: { userId } }),
    prisma.report.count({ where: { reporterId: userId } }),
    prisma.idea.findMany({
      where: { authorId: userId, isDeleted: false },
      take: 10,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        status: true,
        upvoteCount: true,
        viewCount: true,
        createdAt: true,
      },
    }),
    prisma.activity.findMany({
      where: { userId },
      take: 10,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        action: true,
        entity: true,
        entityId: true,
        createdAt: true,
      },
    }),
  ]);

  const stats: IMemberStats = {
    totalIdeas: ideaStats._count._all,
    totalVotes: voteCount,
    totalComments: commentCount,
    totalPayments: paymentCount,
    totalBookmarks: bookmarkCount,
    totalReports: reportCount,
  };

  return {
    ...member,
    stats,
    recentIdeas: recentIdeas as IRecentIdea[],
    recentActivities: recentActivities as IRecentActivity[],
  } as IMemberWithDetails;
};

/**
 * Update member information
 */
export const updateMember = async (
  memberId: string,
  payload: IUpdateMemberDTO,
  context: IMemberAuditContext,
): Promise<IMember> => {
  const existingMember = await prisma.member.findFirst({
    where: { id: memberId, isDeleted: false },
    include: { user: true },
  });

  if (!existingMember) {
    throw new AppError(status.NOT_FOUND, "Member not found");
  }

  const updatedMember = await prisma.$transaction(async (tx) => {
    const member = await tx.member.update({
      where: { id: memberId },
      data: {
        name: payload.name,
        profilePhoto: payload.profilePhoto,
        contactNumber: payload.contactNumber,
        address: payload.address,
        bio: payload.bio,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            status: true,
            emailVerified: true,
            needPasswordChange: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (payload.status && payload.status !== existingMember.user.status) {
      await tx.user.update({
        where: { id: existingMember.userId },
        data: { status: payload.status },
      });

      NotificationService.createNotification(
        existingMember.userId,
        "ACCOUNT_STATUS_CHANGED" as NotificationType,
        "Account Status Updated",
        `Your account status has been updated to ${payload.status}`,
        { memberId, status: payload.status },
      ).catch(() => {});
    }

    await AuditLogService.createAuditLog({
      userId: context.userId,
      action: "UPDATE_MEMBER",
      entity: "MEMBER",
      entityId: memberId,
      oldValue: {
        name: existingMember.name,
        status: existingMember.user.status,
      },
      newValue: {
        name: member.name,
        status: payload.status || existingMember.user.status,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: context.metadata,
    });

    return member;
  });

  return updatedMember as IMember;
};

/**
 * Delete member (soft delete)
 */
export const deleteMember = async (
  memberId: string,
  context: IMemberAuditContext,
): Promise<{ id: string; deletedAt: Date }> => {
  const member = await prisma.member.findFirst({
    where: { id: memberId, isDeleted: false },
    include: { user: true },
  });

  if (!member) {
    throw new AppError(status.NOT_FOUND, "Member not found");
  }

  if (member.userId === context.userId) {
    throw new AppError(status.BAD_REQUEST, "You cannot delete yourself");
  }

  const result = await prisma.$transaction(async (tx) => {
    const deletedMember = await tx.member.update({
      where: { id: memberId },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    await tx.user.update({
      where: { id: member.userId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        status: UserStatus.DELETED,
        email: `deleted_${Date.now()}_${member.user.email}`,
      },
    });

    return deletedMember;
  });

  return { id: result.id, deletedAt: result.deletedAt! };
};

/**
 * Activate member account
 */

/**
 * Activate member account
 */
export const activateMember = async (
  memberId: string,
  context: IMemberAuditContext,
): Promise<IMember> => {
  const member = await prisma.member.findFirst({
    where: { id: memberId, isDeleted: false },
    include: { user: true },
  });

  if (!member) {
    throw new AppError(status.NOT_FOUND, "Member not found");
  }

  if (member.user.status === UserStatus.ACTIVE) {
    throw new AppError(status.BAD_REQUEST, "Member is already active");
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedUser = await tx.user.update({
      where: { id: member.userId },
      data: { status: UserStatus.ACTIVE },
    });

    const updatedMember = await tx.member.update({
      where: { id: memberId },
      data: { updatedAt: new Date() },
    });

    // Log the activation action to audit log
    await AuditLogService.createAuditLog({
      userId: context.userId,
      action: "ACTIVATE_MEMBER",
      entity: "MEMBER",
      entityId: memberId,
      oldValue: { status: member.user.status },
      newValue: { status: UserStatus.ACTIVE },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: context.metadata,
    });

    return { updatedMember, updatedUser };
  });

  return {
    ...result.updatedMember,
    user: result.updatedUser,
  } as IMember;
};
/**
 * Deactivate member account
 */

export const deactivateMember = async (
  memberId: string,
  reason: string,
  context: IMemberAuditContext,
): Promise<IMember> => {
  if (!reason || reason.trim().length === 0) {
    throw new AppError(
      status.BAD_REQUEST,
      "Reason is required for deactivation",
    );
  }

  const member = await prisma.member.findFirst({
    where: { id: memberId, isDeleted: false },
    include: { user: true },
  });

  if (!member) {
    throw new AppError(status.NOT_FOUND, "Member not found");
  }

  if (member.user.status === UserStatus.BLOCKED) {
    throw new AppError(status.BAD_REQUEST, "Member is already blocked");
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedUser = await tx.user.update({
      where: { id: member.userId },
      data: { status: UserStatus.BLOCKED },
    });

    await tx.session.deleteMany({ where: { userId: member.userId } });

    const updatedMember = await tx.member.update({
      where: { id: memberId },
      data: { updatedAt: new Date() },
    });

    await AuditLogService.createAuditLog({
      userId: context.userId,
      action: "DEACTIVATE_MEMBER",
      entity: "MEMBER",
      entityId: memberId,
      oldValue: {
        status: member.user.status,
        reason: null,
      },
      newValue: {
        status: UserStatus.BLOCKED,
        reason: reason,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: {
        ...context.metadata,
        deactivationReason: reason,
      },
    });

    return { updatedMember, updatedUser };
  });

  await NotificationService.createNotification(
    member.userId,
    "ACCOUNT_DEACTIVATED" as NotificationType,
    "Account Deactivated",
    `Your account has been deactivated. Reason: ${reason}`,
    {
      memberId,
      deactivatedBy: context.userId,
      reason: reason,
    },
  ).catch(() => {});

  return {
    ...result.updatedMember,
    user: result.updatedUser,
  } as IMember;
};
/**
 * Bulk operations on members
 */
export const bulkMemberAction = async (
  actionData: IMemberBulkAction,
  context: IMemberAuditContext,
): Promise<IBulkActionResult> => {
  const { ids, action } = actionData;
  const results: IBulkActionResult = { success: 0, failed: 0, errors: [] };

  for (const id of ids) {
    try {
      switch (action) {
        case "activate":
          await activateMember(id, context);
          break;
        case "deactivate":
          await deactivateMember(id, "Bulk deactivation by admin", context);
          break;
        case "delete":
          await deleteMember(id, context);
          break;
        case "export":
          // Export logic here
          break;
      }
      results.success++;
    } catch (error) {
      results.failed++;
      results.errors.push({
        id,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return results;
};
