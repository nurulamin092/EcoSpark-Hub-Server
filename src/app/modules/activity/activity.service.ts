/* eslint-disable @typescript-eslint/no-explicit-any */

import { prisma } from "../../lib/prisma";
import { ActivityType } from "../../../generated/prisma/enums";

const createActivity = async (
  userId: string,
  type: ActivityType,
  data?: any,
) => {
  return prisma.activity.create({
    data: {
      userId,
      type,
      data,
    },
  });
};

const getMyActivities = async (userId: string, query: any) => {
  const { page = 1, limit = 10 } = query;

  const skip = (Number(page) - 1) * Number(limit);

  const activities = await prisma.activity.findMany({
    where: { userId },
    skip,
    take: Number(limit),
    orderBy: { createdAt: "desc" },
  });

  const total = await prisma.activity.count({
    where: { userId },
  });

  return {
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
    },
    data: activities,
  };
};

const getAllActivities = async (query: any) => {
  const { page = 1, limit = 10, type, userId } = query;

  const skip = (Number(page) - 1) * Number(limit);

  const where: any = {};

  if (type) where.type = type;
  if (userId) where.userId = userId;

  const activities = await prisma.activity.findMany({
    where,
    skip,
    take: Number(limit),
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

  const total = await prisma.activity.count({ where });

  return {
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
    },
    data: activities,
  };
};

export const ActivityService = {
  createActivity,
  getMyActivities,
  getAllActivities,
};
