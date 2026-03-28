/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "../../lib/prisma";
import AppError from "../../errorHelpers/AppError";
import status from "http-status";
import { NotificationService } from "../notification/notification.service";
import { ActivityType } from "../../../generated/prisma/enums";

const MAX_DEPTH = 5;

const createComment = async (
  userId: string,
  ideaId: string,
  content: string,
  parentId?: string,
) => {
  return prisma.$transaction(async (tx) => {
    let path = "";
    let depth = 0;
    let parent: any = null; 

    if (parentId) {
      parent = await tx.comment.findUnique({
        where: { id: parentId },
      });

      if (!parent) {
        throw new AppError(status.NOT_FOUND, "Parent comment not found");
      }

      if (parent.depth >= MAX_DEPTH) {
        throw new AppError(status.BAD_REQUEST, "Max depth reached");
      }

      depth = parent.depth + 1;
      path = parent.path;
    }

    const newComment = await tx.comment.create({
      data: {
        content,
        userId,
        ideaId,
        parentId: parentId || null,
        path: "temp",
        depth,
      },
    });

    const finalPath = parentId ? `${path}.${newComment.id}` : newComment.id;

    const updatedComment = await tx.comment.update({
      where: { id: newComment.id },
      data: { path: finalPath },
    });

    await tx.idea.update({
      where: { id: ideaId },
      data: {
        commentCount: { increment: 1 },
      },
    });

    await tx.activity.create({
      data: {
        userId,
        type: ActivityType.COMMENT_ADDED,
        data: {
          commentId: updatedComment.id,
          ideaId: updatedComment.ideaId,
        },
      },
    });

    if (parent && parent.userId !== userId) {
      await NotificationService.createNotification(
        parent.userId,
        "COMMENT_REPLY",
        "New Reply 💬",
        "Someone replied to your comment",
        {
          ideaId,
          commentId: updatedComment.id,
        },
      );
    }

    return updatedComment;
  });
};

const getCommentsByIdea = async (ideaId: string) => {
  const comments = await prisma.comment.findMany({
    where: {
      ideaId,
      isDeleted: false,
    },
    orderBy: {
      path: "asc",
    },
  });

  const map = new Map();

  comments.forEach((c) => {
    map.set(c.id, { ...c, replies: [] });
  });

  const tree: any[] = [];

  map.forEach((comment) => {
    if (comment.parentId) {
      map.get(comment.parentId)?.replies.push(comment);
    } else {
      tree.push(comment);
    }
  });

  return tree;
};

const deleteComment = async (userId: string, commentId: string) => {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
  });

  if (!comment) throw new AppError(status.NOT_FOUND, "Comment not found");

  if (comment.userId !== userId) {
    throw new AppError(status.FORBIDDEN, "Not allowed");
  }

  return prisma.comment.update({
    where: { id: commentId },
    data: {
      content: "[deleted]",
      isDeleted: true,
    },
  });
};

const updateComment = async (
  userId: string,
  commentId: string,
  content: string,
) => {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
  });

  if (!comment) throw new AppError(status.NOT_FOUND, "Comment not found");

  if (comment.userId !== userId) {
    throw new AppError(status.FORBIDDEN, "Not allowed");
  }

  return prisma.comment.update({
    where: { id: commentId },
    data: {
      content,
      isEdited: true,
      editCount: { increment: 1 },
    },
  });
};

export const CommentService = {
  createComment,
  getCommentsByIdea,
  deleteComment,
  updateComment,
};
