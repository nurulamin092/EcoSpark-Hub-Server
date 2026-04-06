// src/app/modules/admin/admin.service.ts

/* eslint-disable @typescript-eslint/no-explicit-any */

import status from "http-status";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import {
  UserStatus,
  IdeaStatus,
  PaymentStatus,
} from "../../../generated/prisma/enums";
import { IRequestUser } from "../../interface/requestUser.interface";

import {
  IUpdateAdminPayload,
  IUpdateMemberPayload,
  IExportOptions,
} from "./admin.interface";
import { AuditLogService } from "../auditLog/auditLog.service";
import { pagination } from "../../utils/paginationHelper";

// ==================== Admin Management ====================

const getAllAdmins = async (query: any) => {
  const { page, limit, skip } = pagination(query);

  const where: any = { isDeleted: false };

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      {
        user: {
          email: { contains: query.search, mode: "insensitive" },
        },
      },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.admin.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: true,
      },
    }),
    prisma.admin.count({ where }),
  ]);

  return {
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    data,
  };
};

const getAdminById = async (id: string) => {
  const admin = await prisma.admin.findFirst({
    where: { id, isDeleted: false },
    include: { user: true },
  });

  if (!admin) throw new AppError(status.NOT_FOUND, "Admin not found");

  return admin;
};

const updateAdmin = async (
  id: string,
  payload: IUpdateAdminPayload,
  meta?: { userId?: string; ip?: string; userAgent?: string },
) => {
  const adminExist = await prisma.admin.findUnique({ where: { id } });

  if (!adminExist || adminExist.isDeleted) {
    throw new AppError(status.NOT_FOUND, "Admin not found");
  }

  const updatedAdmin = await prisma.admin.update({
    where: { id },
    data: {
      ...(payload?.admin ?? {}),
    },
  });

  await AuditLogService.createAuditLog({
    userId: meta?.userId,
    action: "UPDATE",
    entity: "ADMIN",
    entityId: id,
    oldValue: adminExist,
    newValue: updatedAdmin,
    ipAddress: meta?.ip,
    userAgent: meta?.userAgent,
  });

  return updatedAdmin;
};

const deleteAdmin = async (id: string, user: IRequestUser) => {
  const admin = await prisma.admin.findUnique({ where: { id } });

  if (!admin || admin.isDeleted) {
    throw new AppError(status.NOT_FOUND, "Admin not found");
  }

  if (admin.userId === user.userId) {
    throw new AppError(status.BAD_REQUEST, "You cannot delete yourself");
  }

  return prisma.$transaction(async (tx) => {
    const deletedAdmin = await tx.admin.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    await tx.user.update({
      where: { id: admin.userId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        status: UserStatus.DELETED,
      },
    });

    await tx.session.deleteMany({ where: { userId: admin.userId } });
    await tx.account.deleteMany({ where: { userId: admin.userId } });

    await AuditLogService.createAuditLog(
      {
        userId: user.userId,
        action: "DELETE",
        entity: "ADMIN",
        entityId: id,
        oldValue: admin,
        newValue: deletedAdmin,
      },
      tx,
    );

    return deletedAdmin;
  });
};
// ==================== Member Management ====================

const getAllMembers = async (query: any) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const search = query.search || "";
  const status = query.status as UserStatus | undefined;

  const skip = (page - 1) * limit;

  const where: any = {
    isDeleted: false,
    user: {},
  };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { user: { email: { contains: search, mode: "insensitive" } } },
    ];
  }

  if (status) {
    where.user.status = status;
  }

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
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    data: members,
  };
};
const getMemberById = async (memberId: string) => {
  const member = await prisma.member.findFirst({
    where: {
      id: memberId,
      isDeleted: false,
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

      prisma.vote.count({
        where: { userId },
      }),

      prisma.comment.count({
        where: { userId, isDeleted: false },
      }),

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
const updateMember = async (
  memberId: string,
  payload: IUpdateMemberPayload,
  meta?: { userId?: string; ip?: string; userAgent?: string; bio?: string },
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
const deleteMember = async (memberId: string, adminUser: IRequestUser) => {
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
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    await tx.user.update({
      where: { id: member.userId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        status: UserStatus.DELETED,
      },
    });

    await tx.session.deleteMany({
      where: { userId: member.userId },
    });

    await tx.account.deleteMany({
      where: { userId: member.userId },
    });

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

const activateMember = async (memberId: string) => {
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
      data: {
        status: UserStatus.ACTIVE,
      },
    });

    return tx.member.update({
      where: { id: memberId },
      data: {
        isDeleted: false,
        deletedAt: null,
      },
    });
  });
};

const deactivateMember = async (memberId: string) => {
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
      data: {
        status: UserStatus.BLOCKED,
      },
    });

    await tx.session.deleteMany({
      where: { userId: member.userId },
    });

    return member;
  });
};

// ==================== Bulk Operations ====================

const bulkApproveIdeas = async (adminId: string, ideaIds: string[]) => {
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
const bulkRejectIdeas = async (
  adminId: string,
  ideaIds: string[],
  feedback: string,
) => {
  if (!feedback) {
    throw new AppError(status.BAD_REQUEST, "Feedback required");
  }

  return prisma.$transaction(async (tx) => {
    const ideas = await tx.idea.findMany({
      where: {
        id: { in: ideaIds },
        status: IdeaStatus.UNDER_REVIEW,
      },
    });

    const updated = await tx.idea.updateMany({
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

    return updated;
  });
};
const bulkActivateMembers = async (memberIds: string[]) => {
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
      where: {
        id: { in: userIds },
      },
      data: {
        status: UserStatus.ACTIVE,
      },
    });

    return tx.member.updateMany({
      where: { id: { in: memberIds } },
      data: {
        isDeleted: false,
        deletedAt: null,
      },
    });
  });
};
const bulkDeactivateMembers = async (memberIds: string[]) => {
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
      where: {
        id: { in: userIds },
      },
      data: {
        status: UserStatus.BLOCKED,
      },
    });

    await tx.session.deleteMany({
      where: {
        userId: { in: userIds },
      },
    });

    return tx.member.updateMany({
      where: { id: { in: memberIds } },
      data: {
        isDeleted: false,
      },
    });
  });
};

// ==================== Dashboard Statistics ====================

const getDashboardStats = async () => {
  const [
    totalUsers,
    totalIdeas,
    approvedIdeas,
    pendingIdeas,
    rejectedIdeas,
    totalReports,
    totalRevenue,
  ] = await Promise.all([
    prisma.user.count({ where: { isDeleted: false } }),
    prisma.idea.count({ where: { isDeleted: false } }),
    prisma.idea.count({
      where: { status: IdeaStatus.APPROVED, isDeleted: false },
    }),
    prisma.idea.count({
      where: { status: IdeaStatus.UNDER_REVIEW, isDeleted: false },
    }),
    prisma.idea.count({
      where: { status: IdeaStatus.REJECTED, isDeleted: false },
    }),
    prisma.report.count(),
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: { status: PaymentStatus.SUCCESS },
    }),
  ]);

  return {
    users: totalUsers,
    ideas: totalIdeas,
    ideaStatus: {
      approved: approvedIdeas,
      pending: pendingIdeas,
      rejected: rejectedIdeas,
    },
    reports: totalReports,
    revenue: totalRevenue._sum.amount ?? 0,
  };
};

const getGrowthAnalytics = async () => {
  const ideas = await prisma.$queryRaw`
    SELECT DATE("createdAt") as date, COUNT(*)::int as count
    FROM ideas
    WHERE "createdAt" >= NOW() - INTERVAL '30 days'
    GROUP BY DATE("createdAt")
    ORDER BY date ASC
  `;

  const revenue = await prisma.$queryRaw`
    SELECT DATE("createdAt") as date, SUM(amount)::float as total
    FROM payments
    WHERE status = 'SUCCESS' AND "createdAt" >= NOW() - INTERVAL '30 days'
    GROUP BY DATE("createdAt")
    ORDER BY date ASC
  `;

  return {
    ideas,
    revenue,
  };
};

const getTopIdeas = async () => {
  return prisma.idea.findMany({
    where: {
      status: IdeaStatus.APPROVED,
      isDeleted: false,
    },
    orderBy: {
      upvoteCount: "desc",
    },
    take: 10,
    select: {
      id: true,
      title: true,
      upvoteCount: true,
      viewCount: true,
      author: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });
};

const getRecentReports = async () => {
  return prisma.report.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      reporter: {
        select: {
          name: true,
          email: true,
        },
      },
      idea: {
        select: {
          id: true,
          title: true,
        },
      },
      comment: {
        select: {
          id: true,
          content: true,
        },
      },
    },
  });
};

const getPendingIdeas = async () => {
  return prisma.idea.findMany({
    where: {
      status: IdeaStatus.UNDER_REVIEW,
      isDeleted: false,
    },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      category: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
};

const getRecentActivities = async () => {
  return prisma.activity.findMany({
    take: 20,
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
};

const getMemberGrowthStats = async () => {
  const last7Days = await prisma.$queryRaw`
    SELECT 
      DATE("createdAt") as date,
      COUNT(*)::int as count
    FROM users
    WHERE "createdAt" >= NOW() - INTERVAL '7 days'
    GROUP BY DATE("createdAt")
    ORDER BY date ASC
  `;

  const totalActive = await prisma.user.count({
    where: { status: UserStatus.ACTIVE, isDeleted: false },
  });

  const totalBlocked = await prisma.user.count({
    where: { status: UserStatus.BLOCKED, isDeleted: false },
  });

  return {
    last7Days,
    totalActive,
    totalBlocked,
  };
};

const getCategoryStatistics = async () => {
  const [categories, ideaCounts] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        color: true,
        icon: true,
      },
    }),

    prisma.idea.groupBy({
      by: ["categoryId"],
      where: {
        status: IdeaStatus.APPROVED,
        isDeleted: false,
      },
      _count: {
        _all: true,
      },
    }),
  ]);

  const countMap = new Map(
    ideaCounts.map((item) => [item.categoryId, item._count._all]),
  );

  return categories.map((category) => ({
    ...category,
    ideaCount: countMap.get(category.id) || 0,
  }));
};

const getSystemHealth = async () => {
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [activeUsers24h, newIdeas24h, activeSessions] = await Promise.all([
    prisma.user.count({
      where: {
        updatedAt: { gte: last24h },
        status: UserStatus.ACTIVE,
        isDeleted: false,
      },
    }),
    prisma.idea.count({
      where: {
        createdAt: { gte: last24h },
        isDeleted: false,
      },
    }),
    prisma.session.count({
      where: {
        expiresAt: { gt: now },
      },
    }),
  ]);

  return {
    activeUsers24h,
    newIdeas24h,
    activeSessions,
    timestamp: now,
  };
};

const getAllIdeasForAdmin = async (query: any) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const status = query.status as IdeaStatus | undefined;
  const search = query.search || "";

  const skip = (page - 1) * limit;

  const where: any = {
    isDeleted: false,
  };

  if (status) {
    where.status = status;
  }

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
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
    prisma.idea.count({ where }),
  ]);

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    data: ideas,
  };
};

const getFullDashboard = async () => {
  const [
    stats,
    analytics,
    topIdeas,
    reports,
    pendingIdeas,
    recentActivities,
    memberGrowth,
    categoryStats,
    systemHealth,
  ] = await Promise.all([
    getDashboardStats(),
    getGrowthAnalytics(),
    getTopIdeas(),
    getRecentReports(),
    getPendingIdeas(),
    getRecentActivities(),
    getMemberGrowthStats(),
    getCategoryStatistics(),
    getSystemHealth(),
  ]);

  return {
    stats,
    analytics,
    topIdeas,
    reports,
    pendingIdeas,
    recentActivities,
    memberGrowth,
    categoryStats,
    systemHealth,
  };
};

// ==================== Export Functionality ====================

const exportUsers = async (options: IExportOptions) => {
  const where: any = { isDeleted: false };

  const users = await prisma.user.findMany({
    where,
    include: { member: true, admin: true },
  });

  if (options.format === "json") return users;

  return users.map((u) => ({
    Name: u.name,
    Email: u.email,
    Role: u.role,
    Status: u.status,
  }));
};
const exportIdeas = async (options: IExportOptions) => {
  const where: any = { isDeleted: false };

  if (options.startDate && options.endDate) {
    where.createdAt = {
      gte: new Date(options.startDate),
      lte: new Date(options.endDate),
    };
  }

  const ideas = await prisma.idea.findMany({
    where,
    include: {
      author: {
        select: { name: true, email: true },
      },
      category: {
        select: { name: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (options.format === "json") {
    return ideas;
  }

  const csvData = ideas.map((idea) => ({
    Title: idea.title,
    Category: idea.category.name,
    Author: idea.author.name,
    "Author Email": idea.author.email,
    Status: idea.status,
    Upvotes: idea.upvoteCount,
    Downvotes: idea.downvoteCount,
    Views: idea.viewCount,
    Comments: idea.commentCount,
    "Is Paid": idea.isPaid ? "Yes" : "No",
    Price: idea.price || "Free",
    "Created At": idea.createdAt.toISOString(),
    "Published At": idea.publishedAt?.toISOString() || "Not Published",
  }));

  return csvData;
};

// ==================== Exports ====================

export const AdminService = {
  // Admin Management
  getAllAdmins,
  getAdminById,
  updateAdmin,
  deleteAdmin,

  // Member Management
  getAllMembers,
  getMemberById,
  updateMember,
  deleteMember,
  activateMember,
  deactivateMember,

  // Bulk Operations
  bulkApproveIdeas,
  bulkRejectIdeas,
  bulkActivateMembers,
  bulkDeactivateMembers,

  // Dashboard
  getFullDashboard,
  getAllIdeasForAdmin,

  // Export
  exportUsers,
  exportIdeas,
};
