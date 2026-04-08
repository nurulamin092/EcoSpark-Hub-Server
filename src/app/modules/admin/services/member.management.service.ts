/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file member.management.service.ts
 * @description Member CRUD operations
 * @version 1.0.0
 */

import status from "http-status";
import AppError from "../../../errorHelpers/AppError";
import { prisma } from "../../../lib/prisma";
import { IRequestUser } from "../../../interface/requestUser.interface";
import { IUpdateMemberPayload } from "../admin.interface";
import { AuditLogService } from "../../auditLog/auditLog.service";
import {
  buildMemberWhereClause,
  getPaginationMeta,
} from "../utils/admin.helpers";
import { UserStatus, PaymentStatus } from "../../../../generated/prisma/enums";

/**
 * Get all members with pagination and filters
 */
export const getAllMembers = async (query: any) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;
  const where = buildMemberWhereClause(query);

  const [members, total] = await Promise.all([
    prisma.member.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            status: true,
          },
        },
      },
    }),
    prisma.member.count({ where }),
  ]);

  return {
    meta: getPaginationMeta(page, limit, total),
    data: members,
  };
};

/**
 * Get single member by ID with statistics
 */
export const getMemberById = async (memberId: string) => {
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

  const [ideaStats, voteCount, commentCount, paymentCount, recentIdeas] =
    await Promise.all([
      prisma.idea.aggregate({
        where: { authorId: userId, isDeleted: false },
        _count: { _all: true },
      }),
      prisma.vote.count({ where: { userId } }),
      prisma.comment.count({ where: { userId, isDeleted: false } }),
      prisma.payment.count({
        where: { userId, status: PaymentStatus.SUCCESS },
      }),
      prisma.idea.findMany({
        where: { authorId: userId, isDeleted: false },
        take: 5,
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
    ]);

  return {
    ...member,
    stats: {
      totalIdeas: ideaStats._count._all,
      totalVotes: voteCount,
      totalComments: commentCount,
      totalPayments: paymentCount,
    },
    recentIdeas,
  };
};

/**
 * Update member information
 */
export const updateMember = async (
  memberId: string,
  payload: IUpdateMemberPayload,
  meta?: { userId?: string; ip?: string; userAgent?: string },
) => {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: { user: true },
  });

  if (!member || member.isDeleted) {
    throw new AppError(status.NOT_FOUND, "Member not found");
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.member.update({
      where: { id: memberId },
      data: {
        name: payload.name,
        profilePhoto: payload.profilePhoto,
        contactNumber: payload.contactNumber,
        address: payload.address,
        bio: payload.bio,
      },
    });

    if (payload.email || payload.status || payload.role) {
      await tx.user.update({
        where: { id: member.userId },
        data: {
          ...(payload.email && { email: payload.email }),
          ...(payload.status && { status: payload.status }),
          ...(payload.role && { role: payload.role }),
        },
      });
    }

    await AuditLogService.createAuditLog(
      {
        userId: meta?.userId,
        action: "UPDATE",
        entity: "MEMBER",
        entityId: memberId,
        oldValue: member,
        newValue: updated,
        ipAddress: meta?.ip,
        userAgent: meta?.userAgent,
      },
      tx,
    );

    return updated;
  });
};

/**
 * Delete member (soft delete)
 */
export const deleteMember = async (
  memberId: string,
  adminUser: IRequestUser,
) => {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: { user: true },
  });

  if (!member || member.isDeleted) {
    throw new AppError(status.NOT_FOUND, "Member not found");
  }

  if (member.userId === adminUser.userId) {
    throw new AppError(status.BAD_REQUEST, "You cannot delete yourself");
  }

  return prisma.$transaction(async (tx) => {
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
      },
    });

    await tx.session.deleteMany({ where: { userId: member.userId } });
    await tx.account.deleteMany({ where: { userId: member.userId } });

    await AuditLogService.createAuditLog(
      {
        userId: adminUser.userId,
        action: "DELETE",
        entity: "MEMBER",
        entityId: memberId,
        oldValue: member,
        newValue: deletedMember,
      },
      tx,
    );

    return deletedMember;
  });
};

/**
 * Activate member
 */
export const activateMember = async (memberId: string) => {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: { user: true },
  });

  if (!member || member.isDeleted) {
    throw new AppError(status.NOT_FOUND, "Member not found");
  }

  return prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: member.userId },
      data: { status: UserStatus.ACTIVE },
    });

    return tx.member.update({
      where: { id: memberId },
      data: { isDeleted: false, deletedAt: null },
    });
  });
};

/**
 * Deactivate member (block)
 */
export const deactivateMember = async (memberId: string) => {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: { user: true },
  });

  if (!member || member.isDeleted) {
    throw new AppError(status.NOT_FOUND, "Member not found");
  }

  return prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: member.userId },
      data: { status: UserStatus.BLOCKED },
    });

    await tx.session.deleteMany({ where: { userId: member.userId } });

    return member;
  });
};
