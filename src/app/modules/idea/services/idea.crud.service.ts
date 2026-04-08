/**
 * @file idea.crud.service.ts
 * @description CRUD operations for Idea module
 * @version 1.0.0
 */

import { prisma } from "../../../lib/prisma";
import { ICreateIdeaPayload, IUpdateIdeaPayload } from "../idea.interface";
import {
  generateUniqueSlug,
  selectIdeaFields,
  toNumber,
} from "../utils/idea.helpers";
import {
  validateCategory,
  validatePriceForPaidIdea,
} from "../utils/idea.validators";
import { ideaCache } from "../utils/idea.cache";
import AppError from "../../../errorHelpers/AppError";
import status from "http-status";
import { ActivityType, IdeaStatus } from "../../../../generated/prisma/enums";
import { ActivityService } from "../../activity/activity.service";

/**
 * Create a new idea (draft)
 */
export const createIdea = async (
  userId: string,
  payload: ICreateIdeaPayload,
) => {
  await validateCategory(payload.categoryId);
  validatePriceForPaidIdea(payload.isPaid, payload.price);

  const slug = await generateUniqueSlug(payload.title);

  const idea = await prisma.idea.create({
    data: {
      title: payload.title,
      problem: payload.problem,
      solution: payload.solution,
      description: payload.description,
      categoryId: payload.categoryId,
      slug,
      authorId: userId,
      isPaid: payload.isPaid || false,
      price: payload.isPaid ? payload.price : null,
    },
    select: selectIdeaFields,
  });

  ideaCache.invalidate("ideas:list");
  ideaCache.invalidate("ideas:featured");

  ActivityService.createActivity(userId, ActivityType.IDEA_CREATED, {
    ideaId: idea.id,
    title: idea.title,
  }).catch(() => {});

  return idea;
};

/**
 * Update a draft idea
 */
export const updateIdea = async (
  userId: string,
  ideaId: string,
  payload: IUpdateIdeaPayload,
) => {
  const idea = await prisma.idea.findUnique({
    where: { id: ideaId, isDeleted: false },
    select: {
      id: true,
      authorId: true,
      status: true,
      slug: true,
      title: true,
      categoryId: true,
      isPaid: true,
      price: true,
    },
  });

  if (!idea) throw new AppError(status.NOT_FOUND, "Idea not found");
  if (idea.authorId !== userId)
    throw new AppError(status.FORBIDDEN, "You can only edit your own ideas");
  if (idea.status !== IdeaStatus.DRAFT)
    throw new AppError(status.BAD_REQUEST, "Only draft ideas can be edited");

  if (payload.categoryId) await validateCategory(payload.categoryId);

  if (payload.isPaid !== undefined || payload.price !== undefined) {
    const isPaid = payload.isPaid ?? idea.isPaid;
    const price = payload.price ?? toNumber(idea.price);
    validatePriceForPaidIdea(isPaid, price ?? undefined);
  }

  let slug = idea.slug;
  if (payload.title && payload.title !== idea.title) {
    slug = await generateUniqueSlug(payload.title);
  }

  const updatedIdea = await prisma.idea.update({
    where: { id: ideaId },
    data: {
      ...(payload.title && { title: payload.title, slug }),
      ...(payload.problem && { problem: payload.problem }),
      ...(payload.solution && { solution: payload.solution }),
      ...(payload.description && { description: payload.description }),
      ...(payload.categoryId && { categoryId: payload.categoryId }),
      ...(payload.isPaid !== undefined && { isPaid: payload.isPaid }),
      ...(payload.price !== undefined && { price: payload.price }),
    },
    select: selectIdeaFields,
  });

  ideaCache.invalidate(`idea:${ideaId}`);
  ideaCache.invalidate("ideas:list");

  return updatedIdea;
};

/**
 * Delete a draft idea (soft delete)
 */
export const deleteIdea = async (userId: string, ideaId: string) => {
  const idea = await prisma.idea.findUnique({
    where: { id: ideaId, isDeleted: false },
    select: { id: true, authorId: true, status: true },
  });

  if (!idea) throw new AppError(status.NOT_FOUND, "Idea not found");
  if (idea.authorId !== userId)
    throw new AppError(status.FORBIDDEN, "You can only delete your own ideas");
  if (idea.status !== IdeaStatus.DRAFT)
    throw new AppError(status.BAD_REQUEST, "Only draft ideas can be deleted");

  const deletedIdea = await prisma.idea.update({
    where: { id: ideaId },
    data: { isDeleted: true, deletedAt: new Date() },
  });

  ideaCache.invalidate(`idea:${ideaId}`);
  ideaCache.invalidate("ideas:list");

  return deletedIdea;
};

/**
 * Submit draft idea for admin review
 */
export const submitIdea = async (userId: string, ideaId: string) => {
  const idea = await prisma.idea.findUnique({
    where: { id: ideaId, isDeleted: false },
    select: {
      id: true,
      authorId: true,
      status: true,
      title: true,
      description: true,
      problem: true,
      solution: true,
    },
  });

  if (!idea) throw new AppError(status.NOT_FOUND, "Idea not found");
  if (idea.authorId !== userId)
    throw new AppError(status.FORBIDDEN, "You can only submit your own ideas");
  if (idea.status !== IdeaStatus.DRAFT)
    throw new AppError(status.BAD_REQUEST, "Idea has already been submitted");

  if (!idea.title || !idea.description || !idea.problem || !idea.solution) {
    throw new AppError(
      status.BAD_REQUEST,
      "Please complete all required fields before submitting",
    );
  }

  const submittedIdea = await prisma.idea.update({
    where: { id: ideaId },
    data: { status: IdeaStatus.UNDER_REVIEW, submittedAt: new Date() },
  });

  ideaCache.invalidate(`idea:${ideaId}`);

  return submittedIdea;
};
