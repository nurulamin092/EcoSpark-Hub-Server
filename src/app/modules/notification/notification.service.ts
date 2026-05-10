/* eslint-disable @typescript-eslint/no-explicit-any */

import { prisma } from "../../lib/prisma";
import { NotificationType } from "../../../generated/prisma/enums";
import AppError from "../../errorHelpers/AppError";
import status from "http-status";

export { NotificationType };

const createNotification = async (
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  data?: any,
) => {
  if (!userId) {
    throw new AppError(status.BAD_REQUEST, "User ID is required");
  }

  return prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      data: data ?? undefined,
    },
  });
};

const getMyNotifications = async (userId: string) => {
  if (!userId) {
    throw new AppError(status.BAD_REQUEST, "User ID is required");
  }

  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
};

const markAsRead = async (userId: string, notificationId: string) => {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification || notification.userId !== userId) {
    throw new AppError(status.NOT_FOUND, "Notification not found");
  }

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
