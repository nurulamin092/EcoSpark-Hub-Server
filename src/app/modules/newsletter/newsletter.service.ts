/* eslint-disable @typescript-eslint/no-explicit-any */

import { prisma } from "../../lib/prisma";
import AppError from "../../errorHelpers/AppError";
import status from "http-status";

const subscribe = async (email: string) => {
  if (!email) {
    throw new AppError(status.BAD_REQUEST, "Email is required");
  }

  const existing = await prisma.newsletter.findUnique({
    where: { email },
  });

  if (existing) {
    if (existing.isActive) {
      return existing;
    }

    return prisma.newsletter.update({
      where: { email },
      data: { isActive: true },
    });
  }

  return prisma.newsletter.create({
    data: { email },
  });
};

const unsubscribe = async (email: string) => {
  const existing = await prisma.newsletter.findUnique({
    where: { email },
  });

  if (!existing) {
    throw new AppError(status.NOT_FOUND, "Email not found");
  }

  return prisma.newsletter.update({
    where: { email },
    data: { isActive: false },
  });
};

const getAllSubscribers = async (query: any) => {
  const { page = 1, limit = 10, isActive } = query;

  const skip = (Number(page) - 1) * Number(limit);

  const where: any = {};

  if (isActive !== undefined) {
    where.isActive = isActive === "true";
  }

  const data = await prisma.newsletter.findMany({
    where,
    skip,
    take: Number(limit),
    orderBy: { createdAt: "desc" },
  });

  const total = await prisma.newsletter.count({ where });

  return {
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
    },
    data,
  };
};

export const NewsletterService = {
  subscribe,
  unsubscribe,
  getAllSubscribers,
};
