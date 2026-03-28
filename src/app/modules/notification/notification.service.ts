/* eslint-disable @typescript-eslint/no-explicit-any */

import { prisma } from "../../lib/prisma";
import { NotificationType } from "../../../generated/prisma/enums";

const createNotification = async (
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  data?: any,
) => {
  return prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      data,
    },
  });
};

const getMyNotifications = async (userId: string) => {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
};

const markAsRead = async (userId: string, notificationId: string) => {
  return prisma.notification.update({
    where: { id: notificationId },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
};

const markAllAsRead = async (userId: string) => {
  return prisma.notification.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
};

export const NotificationService = {
  createNotification,
  getMyNotifications,
  markAsRead,
  markAllAsRead,
};
