import { Request, Response } from "express";
import { VoteService } from "./vote.service";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import status from "http-status";
import { prisma } from "../../lib/prisma";
import { IdeaStatus } from "../../../generated/prisma/enums";
import AppError from "../../errorHelpers/AppError";

const voteIdea = catchAsync(async (req: Request, res: Response) => {
  const result = await VoteService.voteIdea(
    req.user.userId,
    req.body.ideaId,
    req.body.type,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: result.message,
    data: result,
  });
});

const getUserVote = catchAsync(async (req: Request, res: Response) => {
  const { ideaId } = req.params;
  const userId = req.user.userId;

  const idea = await prisma.idea.findUnique({
    where: { id: ideaId as string },
    select: {
      id: true,
      title: true,
      status: true,
      authorId: true,
    },
  });

  if (!idea) {
    throw new AppError(status.NOT_FOUND, "Idea not found");
  }

  if (idea.status !== IdeaStatus.APPROVED && idea.authorId !== userId) {
    throw new AppError(
      status.FORBIDDEN,
      "Cannot view vote status for non-approved ideas",
    );
  }

  const vote = await VoteService.getUserVote(userId, ideaId as string);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "User vote fetched",
    data: {
      idea,
      vote: vote
        ? {
            hasVoted: true,
            type: vote.type,
            votedAt: vote.createdAt,
          }
        : {
            hasVoted: false,
            type: null,
          },
    },
  });
});

const removeVote = catchAsync(async (req: Request, res: Response) => {
  const result = await VoteService.removeVote(
    req.user.userId,
    req.params.ideaId as string,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: result.message,
    data: result,
  });
});

const getMyVotes = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.userId;
  const { page = 1, limit = 10 } = req.query;

  const votes = await prisma.vote.findMany({
    where: { userId },
    include: {
      idea: {
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          upvoteCount: true,
          downvoteCount: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    skip: (Number(page) - 1) * Number(limit),
    take: Number(limit),
  });

  const total = await prisma.vote.count({ where: { userId } });

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "My votes fetched",
    data: {
      votes,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    },
  });
});

export const VoteController = {
  voteIdea,
  getUserVote,
  removeVote,
  getMyVotes,
};
