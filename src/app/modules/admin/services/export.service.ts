/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file export.service.ts
 * @description Export functionality for Admin module
 * @version 1.0.0
 */

import { prisma } from "../../../lib/prisma";
import { IExportOptions } from "../admin.interface";

/**
 * Export users to CSV or JSON
 */
export const exportUsers = async (options: IExportOptions) => {
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

/**
 * Export ideas to CSV or JSON
 */
export const exportIdeas = async (options: IExportOptions) => {
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
      author: { select: { name: true, email: true } },
      category: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  if (options.format === "json") return ideas;

  return ideas.map((idea) => ({
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
};
