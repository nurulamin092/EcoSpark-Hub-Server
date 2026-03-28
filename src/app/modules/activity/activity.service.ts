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

const getUserActivities = async (userId: string) => {
  return prisma.activity.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
};

export const ActivityService = {
  createActivity,
  getUserActivities,
};
