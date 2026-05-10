/**
 * @file dashboard.service.ts
 * @description Dashboard statistics for Admin module
 * @version 1.0.0
 */

import { prisma } from "../../../lib/prisma";
import {
  IdeaStatus,
  PaymentStatus,
  UserStatus,
} from "../../../../generated/prisma/enums";

/**
 * Get dashboard statistics
 */
export const getDashboardStats = async () => {
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

/**
 * Get growth analytics (30 days)
 */
export const getGrowthAnalytics = async () => {
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

  return { ideas, revenue };
};

/**
 * Get top 10 ideas by votes
 */
export const getTopIdeas = async () => {
  return prisma.idea.findMany({
    where: { status: IdeaStatus.APPROVED, isDeleted: false },
    orderBy: { upvoteCount: "desc" },
    take: 10,
    select: {
      id: true,
      title: true,
      upvoteCount: true,
      viewCount: true,
      author: { select: { name: true, email: true } },
    },
  });
};

/**
 * Get recent reports
 */
export const getRecentReports = async () => {
  return prisma.report.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      reporter: { select: { name: true, email: true } },
      idea: { select: { id: true, title: true } },
      comment: { select: { id: true, content: true } },
    },
  });
};

/**
 * Get pending ideas for admin review
 */
export const getPendingIdeas = async () => {
  return prisma.idea.findMany({
    where: { status: IdeaStatus.UNDER_REVIEW, isDeleted: false },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      author: { select: { id: true, name: true, email: true } },
      category: { select: { id: true, name: true } },
    },
  });
};

/**
 * Get recent activities
 */
export const getRecentActivities = async () => {
  return prisma.activity.findMany({
    take: 20,
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });
};

/**
 * Get member growth statistics
 */
export const getMemberGrowthStats = async () => {
  const last7Days = await prisma.$queryRaw`
    SELECT DATE("createdAt") as date, COUNT(*)::int as count
    FROM users
    WHERE "createdAt" >= NOW() - INTERVAL '7 days'
    GROUP BY DATE("createdAt")
    ORDER BY date ASC
  `;

  const [totalActive, totalBlocked] = await Promise.all([
    prisma.user.count({
      where: { status: UserStatus.ACTIVE, isDeleted: false },
    }),
    prisma.user.count({
      where: { status: UserStatus.BLOCKED, isDeleted: false },
    }),
  ]);

  return { last7Days, totalActive, totalBlocked };
};

/**
 * Get category statistics
 */
export const getCategoryStatistics = async () => {
  const [categories, ideaCounts] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true, color: true, icon: true },
    }),
    prisma.idea.groupBy({
      by: ["categoryId"],
      where: { status: IdeaStatus.APPROVED, isDeleted: false },
      _count: { _all: true },
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

/**
 * Get system health metrics
 */
export const getSystemHealth = async () => {
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
      where: { createdAt: { gte: last24h }, isDeleted: false },
    }),
    prisma.session.count({ where: { expiresAt: { gt: now } } }),
  ]);

  return { activeUsers24h, newIdeas24h, activeSessions, timestamp: now };
};

/**
 * Get full dashboard data
 */
export const getFullDashboard = async () => {
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
