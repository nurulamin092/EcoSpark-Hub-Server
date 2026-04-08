/**
 * @file idea.helpers.ts
 * @description Helper functions for Idea module
 * @version 1.0.0
 */

import { Prisma } from "../../../../generated/prisma/client";
import { prisma } from "../../../lib/prisma";
import slugify from "slugify";

type Decimal = Prisma.Decimal;

/**
 * Convert Decimal to number safely
 */
export const toNumber = (
  value: number | Decimal | null | undefined,
): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  if (typeof value === "object" && "toNumber" in value) {
    return (value as Decimal).toNumber();
  }
  return null;
};

/**
 * Generate unique URL-friendly slug
 */
export const generateUniqueSlug = async (title: string): Promise<string> => {
  const baseSlug = slugify(title, { lower: true, strict: true });
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const exists = await prisma.idea.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!exists) break;

    slug = `${baseSlug}-${Date.now()}-${counter}`;
    counter++;
  }

  return slug;
};

/**
 * Calculate trending score using Reddit's hot algorithm
 */
export const calculateTrendingScore = (idea: {
  upvoteCount: number;
  downvoteCount: number;
  createdAt: Date;
}): number => {
  const score = idea.upvoteCount - idea.downvoteCount;
  const order = Math.log10(Math.max(Math.abs(score), 1));
  const sign = score > 0 ? 1 : score < -0 ? -1 : 0;

  const seconds =
    (new Date(idea.createdAt).getTime() - new Date(2020, 0, 1).getTime()) /
    1000;

  return sign * order + seconds / 45000;
};

/**
 * Optimized select fields for idea queries
 */
export const selectIdeaFields = {
  id: true,
  title: true,
  slug: true,
  description: true,
  images: true,
  viewCount: true,
  upvoteCount: true,
  downvoteCount: true,
  commentCount: true,
  bookmarkCount: true,
  isPaid: true,
  price: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  category: {
    select: { id: true, name: true, color: true, icon: true },
  },
  author: {
    select: { id: true, name: true, image: true },
  },
};
