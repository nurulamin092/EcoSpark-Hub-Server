import { Prisma } from "../../../generated/prisma/client";
import {
  IdeaStatus,
  ActivityType,
  NotificationType,
} from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import AppError from "../../errorHelpers/AppError";
import status from "http-status";
import { NotificationService } from "../notification/notification.service";

interface VoteResult {
  message: string;
  voteCounts: {
    upvotes: number;
    downvotes: number;
  };
}

const updateVoteCount = async (
  tx: Prisma.TransactionClient,
  ideaId: string,
  type: "UP" | "DOWN",
  value: number,
) => {
  const field = type === "UP" ? "upvoteCount" : "downvoteCount";

  const idea = await tx.idea.findUnique({
    where: { id: ideaId },
    select: {
      upvoteCount: true,
      downvoteCount: true,
    },
  });

  if (!idea) {
    throw new AppError(status.NOT_FOUND, "Idea not found");
  }

  const current = type === "UP" ? idea.upvoteCount : idea.downvoteCount;

  if (current + value < 0) {
    throw new AppError(status.BAD_REQUEST, "Invalid vote operation");
  }

  return tx.idea.update({
    where: { id: ideaId },
    data: {
      [field]: { increment: value },
      lastActivityAt: new Date(),
    },
    select: {
      upvoteCount: true,
      downvoteCount: true,
    },
  });
};

const voteIdea = async (
  userId: string,
  ideaId: string,
  type: "UP" | "DOWN",
): Promise<VoteResult> => {
  return prisma.$transaction(async (tx) => {
    const idea = await tx.idea.findUnique({
      where: { id: ideaId },
    });

    if (!idea || idea.isDeleted) {
      throw new AppError(status.NOT_FOUND, "Idea not found");
    }

    if (idea.status !== IdeaStatus.APPROVED) {
      throw new AppError(
        status.BAD_REQUEST,
        "Cannot vote on non-approved ideas",
      );
    }

    if (idea.authorId === userId) {
      throw new AppError(status.BAD_REQUEST, "You cannot vote your own idea");
    }

    const existingVote = await tx.vote.findUnique({
      where: {
        userId_ideaId: { userId, ideaId },
      },
    });

    let updatedCounts;

    if (existingVote && existingVote.type === type) {
      await tx.vote.delete({
        where: { id: existingVote.id },
      });

      updatedCounts = await updateVoteCount(tx, ideaId, type, -1);

      await tx.activity.create({
        data: {
          userId,
          type: ActivityType.VOTE_CAST,
          data: {
            ideaId,
            action: "REMOVE",
            voteType: type,
          },
        },
      });

      return {
        message: "Vote removed",
        voteCounts: {
          upvotes: updatedCounts.upvoteCount,
          downvotes: updatedCounts.downvoteCount,
        },
      };
    }

    if (existingVote) {
      await tx.vote.update({
        where: { id: existingVote.id },
        data: { type },
      });

      await updateVoteCount(tx, ideaId, existingVote.type, -1);
      updatedCounts = await updateVoteCount(tx, ideaId, type, +1);

      await tx.activity.create({
        data: {
          userId,
          type: ActivityType.VOTE_CAST,
          data: {
            ideaId,
            action: "SWITCH",
            from: existingVote.type,
            to: type,
          },
        },
      });

      if (idea.authorId !== userId) {
        await NotificationService.createNotification(
          idea.authorId,
          NotificationType.VOTE_RECEIVED,
          "Vote Updated 👍",
          "Someone changed their vote on your idea",
          { ideaId },
        );
      }

      return {
        message: "Vote updated",
        voteCounts: {
          upvotes: updatedCounts.upvoteCount,
          downvotes: updatedCounts.downvoteCount,
        },
      };
    }

    await tx.vote.create({
      data: { userId, ideaId, type },
    });

    updatedCounts = await updateVoteCount(tx, ideaId, type, +1);

    await tx.activity.create({
      data: {
        userId,
        type: ActivityType.VOTE_CAST,
        data: {
          ideaId,
          action: "ADD",
          voteType: type,
        },
      },
    });

    if (idea.authorId !== userId) {
      await NotificationService.createNotification(
        idea.authorId,
        NotificationType.VOTE_RECEIVED,
        "New Vote 👍",
        "Someone voted on your idea",
        { ideaId },
      );
    }

    return {
      message: "Vote added",
      voteCounts: {
        upvotes: updatedCounts.upvoteCount,
        downvotes: updatedCounts.downvoteCount,
      },
    };
  });
};

const getUserVote = async (userId: string, ideaId: string) => {
  return prisma.vote.findUnique({
    where: {
      userId_ideaId: { userId, ideaId },
    },
  });
};

const removeVote = async (
  userId: string,
  ideaId: string,
): Promise<VoteResult> => {
  return prisma.$transaction(async (tx) => {
    const vote = await tx.vote.findUnique({
      where: {
        userId_ideaId: { userId, ideaId },
      },
    });

    if (!vote) {
      throw new AppError(status.NOT_FOUND, "No vote found");
    }

    const updatedCounts = await updateVoteCount(tx, ideaId, vote.type, -1);

    await tx.vote.delete({
      where: { id: vote.id },
    });

    await tx.activity.create({
      data: {
        userId,
        type: ActivityType.VOTE_CAST,
        data: {
          ideaId,
          action: "REMOVE",
          voteType: vote.type,
        },
      },
    });

    return {
      message: "Vote removed successfully",
      voteCounts: {
        upvotes: updatedCounts.upvoteCount,
        downvotes: updatedCounts.downvoteCount,
      },
    };
  });
};

export const VoteService = {
  voteIdea,
  getUserVote,
  removeVote,
};
