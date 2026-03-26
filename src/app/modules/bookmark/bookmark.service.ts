/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "../../lib/prisma";
import AppError from "../../errorHelpers/AppError";
import status from "http-status";

const toggleBookmark = async (userId: string, ideaId: string) => {
  return prisma.$transaction(async (tx) => {
    const idea = await tx.idea.findUnique({
      where: { id: ideaId },
    });

    if (!idea || idea.isDeleted) {
      throw new AppError(status.NOT_FOUND, "Idea not found");
    }

    const existing = await tx.bookmark.findUnique({
      where: {
        userId_ideaId: { userId, ideaId },
      },
    });

    if (existing) {
      await tx.bookmark.delete({
        where: { id: existing.id },
      });

      await tx.idea.update({
        where: { id: ideaId },
        data: {
          bookmarkCount: { decrement: 1 },
        },
      });

      return { message: "Bookmark removed" };
    }

    await tx.bookmark.create({
      data: { userId, ideaId },
    });

    await tx.idea.update({
      where: { id: ideaId },
      data: {
        bookmarkCount: { increment: 1 },
      },
    });

    return { message: "Bookmarked" };
  });
};

const getMyBookmarks = async (userId: string, query: any) => {
  const { page = 1, limit = 10 } = query;

  const bookmarks = await prisma.bookmark.findMany({
    where: { userId },
    include: {
      idea: true,
    },
    skip: (Number(page) - 1) * Number(limit),
    take: Number(limit),
    orderBy: { createdAt: "desc" },
  });

  const total = await prisma.bookmark.count({
    where: { userId },
  });

  return {
    data: bookmarks,
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
    },
  };
};

export const BookmarkService = {
  toggleBookmark,
  getMyBookmarks,
};
