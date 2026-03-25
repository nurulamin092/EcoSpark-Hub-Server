/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "../../lib/prisma";
import { ICreateIdeaPayload, IUpdateIdeaPayload } from "./idea.interface";
import AppError from "../../errorHelpers/AppError";
import status from "http-status";
import slugify from "slugify";
import { IdeaStatus } from "../../../generated/prisma/enums";

const createIdea = async (userId: string, payload: ICreateIdeaPayload) => {
  const slug = slugify(payload.title, { lower: true, strict: true });

  const idea = await prisma.idea.create({
    data: {
      ...payload,
      slug,
      authorId: userId,
    },
  });

  return idea;
};

const updateIdea = async (
  userId: string,
  ideaId: string,
  payload: IUpdateIdeaPayload,
) => {
  const idea = await prisma.idea.findUnique({ where: { id: ideaId } });

  if (!idea) throw new AppError(status.NOT_FOUND, "Idea not found");

  if (idea.authorId !== userId)
    throw new AppError(status.FORBIDDEN, "Not allowed");

  if (idea.status !== IdeaStatus.DRAFT)
    throw new AppError(status.BAD_REQUEST, "Only draft can be edited");

  const updated = await prisma.idea.update({
    where: { id: ideaId },
    data: payload,
  });

  return updated;
};

const deleteIdea = async (userId: string, ideaId: string) => {
  const idea = await prisma.idea.findUnique({ where: { id: ideaId } });

  if (!idea) throw new AppError(status.NOT_FOUND, "Idea not found");

  if (idea.authorId !== userId)
    throw new AppError(status.FORBIDDEN, "Not allowed");

  if (idea.status !== IdeaStatus.DRAFT)
    throw new AppError(status.BAD_REQUEST, "Only draft can be deleted");

  await prisma.idea.delete({ where: { id: ideaId } });

  return null;
};

const submitIdea = async (userId: string, ideaId: string) => {
  const idea = await prisma.idea.findUnique({ where: { id: ideaId } });

  if (!idea) throw new AppError(status.NOT_FOUND, "Idea not found");

  if (idea.authorId !== userId)
    throw new AppError(status.FORBIDDEN, "Not allowed");

  if (idea.status !== IdeaStatus.DRAFT)
    throw new AppError(status.BAD_REQUEST, "Already submitted");

  return prisma.idea.update({
    where: { id: ideaId },
    data: {
      status: IdeaStatus.UNDER_REVIEW,
      submittedAt: new Date(),
    },
  });
};

const getAllIdeas = async (query: any) => {
  const {
    page = 1,
    limit = 10,
    search,
    category,
    isPaid,
    sort = "recent",
  } = query;

  const skip = (Number(page) - 1) * Number(limit);

  const where: any = {
    status: "APPROVED",
  };

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  if (category) {
    where.categoryId = category;
  }

  if (isPaid !== undefined) {
    where.isPaid = isPaid === "true";
  }

  let orderBy: any = { createdAt: "desc" };

  if (sort === "top") {
    orderBy = { upvoteCount: "desc" };
  }

  if (sort === "commented") {
    orderBy = { commentCount: "desc" };
  }

  const ideas = await prisma.idea.findMany({
    where,
    skip,
    take: Number(limit),
    orderBy,
  });

  const total = await prisma.idea.count({ where });

  return {
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
    },
    data: ideas,
  };
};
const getSingleIdea = async (id: string) => {
  const idea = await prisma.idea.findUnique({
    where: { id },
    include: {
      author: true,
      category: true,
    },
  });

  if (!idea) throw new AppError(status.NOT_FOUND, "Idea not found");

  return idea;
};

const approveIdea = async (adminId: string, ideaId: string) => {
  return prisma.idea.update({
    where: { id: ideaId },
    data: {
      status: IdeaStatus.APPROVED,
      reviewedByUserId: adminId,
      publishedAt: new Date(),
    },
  });
};

const rejectIdea = async (
  adminId: string,
  ideaId: string,
  feedback: string,
) => {
  return prisma.idea.update({
    where: { id: ideaId },
    data: {
      status: IdeaStatus.REJECTED,
      reviewedByUserId: adminId,
      adminFeedback: feedback,
    },
  });
};

export const IdeaService = {
  createIdea,
  updateIdea,
  deleteIdea,
  submitIdea,
  getAllIdeas,
  getSingleIdea,
  approveIdea,
  rejectIdea,
};
