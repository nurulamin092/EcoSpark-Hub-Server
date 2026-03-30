/* eslint-disable @typescript-eslint/no-explicit-any */

import status from "http-status";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { UserStatus } from "../../../generated/prisma/enums";
import { IRequestUser } from "../../interface/requestUser.interface";

const getAllAdmins = async (query: any) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;

  const skip = (page - 1) * limit;

  const [admins, total] = await Promise.all([
    prisma.admin.findMany({
      where: { isDeleted: false },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { user: true },
    }),

    prisma.admin.count({
      where: { isDeleted: false },
    }),
  ]);

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    data: admins,
  };
};

const getAdminById = async (id: string) => {
  const admin = await prisma.admin.findFirst({
    where: {
      id,
      isDeleted: false,
    },
    include: {
      user: true,
    },
  });

  if (!admin) {
    throw new AppError(status.NOT_FOUND, "Admin not found");
  }

  return admin;
};

const updateAdmin = async (id: string, payload: any) => {
  const adminExist = await prisma.admin.findUnique({
    where: { id },
  });

  if (!adminExist || adminExist.isDeleted) {
    throw new AppError(status.NOT_FOUND, "Admin not found");
  }

  const updatedAdmin = await prisma.admin.update({
    where: { id },
    data: {
      ...payload.admin,
    },
    include: {
      user: true,
    },
  });

  return updatedAdmin;
};

const deleteAdmin = async (id: string, user: IRequestUser) => {
  const admin = await prisma.admin.findUnique({
    where: { id },
  });

  if (!admin || admin.isDeleted) {
    throw new AppError(status.NOT_FOUND, "Admin not found");
  }

  if (admin.userId === user.userId) {
    throw new AppError(status.BAD_REQUEST, "You cannot delete yourself");
  }

  const result = await prisma.$transaction(async (tx) => {
    const deletedAdmin = await tx.admin.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
      include: { user: true },
    });

    await tx.user.update({
      where: { id: admin.userId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        status: UserStatus.DELETED,
      },
    });

    await tx.session.deleteMany({
      where: { userId: admin.userId },
    });

    await tx.account.deleteMany({
      where: { userId: admin.userId },
    });

    return deletedAdmin;
  });

  return result;
};

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
    prisma.user.count(),
    prisma.idea.count({ where: { isDeleted: false } }),
    prisma.idea.count({ where: { status: "APPROVED" } }),
    prisma.idea.count({ where: { status: "UNDER_REVIEW" } }),
    prisma.idea.count({ where: { status: "REJECTED" } }),
    prisma.report.count(),
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: { status: "SUCCESS" },
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

const getTopIdeas = async () => {
  return prisma.idea.findMany({
    where: {
      status: "APPROVED",
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
    },
  });
};

const getRecentReports = async () => {
  return prisma.report.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      reporter: true,
      idea: true,
      comment: true,
    },
  });
};

const getPendingIdeas = async () => {
  return prisma.idea.findMany({
    where: {
      status: "UNDER_REVIEW",
    },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      author: true,
    },
  });
};

const getGrowthAnalytics = async () => {
  const ideas = await prisma.$queryRaw`
    SELECT DATE("createdAt") as date, COUNT(*)::int as count
    FROM ideas
    GROUP BY date
    ORDER BY date ASC
  `;

  const revenue = await prisma.$queryRaw`
    SELECT DATE("createdAt") as date, SUM(amount)::float as total
    FROM payments
    WHERE status = 'SUCCESS'
    GROUP BY date
    ORDER BY date ASC
  `;

  return {
    ideas,
    revenue,
  };
};

const getFullDashboard = async () => {
  const [stats, analytics, topIdeas, reports, pendingIdeas] = await Promise.all(
    [
      getDashboardStats(),
      getGrowthAnalytics(),
      getTopIdeas(),
      getRecentReports(),
      getPendingIdeas(),
    ],
  );

  return {
    stats,
    analytics,
    topIdeas,
    reports,
    pendingIdeas,
  };
};

export const AdminService = {
  getAllAdmins,
  getAdminById,
  updateAdmin,
  deleteAdmin,
  getFullDashboard,
};
