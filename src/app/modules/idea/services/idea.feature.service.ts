/**
 * @file idea.feature.service.ts
 * @description Additional features for Idea module - NO N+1
 * @version 2.0.0
 */

import { prisma } from "../../../lib/prisma";
import {
  selectIdeaFields,
  IImageData,
  IdeaWithRelations,
} from "../utils/idea.helpers";
import { ideaCache } from "../utils/idea.cache";
import { IdeaStatus } from "../../../../generated/prisma/enums";

export interface ITestimonialAuthor {
  id: string;
  name: string;
  image: string | null;
  bio: string | null;
}

export interface ITestimonialCategory {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
}

export interface ITestimonial {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  fullDescription: string | null;
  featuredImage: string | null;
  upvoteCount: number;
  downvoteCount: number;
  netVotes: number;
  viewCount: number;
  commentCount: number;
  createdAt: Date;
  author: ITestimonialAuthor;
  category: ITestimonialCategory;
}

export interface ITestimonialComment {
  id: string;
  content: string;
  createdAt: Date;
  user: {
    id: string;
    name: string;
    image: string | null;
  };
}

export interface ITestimonialDetail extends ITestimonial {
  problem: string;
  solution: string;
  bookmarkCount: number;
  allImages: IImageData[] | null;
  recentComments: ITestimonialComment[];
}

export const getFeaturedIdeas = async (
  limit: number = 3,
): Promise<IdeaWithRelations[]> => {
  const cacheKey = `ideas:featured:${limit}`;
  const cached = ideaCache.get<IdeaWithRelations[]>(cacheKey);
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
  return ideas as IdeaWithRelations[];
};

export const getTestimonials = async (
  limit: number = 3,
  days?: number,
  criteria?: "all-time" | "this-month" | "this-week",
): Promise<ITestimonial[]> => {
  const validLimit = Math.min(Math.max(limit, 1), 10);
  const cacheKey = `ideas:testimonials:${validLimit}:${days || criteria || "all"}`;
  const cached = ideaCache.get<ITestimonial[]>(cacheKey);
  if (cached) return cached;

  const where: {
    status: IdeaStatus;
    isDeleted: boolean;
    createdAt?: { gte: Date };
  } = {
    status: IdeaStatus.APPROVED,
    isDeleted: false,
  };

  const now = new Date();

  if (criteria === "this-week") {
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    where.createdAt = { gte: weekAgo };
  } else if (criteria === "this-month") {
    const monthAgo = new Date(now);
    monthAgo.setMonth(now.getMonth() - 1);
    where.createdAt = { gte: monthAgo };
  } else if (days && days > 0) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    where.createdAt = { gte: startDate };
  }

  const ideas = await prisma.idea.findMany({
    where,
    orderBy: { upvoteCount: "desc" },
    take: validLimit,
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      upvoteCount: true,
      downvoteCount: true,
      viewCount: true,
      commentCount: true,
      images: true,
      createdAt: true,
      author: { select: { id: true, name: true, image: true, bio: true } },
      category: { select: { id: true, name: true, color: true, icon: true } },
    },
  });

  const testimonials: ITestimonial[] = ideas.map((idea) => {
    const images = idea.images as IImageData[] | null;
    const featuredImage = images?.[0]?.secureUrl || images?.[0]?.url || null;
    const netVotes = (idea.upvoteCount || 0) - (idea.downvoteCount || 0);
    const shortDescription =
      idea.description && idea.description.length > 150
        ? `${idea.description.substring(0, 150)}...`
        : idea.description || "";

    return {
      id: idea.id,
      title: idea.title,
      slug: idea.slug,
      description: shortDescription,
      fullDescription: idea.description,
      featuredImage,
      upvoteCount: idea.upvoteCount,
      downvoteCount: idea.downvoteCount,
      netVotes,
      viewCount: idea.viewCount,
      commentCount: idea.commentCount,
      createdAt: idea.createdAt,
      author: {
        id: idea.author.id,
        name: idea.author.name,
        image: idea.author.image,
        bio: idea.author.bio,
      },
      category: idea.category,
    };
  });

  ideaCache.set(cacheKey, testimonials, 2 * 60 * 1000);
  return testimonials;
};

// FIXED: Single query - NO N+1
export const getTestimonialById = async (
  ideaId: string,
): Promise<ITestimonialDetail | null> => {
  const cacheKey = `testimonial:${ideaId}`;
  const cached = ideaCache.get<ITestimonialDetail>(cacheKey);
  if (cached) return cached;

  const idea = await prisma.idea.findUnique({
    where: { id: ideaId, status: IdeaStatus.APPROVED, isDeleted: false },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      problem: true,
      solution: true,
      upvoteCount: true,
      downvoteCount: true,
      viewCount: true,
      commentCount: true,
      bookmarkCount: true,
      images: true,
      createdAt: true,
      updatedAt: true,
      author: {
        select: { id: true, name: true, email: true, image: true, bio: true },
      },
      category: {
        select: {
          id: true,
          name: true,
          color: true,
          icon: true,
          description: true,
        },
      },
      // ✅ NO N+1 - comments fetched in same query
      comments: {
        where: { isDeleted: false },
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          content: true,
          createdAt: true,
          user: { select: { id: true, name: true, image: true } },
        },
      },
    },
  });

  if (!idea) return null;

  const images = idea.images as IImageData[] | null;
  const featuredImage = images?.[0]?.secureUrl || images?.[0]?.url || null;
  const netVotes = (idea.upvoteCount || 0) - (idea.downvoteCount || 0);

  const result: ITestimonialDetail = {
    id: idea.id,
    title: idea.title,
    slug: idea.slug,
    description: idea.description,
    fullDescription: idea.description,
    featuredImage,
    upvoteCount: idea.upvoteCount,
    downvoteCount: idea.downvoteCount,
    netVotes,
    viewCount: idea.viewCount,
    commentCount: idea.commentCount,
    createdAt: idea.createdAt,
    problem: idea.problem,
    solution: idea.solution,
    bookmarkCount: idea.bookmarkCount,
    allImages: images,
    recentComments: idea.comments,
    author: idea.author,
    category: idea.category,
  };

  ideaCache.set(cacheKey, result, 5 * 60 * 1000);
  return result;
};

export const getTopVotedIdeas = async (
  limit: number = 3,
): Promise<ITestimonial[]> => {
  return getTestimonials(limit);
};

export interface ITestimonialStats {
  totalTestimonials: number;
  averageUpvotes: number;
  highestUpvotes: number;
  newThisMonth: number;
}

export const getTestimonialsStats = async (): Promise<ITestimonialStats> => {
  const cacheKey = "testimonials:stats";
  const cached = ideaCache.get<ITestimonialStats>(cacheKey);
  if (cached) return cached;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [totalTestimonials, avgUpvotesResult, maxUpvotesResult, newThisMonth] =
    await Promise.all([
      prisma.idea.count({
        where: {
          status: IdeaStatus.APPROVED,
          isDeleted: false,
          upvoteCount: { gte: 10 },
        },
      }),
      prisma.idea.aggregate({
        where: { status: IdeaStatus.APPROVED, isDeleted: false },
        _avg: { upvoteCount: true },
      }),
      prisma.idea.aggregate({
        where: { status: IdeaStatus.APPROVED, isDeleted: false },
        _max: { upvoteCount: true },
      }),
      prisma.idea.count({
        where: {
          status: IdeaStatus.APPROVED,
          isDeleted: false,
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
    ]);

  const result: ITestimonialStats = {
    totalTestimonials,
    averageUpvotes: Math.round(avgUpvotesResult._avg.upvoteCount || 0),
    highestUpvotes: maxUpvotesResult._max.upvoteCount || 0,
    newThisMonth,
  };

  ideaCache.set(cacheKey, result, 10 * 60 * 1000);
  return result;
};
