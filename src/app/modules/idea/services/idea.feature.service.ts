/**
 * @file idea.feature.service.ts
 * @description Additional features for Idea module
 * @version 1.0.0
 */

import { prisma } from "../../../lib/prisma";
import { selectIdeaFields } from "../utils/idea.helpers";
import { ideaCache } from "../utils/idea.cache";
import { IdeaStatus } from "../../../../generated/prisma/enums";

/**
 * Get featured ideas for homepage
 */
export const getFeaturedIdeas = async (limit: number = 3) => {
  const cacheKey = `ideas:featured:${limit}`;
  const cached = ideaCache.get(cacheKey);
  if (cached) return cached;

  const ideas = await prisma.idea.findMany({
    where: {
      status: IdeaStatus.APPROVED,
      isDeleted: false,
      isFeatured: true,
      OR: [{ featuredUntil: null }, { featuredUntil: { gt: new Date() } }],
    },
    orderBy: { upvoteCount: "desc" },
    take: limit,
    select: selectIdeaFields,
  });

  ideaCache.set(cacheKey, ideas, 5 * 60 * 1000);
  return ideas;
};

/**
 * Get top voted ideas for testimonials
 */
export const getTopVotedIdeas = async (limit: number = 3) => {
  const cacheKey = `ideas:top-voted:${limit}`;
  const cached = ideaCache.get(cacheKey);
  if (cached) return cached;

  const ideas = await prisma.idea.findMany({
    where: {
      status: IdeaStatus.APPROVED,
      isDeleted: false,
    },
    orderBy: { upvoteCount: "desc" },
    take: limit,
    select: selectIdeaFields,
  });

  ideaCache.set(cacheKey, ideas, 2 * 60 * 1000);
  return ideas;
};
