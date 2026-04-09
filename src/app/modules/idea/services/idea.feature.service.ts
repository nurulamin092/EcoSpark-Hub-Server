/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file idea.feature.service.ts
 * @description Additional features for Idea module
 * @version 1.0.0
 */

import { prisma } from "../../../lib/prisma";
import { selectIdeaFields } from "../utils/idea.helpers";
import { ideaCache } from "../utils/idea.cache";
import { IdeaStatus } from "../../../../generated/prisma/enums";
import { ITestimonial } from "../idea.interface";
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
 * Get top voted ideas for testimonials (Home page section)
 * @param limit - Number of testimonials to return (default: 3, max: 10)
 * @param days - Optional: only ideas created within last N days
 * @param criteria - 'all-time', 'this-month', 'this-week'
 */

export const getTestimonials = async (
  limit: number = 3,
  days?: number,
  criteria?: "all-time" | "this-month" | "this-week",
): Promise<ITestimonial[]> => {
  // ← টাইপ যোগ করুন
  // Validate limit
  const validLimit = Math.min(Math.max(limit, 1), 10);

  const cacheKey = `ideas:testimonials:${validLimit}:${days || criteria || "all"}`;
  const cached = ideaCache.get<ITestimonial[]>(cacheKey); // ← টাইপ যোগ করুন
  if (cached) return cached;

  const where: any = {
    status: IdeaStatus.APPROVED,
    isDeleted: false,
  };

  // Apply date filters based on criteria or days
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
      author: {
        select: {
          id: true,
          name: true,
          image: true,
          bio: true,
        },
      },
      category: {
        select: {
          id: true,
          name: true,
          color: true,
          icon: true,
        },
      },
    },
  });

  // Transform data for testimonials format with proper typing
  const testimonials: ITestimonial[] = ideas.map((idea) => {
    // ← টাইপ যোগ করুন
    // Get first image as featured image
    let featuredImage = null;
    if (Array.isArray(idea.images) && idea.images.length > 0) {
      const firstImage = idea.images[0] as any;
      featuredImage = firstImage?.secureUrl || null;
    }

    // Calculate net votes
    const netVotes = (idea.upvoteCount || 0) - (idea.downvoteCount || 0);

    // Shorten description for testimonial card
    const shortDescription =
      idea.description && idea.description.length > 150
        ? `${idea.description.substring(0, 150)}...`
        : idea.description;

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

  // Cache for 2 minutes
  ideaCache.set(cacheKey, testimonials, 2 * 60 * 1000);

  return testimonials;
};

/**
 * Get single testimonial by idea ID
 */
export const getTestimonialById = async (ideaId: string) => {
  const cacheKey = `testimonial:${ideaId}`;
  const cached = ideaCache.get(cacheKey);
  if (cached) return cached;

  const idea = await prisma.idea.findUnique({
    where: {
      id: ideaId,
      status: IdeaStatus.APPROVED,
      isDeleted: false,
    },
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
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          bio: true,
        },
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
    },
  });

  if (!idea) {
    return null;
  }

  // Get recent comments for this testimonial
  const recentComments = await prisma.comment.findMany({
    where: { ideaId, isDeleted: false },
    take: 5,
    orderBy: { createdAt: "desc" },
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

  const testimonial = {
    ...idea,
    netVotes: (idea.upvoteCount || 0) - (idea.downvoteCount || 0),
    featuredImage:
      Array.isArray(idea.images) && idea.images.length > 0
        ? (idea.images[0] as any)?.secureUrl
        : null,
    allImages: idea.images,
    recentComments,
  };

  ideaCache.set(cacheKey, testimonial, 5 * 60 * 1000);
  return testimonial;
};

/**
 * Get top voted ideas (alias for backward compatibility)
 */
export const getTopVotedIdeas = async (limit: number = 3) => {
  return getTestimonials(limit);
};

/**
 * Get testimonials statistics for dashboard
 */
export const getTestimonialsStats = async () => {
  const cacheKey = "testimonials:stats";
  const cached = ideaCache.get(cacheKey);
  if (cached) return cached;

  const stats = await prisma.$transaction([
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
      _max: { upvoteCount: true },
    }),
    prisma.idea.count({
      where: {
        status: IdeaStatus.APPROVED,
        isDeleted: false,
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  const result = {
    totalTestimonials: stats[0],
    averageUpvotes: Math.round(stats[1]._avg.upvoteCount || 0),
    highestUpvotes: stats[1]._max.upvoteCount || 0,
    newThisMonth: stats[2],
  };

  ideaCache.set(cacheKey, result, 10 * 60 * 1000);
  return result;
};
