/**
 * @file idea.helpers.ts
 * @description Type-safe helper functions for Idea module
 * @version 2.1.0
 */

import { Prisma } from "../../../../generated/prisma/client";
import { prisma } from "../../../lib/prisma";
import slugify from "slugify";

type Decimal = Prisma.Decimal;

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

export const generateUniqueSlug = async (title: string): Promise<string> => {
  const baseSlug = slugify(title, { lower: true, strict: true, trim: true });
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const exists = await prisma.idea.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!exists) break;

    slug = `${baseSlug}-${counter}`;
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
  const sign = score > 0 ? 1 : score < 0 ? -1 : 0;

  const seconds =
    (new Date(idea.createdAt).getTime() - new Date(2020, 0, 1).getTime()) /
    1000;

  return sign * order + seconds / 45000;
};

export interface IImageData {
  secureUrl?: string;
  url?: string;
  publicId?: string;
  width?: number;
  height?: number;
  format?: string;
  size?: number;
}

export interface ICategorySelect {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
}

export interface IAuthorSelect {
  id: string;
  name: string;
  image: string | null;
}

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
  category: { select: { id: true, name: true, color: true, icon: true } },
  author: { select: { id: true, name: true, image: true } },
} as const;

export type IdeaSelectFields = typeof selectIdeaFields;
export type IdeaWithRelations = Prisma.IdeaGetPayload<{
  select: typeof selectIdeaFields;
}>;
