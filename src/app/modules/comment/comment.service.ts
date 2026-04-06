/* eslint-disable @typescript-eslint/no-explicit-any */

import { prisma } from "../../lib/prisma";
import AppError from "../../errorHelpers/AppError";
import status from "http-status";
import { NotificationService } from "../notification/notification.service";
import { ActivityType, Role } from "../../../generated/prisma/enums";
import { AuditLogService } from "../auditLog/auditLog.service";

const MAX_DEPTH = 5;

const createComment = async (
  userId: string,
  ideaId: string,
  content: string,
  parentId?: string,
  meta?: { ip?: string; userAgent?: string },
) => {
  return prisma.$transaction(async (tx) => {
    let path = "";
    let depth = 0;
    let parent: any = null;

    const idea = await tx.idea.findUnique({
      where: { id: ideaId },
      select: { id: true, isDeleted: true },
    });

    if (!idea || idea.isDeleted) {
      throw new AppError(status.NOT_FOUND, "Idea not found");
    }

    if (parentId) {
      parent = await tx.comment.findUnique({
        where: { id: parentId, isDeleted: false },
      });

      if (!parent) {
        throw new AppError(status.NOT_FOUND, "Parent comment not found");
      }

      if (parent.depth >= MAX_DEPTH) {
        throw new AppError(status.BAD_REQUEST, "Maximum reply depth reached");
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
        lastActivityAt: new Date(),
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

    await AuditLogService.createAuditLog(
      {
        userId,
        action: "CREATE",
        entity: "COMMENT",
        entityId: updatedComment.id,
        newValue: updatedComment,
        ipAddress: meta?.ip,
        userAgent: meta?.userAgent,
      },
      tx,
    );

    if (parent && parent.userId !== userId) {
      await NotificationService.createNotification(
        parent.userId,
        "COMMENT_REPLY",
        "New Reply 💬",
        `Someone replied: "${content.slice(0, 100)}${
          content.length > 100 ? "..." : ""
        }"`,
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
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
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
      const parent = map.get(comment.parentId);
      if (parent) {
        parent.replies.push(comment);
      }
    } else {
      tree.push(comment);
    }
  });

  return tree;
};

const deleteComment = async (
  userId: string,
  commentId: string,
  userRole?: Role,
  meta?: { ip?: string; userAgent?: string },
) => {
  return prisma.$transaction(async (tx) => {
    const comment = await tx.comment.findUnique({
      where: { id: commentId },
      include: {
        idea: {
          select: {
            id: true,
            authorId: true,
          },
        },
      },
    });

    if (!comment) {
      throw new AppError(status.NOT_FOUND, "Comment not found");
    }

    const isCommentAuthor = comment.userId === userId;
    const isIdeaAuthor = comment.idea?.authorId === userId;
    const isAdmin = userRole === Role.ADMIN || userRole === Role.SUPER_ADMIN;

    if (!isCommentAuthor && !isIdeaAuthor && !isAdmin) {
      throw new AppError(
        status.FORBIDDEN,
        "You are not authorized to delete this comment",
      );
    }

    const oldComment = { ...comment };

    const deletedComment = await tx.comment.update({
      where: { id: commentId },
      data: {
        content: "[deleted by user]",
        isDeleted: true,
      },
    });

    await tx.idea.update({
      where: { id: comment.ideaId },
      data: {
        commentCount: { decrement: 1 },
      },
    });

    await AuditLogService.createAuditLog(
      {
        userId,
        action: "DELETE",
        entity: "COMMENT",
        entityId: commentId,
        oldValue: oldComment,
        newValue: deletedComment,
        ipAddress: meta?.ip,
        userAgent: meta?.userAgent,
      },
      tx,
    );

    return deletedComment;
  });
};

const hardDeleteComment = async (
  userId: string,
  commentId: string,
  userRole?: Role,
  reason?: string,
  meta?: { ip?: string; userAgent?: string },
) => {
  return prisma.$transaction(async (tx) => {
    const comment = await tx.comment.findUnique({
      where: { id: commentId },
      include: {
        replies: {
          select: { id: true },
        },
      },
    });

    if (!comment) {
      throw new AppError(status.NOT_FOUND, "Comment not found");
    }

    // Only admins can hard delete
    const isAdmin = userRole === Role.ADMIN || userRole === Role.SUPER_ADMIN;
    if (!isAdmin) {
      throw new AppError(
        status.FORBIDDEN,
        "Only admins can permanently delete comments",
      );
    }

    const replyIds = comment.replies.map((r) => r.id);

    await tx.comment.deleteMany({
      where: {
        OR: [{ id: commentId }, { parentId: commentId }],
      },
    });

    const totalDeleted = 1 + replyIds.length;
    await tx.idea.update({
      where: { id: comment.ideaId },
      data: {
        commentCount: { decrement: totalDeleted },
      },
    });

    await AuditLogService.createAuditLog(
      {
        userId,
        action: "HARD_DELETE",
        entity: "COMMENT",
        entityId: commentId,
        oldValue: comment,
        newValue: { reason, deletedReplies: replyIds.length },
        ipAddress: meta?.ip,
        userAgent: meta?.userAgent,
      },
      tx,
    );

    return { deleted: true, replyCount: replyIds.length, reason };
  });
};

const updateComment = async (
  userId: string,
  commentId: string,
  content: string,
  meta?: { ip?: string; userAgent?: string },
) => {
  return prisma.$transaction(async (tx) => {
    const comment = await tx.comment.findUnique({
      where: { id: commentId, isDeleted: false },
    });

    if (!comment) {
      throw new AppError(status.NOT_FOUND, "Comment not found");
    }

    if (comment.userId !== userId) {
      throw new AppError(
        status.FORBIDDEN,
        "You can only edit your own comments",
      );
    }

    const updated = await tx.comment.update({
      where: { id: commentId },
      data: {
        content,
        isEdited: true,
        editCount: { increment: 1 },
      },
    });

    await AuditLogService.createAuditLog(
      {
        userId,
        action: "UPDATE",
        entity: "COMMENT",
        entityId: commentId,
        oldValue: comment,
        newValue: updated,
        ipAddress: meta?.ip,
        userAgent: meta?.userAgent,
      },
      tx,
    );

    return updated;
  });
};

export const CommentService = {
  createComment,
  getCommentsByIdea,
  deleteComment,
  hardDeleteComment,
  updateComment,
};
