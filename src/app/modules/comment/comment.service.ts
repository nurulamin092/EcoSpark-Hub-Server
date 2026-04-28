/**
 * @file comment.service.ts
 * @description Production-grade comment service with N+1 elimination, atomic operations, and proper error handling
 * @version 4.0.0
 */

import { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import AppError from "../../errorHelpers/AppError";
import httpStatus from "http-status";
import { NotificationService } from "../notification/notification.service";
import { ActivityType, Role } from "../../../generated/prisma/enums";
import { AuditLogService } from "../auditLog/auditLog.service";
import {
  BaseComment,
  CommentTreeNode,
  CommentUser,
  CommentWithUser,
  CreateCommentMeta,
  DeleteCommentMeta,
  ReplyData,
} from "./comment.interface";

// ==================== Constants ====================
const MAX_DEPTH = 5;
const MAX_COMMENT_LENGTH = 5000;
const PREVIEW_LENGTH = 100;

// ==================== Types ====================

// Alias for backward compatibility

// ==================== Helper Functions ====================

/**
 * Builds a hierarchical comment tree from flat list (O(n) time, O(n) space)
 * Eliminates N+1 queries by processing in-memory
 */
const buildCommentTree = (comments: BaseComment[]): CommentTreeNode[] => {
  const commentMap = new Map<string, CommentTreeNode>();
  const roots: CommentTreeNode[] = [];

  // First pass: create map with empty replies array
  for (const comment of comments) {
    commentMap.set(comment.id, {
      ...comment,
      replies: [],
    });
  }

  // Second pass: build tree structure
  for (const comment of comments) {
    const node = commentMap.get(comment.id);
    if (!node) continue;

    if (comment.parentId && commentMap.has(comment.parentId)) {
      const parent = commentMap.get(comment.parentId);
      if (parent) {
        parent.replies.push(node);
      }
    } else {
      roots.push(node);
    }
  }

  return roots;
};

/**
 * Generates path for nested comment using lexical ordering
 * Enables efficient sorting without recursive queries
 */
const generateCommentPath = (
  parentPath: string | null,
  commentId: string,
): string => {
  if (!parentPath || parentPath === "temp") {
    return commentId;
  }
  return `${parentPath}.${commentId}`;
};

/**
 * Validates comment content length and sanitization
 */
const validateCommentContent = (content: string): void => {
  if (!content || content.trim().length === 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Comment content cannot be empty",
    );
  }
  if (content.length > MAX_COMMENT_LENGTH) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Comment cannot exceed ${MAX_COMMENT_LENGTH} characters`,
    );
  }
};

/**
 * Sanitizes content to prevent XSS (basic version - use DOMPurify on frontend)
 */
const sanitizeContent = (content: string): string => {
  // Basic sanitization - remove script tags and dangerous attributes
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/on\w+="[^"]*"/g, "")
    .replace(/on\w+='[^']*'/g, "");
};

/**
 * Creates a properly formatted reply object with all required fields
 */
const createReplyObject = (
  reply: {
    id: string;
    content: string;
    userId: string;
    createdAt: Date;
    user: CommentUser;
  },
  parentComment: {
    id: string;
    path: string;
    depth: number;
    ideaId: string;
  },
): ReplyData => {
  return {
    id: reply.id,
    content: reply.content,
    userId: reply.userId,
    ideaId: parentComment.ideaId,
    parentId: parentComment.id,
    path: `${parentComment.path}.${reply.id}`,
    depth: parentComment.depth + 1,
    isDeleted: false,
    isEdited: false,
    editCount: 0,
    likes: 0,
    createdAt: reply.createdAt,
    updatedAt: reply.createdAt,
    user: reply.user,
  };
};

// ==================== Core Service Functions ====================

/**
 * Creates a new comment or reply with proper path generation
 * Uses atomic operations to prevent race conditions
 */
const createComment = async (
  userId: string,
  ideaId: string,
  content: string,
  parentId?: string,
  meta?: CreateCommentMeta,
): Promise<CommentWithUser> => {
  // Validate input
  validateCommentContent(content);
  const sanitizedContent = sanitizeContent(content);

  // Use transaction with proper isolation level
  return await prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      // 1. Verify idea exists and is not deleted (lightweight check)
      const idea = await tx.idea.findUnique({
        where: { id: ideaId, isDeleted: false },
        select: { id: true, authorId: true, commentCount: true },
      });

      if (!idea) {
        throw new AppError(httpStatus.NOT_FOUND, "Idea not found");
      }

      let depth = 0;
      let parentPath: string | null = null;
      let parentAuthorId: string | null = null;

      // 2. Handle parent comment if this is a reply
      if (parentId) {
        const parent = await tx.comment.findUnique({
          where: { id: parentId, isDeleted: false },
          select: { depth: true, path: true, userId: true },
        });

        if (!parent) {
          throw new AppError(httpStatus.NOT_FOUND, "Parent comment not found");
        }

        if (parent.depth >= MAX_DEPTH) {
          throw new AppError(
            httpStatus.BAD_REQUEST,
            `Maximum reply depth of ${MAX_DEPTH} reached`,
          );
        }

        depth = parent.depth + 1;
        parentPath = parent.path;
        parentAuthorId = parent.userId;
      }

      // 3. Create comment with temporary path
      const newComment = await tx.comment.create({
        data: {
          content: sanitizedContent,
          userId,
          ideaId,
          parentId: parentId || null,
          path: "temp", // Temporary, will update immediately
          depth,
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
      });

      // 4. Update with correct path (atomic update)
      const finalPath = generateCommentPath(parentPath, newComment.id);
      const updatedComment = await tx.comment.update({
        where: { id: newComment.id },
        data: { path: finalPath },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      });

      // 5. Update idea counters (atomic increment)
      await tx.idea.update({
        where: { id: ideaId },
        data: {
          commentCount: { increment: 1 },
          lastActivityAt: new Date(),
        },
      });

      // 6. Create activity log (fire-and-forget, don't block)
      tx.activity
        .create({
          data: {
            userId,
            type: ActivityType.COMMENT_ADDED,
            data: {
              commentId: updatedComment.id,
              ideaId: updatedComment.ideaId,
            },
          },
        })
        .catch(() => {
          // Silent failure - activity logging is non-critical
        });

      // 7. Create audit log (fire-and-forget)
      AuditLogService.createAuditLog(
        {
          userId,
          action: "CREATE",
          entity: "COMMENT",
          entityId: updatedComment.id,
          newValue: { id: updatedComment.id, ideaId, parentId },
          ipAddress: meta?.ip,
          userAgent: meta?.userAgent,
        },
        tx,
      ).catch(() => {
        // Silent failure - audit logging is non-critical
      });

      // 8. Send notification to parent comment author (async, don't await)
      if (parentAuthorId && parentAuthorId !== userId) {
        const preview =
          sanitizedContent.length > PREVIEW_LENGTH
            ? `${sanitizedContent.substring(0, PREVIEW_LENGTH)}...`
            : sanitizedContent;

        NotificationService.createNotification(
          parentAuthorId,
          "COMMENT_REPLY",
          "New Reply 💬",
          `Someone replied: "${preview}"`,
          {
            ideaId,
            commentId: updatedComment.id,
          },
        ).catch(() => {
          // Silent failure - notification failure shouldn't break comment creation
        });
      }

      return updatedComment;
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      timeout: 10000, // 10 seconds timeout
    },
  );
};

/**
 * Retrieves all comments for an idea with proper pagination and tree structure
 * Eliminates N+1 queries by using a single query with path-based ordering
 */
const getCommentsByIdea = async (
  ideaId: string,
  page: number = 1,
  limit: number = 50,
): Promise<{
  data: CommentTreeNode[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}> => {
  // Validate pagination parameters
  const validPage = Math.max(1, page);
  const validLimit = Math.min(100, Math.max(1, limit));
  const skip = (validPage - 1) * validLimit;

  // Single query with count - eliminates N+1
  const [comments, total] = await Promise.all([
    prisma.comment.findMany({
      where: {
        ideaId,
        isDeleted: false,
      },
      select: {
        id: true,
        content: true,
        userId: true,
        ideaId: true,
        parentId: true,
        path: true,
        depth: true,
        isDeleted: true,
        isEdited: true,
        editCount: true,
        likes: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: {
        path: "asc", // Path-based ordering for efficient tree building
      },
      skip,
      take: validLimit,
    }),
    prisma.comment.count({
      where: {
        ideaId,
        isDeleted: false,
      },
    }),
  ]);

  // Build tree structure in O(n) time - no additional database queries
  const tree = buildCommentTree(comments as BaseComment[]);

  return {
    data: tree,
    meta: {
      total,
      page: validPage,
      limit: validLimit,
      totalPages: Math.ceil(total / validLimit),
    },
  };
};

/**
 * Soft deletes a comment (marks as deleted but preserves content for moderation)
 */
const deleteComment = async (
  userId: string,
  commentId: string,
  userRole?: Role,
  meta?: DeleteCommentMeta,
): Promise<{ id: string; isDeleted: boolean }> => {
  return await prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      // Get comment with idea author info in a single query
      const comment = await tx.comment.findUnique({
        where: { id: commentId },
        select: {
          id: true,
          userId: true,
          ideaId: true,
          content: true,
          idea: {
            select: {
              authorId: true,
            },
          },
        },
      });

      if (!comment) {
        throw new AppError(httpStatus.NOT_FOUND, "Comment not found");
      }

      // Check authorization
      const isCommentAuthor = comment.userId === userId;
      const isIdeaAuthor = comment.idea?.authorId === userId;
      const isAdmin = userRole === Role.ADMIN || userRole === Role.SUPER_ADMIN;

      if (!isCommentAuthor && !isIdeaAuthor && !isAdmin) {
        throw new AppError(
          httpStatus.FORBIDDEN,
          "You are not authorized to delete this comment",
        );
      }

      // Soft delete the comment
      const deletedComment = await tx.comment.update({
        where: { id: commentId },
        data: {
          content: "[deleted by user]",
          isDeleted: true,
          isEdited: true,
        },
        select: {
          id: true,
          isDeleted: true,
        },
      });

      // Decrement comment count on idea
      await tx.idea.update({
        where: { id: comment.ideaId },
        data: {
          commentCount: { decrement: 1 },
        },
      });

      // Create audit log (non-blocking)
      AuditLogService.createAuditLog(
        {
          userId,
          action: "DELETE",
          entity: "COMMENT",
          entityId: commentId,
          oldValue: { userId: comment.userId, ideaId: comment.ideaId },
          newValue: { isDeleted: true },
          ipAddress: meta?.ip,
          userAgent: meta?.userAgent,
        },
        tx,
      ).catch(() => {});

      return deletedComment;
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
    },
  );
};

/**
 * Permanently deletes a comment and all its replies (admin only)
 * Uses recursive CTE for efficient deletion of entire comment trees
 */
const hardDeleteComment = async (
  adminId: string,
  commentId: string,
  reason?: string,
  meta?: DeleteCommentMeta,
): Promise<{ deleted: boolean; deletedCount: number; reason?: string }> => {
  return await prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      // First, get the comment to verify existence and get ideaId
      const comment = await tx.comment.findUnique({
        where: { id: commentId },
        select: {
          id: true,
          ideaId: true,
          userId: true,
        },
      });

      if (!comment) {
        throw new AppError(httpStatus.NOT_FOUND, "Comment not found");
      }

      // Use raw SQL for efficient recursive deletion of comment tree
      // This deletes the comment and all its descendants in one operation
      const result = await tx.$queryRaw<Array<{ id: string }>>`
        WITH RECURSIVE comment_tree AS (
          SELECT id FROM comments WHERE id = ${commentId}::uuid
          UNION ALL
          SELECT c.id FROM comments c
          INNER JOIN comment_tree ct ON c.parent_id = ct.id
        )
        DELETE FROM comments
        WHERE id IN (SELECT id FROM comment_tree)
        RETURNING id
      `;

      const deletedCount = result.length;

      // Update idea comment count
      await tx.idea.update({
        where: { id: comment.ideaId },
        data: {
          commentCount: { decrement: deletedCount },
        },
      });

      // Create audit log
      await AuditLogService.createAuditLog(
        {
          userId: adminId,
          action: "HARD_DELETE",
          entity: "COMMENT",
          entityId: commentId,
          oldValue: { userId: comment.userId, ideaId: comment.ideaId },
          newValue: { reason, deletedCount, permanent: true },
          ipAddress: meta?.ip,
          userAgent: meta?.userAgent,
        },
        tx,
      );

      return {
        deleted: true,
        deletedCount,
        reason,
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      timeout: 30000,
    },
  );
};

/**
 * Updates an existing comment (author only)
 */
const updateComment = async (
  userId: string,
  commentId: string,
  content: string,
  meta?: DeleteCommentMeta,
): Promise<CommentWithUser> => {
  // Validate input
  validateCommentContent(content);
  const sanitizedContent = sanitizeContent(content);

  return await prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      const comment = await tx.comment.findUnique({
        where: { id: commentId, isDeleted: false },
        select: {
          id: true,
          userId: true,
          content: true,
          editCount: true,
        },
      });

      if (!comment) {
        throw new AppError(httpStatus.NOT_FOUND, "Comment not found");
      }

      if (comment.userId !== userId) {
        throw new AppError(
          httpStatus.FORBIDDEN,
          "You can only edit your own comments",
        );
      }

      const updatedComment = await tx.comment.update({
        where: { id: commentId },
        data: {
          content: sanitizedContent,
          isEdited: true,
          editCount: { increment: 1 },
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
      });

      // Create audit log
      AuditLogService.createAuditLog(
        {
          userId,
          action: "UPDATE",
          entity: "COMMENT",
          entityId: commentId,
          oldValue: { contentPreview: comment.content.substring(0, 100) },
          newValue: { contentPreview: sanitizedContent.substring(0, 100) },
          ipAddress: meta?.ip,
          userAgent: meta?.userAgent,
        },
        tx,
      ).catch(() => {});

      return updatedComment;
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
    },
  );
};

/**
 * Gets a single comment by ID with its reply tree
 */
const getCommentById = async (
  commentId: string,
): Promise<CommentTreeNode | null> => {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId, isDeleted: false },
    select: {
      id: true,
      content: true,
      userId: true,
      ideaId: true,
      parentId: true,
      path: true,
      depth: true,
      isDeleted: true,
      isEdited: true,
      editCount: true,
      likes: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      replies: {
        where: { isDeleted: false },
        select: {
          id: true,
          content: true,
          userId: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
        take: 10,
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!comment) return null;

  // Create properly typed reply objects
  const repliesWithFullData: CommentTreeNode[] = comment.replies.map(
    (reply) => {
      const replyData = createReplyObject(reply, comment);
      return {
        ...replyData,
        replies: [], // Empty array for replies (not fetching nested replies here)
      };
    },
  );

  // Return comment with properly typed replies
  return {
    id: comment.id,
    content: comment.content,
    userId: comment.userId,
    ideaId: comment.ideaId,
    parentId: comment.parentId,
    path: comment.path,
    depth: comment.depth,
    isDeleted: comment.isDeleted,
    isEdited: comment.isEdited,
    editCount: comment.editCount,
    likes: comment.likes,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    user: comment.user,
    replies: repliesWithFullData,
  };
};

/**
 * Gets comment count for an idea (lightweight, no joins)
 */
const getCommentCount = async (ideaId: string): Promise<number> => {
  const result = await prisma.comment.aggregate({
    where: {
      ideaId,
      isDeleted: false,
    },
    _count: {
      id: true,
    },
  });

  return result._count.id;
};

// ==================== Exports ====================

export const CommentService = {
  createComment,
  getCommentsByIdea,
  getCommentById,
  getCommentCount,
  deleteComment,
  hardDeleteComment,
  updateComment,
};
