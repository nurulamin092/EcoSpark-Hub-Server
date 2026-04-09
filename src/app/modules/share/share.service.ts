/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file share.service.ts
 * @description Service layer for Share module
 * @version 1.0.0
 */

import { prisma } from "../../lib/prisma";
import { Prisma } from "../../../generated/prisma/client";
import { ShareEntityType } from "../../../generated/prisma/enums";
import {
  ITrackSharePayload,
  IOpenGraphMetadata,
  IShareUrl,
} from "./share.interface";
import { envVars } from "../../config/env";

// ==================== Share Tracking ====================

export const trackShare = async (
  userId: string | undefined,
  ipAddress: string | undefined,
  userAgent: string | undefined,
  payload: ITrackSharePayload,
) => {
  // Track individual share
  const share = await prisma.shareAnalytics.create({
    data: {
      entityType: payload.entityType,
      entityId: payload.entityId,
      platform: payload.platform,
      userId: userId || null,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
    },
  });

  // Update or create share count
  await prisma.$executeRaw`
    INSERT INTO share_counts ("entityType", "entityId", count, "updatedAt")
    VALUES (${payload.entityType}::text, ${payload.entityId}, 1, NOW())
    ON CONFLICT ("entityType", "entityId") 
    DO UPDATE SET 
      count = share_counts.count + 1,
      "updatedAt" = NOW()
  `;

  // Also update the source entity (Idea or Blog)
  if (payload.entityType === ShareEntityType.IDEA) {
    try {
      await prisma.$executeRaw`
        UPDATE ideas 
        SET "shareCount" = COALESCE("shareCount", 0) + 1
        WHERE id = ${payload.entityId}
      `;
    } catch (error) {
      // If column doesn't exist, log warning but don't fail
      console.warn("shareCount column may not exist in ideas table:", error);
    }
  } else if (payload.entityType === ShareEntityType.BLOG) {
    try {
      await prisma.$executeRaw`
        UPDATE blogs 
        SET "shareCount" = COALESCE("shareCount", 0) + 1
        WHERE id = ${payload.entityId}
      `;
    } catch (error) {
      console.warn("shareCount column may not exist in blogs table:", error);
    }
  }

  return share;
};

// ==================== Share Count ====================

export const getShareCount = async (
  entityType: ShareEntityType,
  entityId: string,
) => {
  const shareCount = await prisma.shareCount.findUnique({
    where: { entityType_entityId: { entityType, entityId } },
  });

  // Get shares by platform
  const sharesByPlatform = await prisma.shareAnalytics.groupBy({
    by: ["platform"],
    where: { entityType, entityId },
    _count: { platform: true },
  });

  return {
    entityType,
    entityId,
    count: shareCount?.count || 0,
    sharesByPlatform: sharesByPlatform.map((item) => ({
      platform: item.platform,
      count: item._count.platform,
    })),
  };
};

export const getBulkShareCounts = async (
  entityType: ShareEntityType,
  entityIds: string[],
) => {
  const shareCounts = await prisma.shareCount.findMany({
    where: {
      entityType,
      entityId: { in: entityIds },
    },
  });

  const countMap = new Map<string, number>();
  shareCounts.forEach((sc) => {
    countMap.set(sc.entityId, sc.count);
  });

  return entityIds.map((id) => ({
    entityId: id,
    count: countMap.get(id) || 0,
  }));
};

// ==================== Open Graph Metadata ====================

export const getIdeaOGMetadata = async (
  slug: string,
): Promise<IOpenGraphMetadata | null> => {
  const idea = await prisma.idea.findUnique({
    where: { slug, status: "APPROVED", isDeleted: false },
    include: {
      author: { select: { name: true } },
      category: { select: { name: true } },
    },
  });

  if (!idea) return null;

  const firstImage =
    Array.isArray(idea.images) && idea.images.length > 0
      ? (idea.images[0] as any)?.secureUrl
      : null;

  return {
    title:
      idea.title.length > 60 ? `${idea.title.substring(0, 57)}...` : idea.title,
    description:
      idea.description && idea.description.length > 160
        ? `${idea.description.substring(0, 157)}...`
        : idea.description ||
          "Check out this amazing sustainability idea on EcoSpark Hub!",
    image: firstImage,
    url: `${envVars.FRONTEND_URL}/ideas/${idea.slug}`,
    type: "article",
    siteName: "EcoSpark Hub",
    author: idea.author.name,
    publishedTime:
      idea.publishedAt?.toISOString() || idea.createdAt.toISOString(),
    tags: [idea.category?.name].filter(Boolean) as string[],
  };
};

export const getBlogOGMetadata = async (
  slug: string,
): Promise<IOpenGraphMetadata | null> => {
  const blog = await prisma.blog.findUnique({
    where: { slug, status: "PUBLISHED", isDeleted: false },
    include: {
      author: { select: { name: true } },
      category: { select: { name: true } },
      tags: { include: { tag: true } },
    },
  });

  if (!blog) return null;

  return {
    title:
      blog.title.length > 60 ? `${blog.title.substring(0, 57)}...` : blog.title,
    description:
      blog.excerpt && blog.excerpt.length > 160
        ? `${blog.excerpt.substring(0, 157)}...`
        : blog.excerpt || "Read this insightful blog post on EcoSpark Hub!",
    image: blog.featuredImage,
    url: `${envVars.FRONTEND_URL}/blogs/${blog.slug}`,
    type: "article",
    siteName: "EcoSpark Hub",
    author: blog.author.name,
    publishedTime:
      blog.publishedAt?.toISOString() || blog.createdAt.toISOString(),
    tags: [blog.category?.name, ...blog.tags.map((t) => t.tag.name)].filter(
      Boolean,
    ) as string[],
  };
};

// ==================== Share URLs Generation ====================

export const generateShareUrls = (
  url: string,
  title: string,
  description?: string,
): IShareUrl => {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const encodedDescription = encodeURIComponent(description || title);

  return {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    whatsapp: `https://wa.me/?text=${encodedTitle}%20-%20${encodedUrl}`,
    telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
    email: `mailto:?subject=${encodedTitle}&body=${encodedDescription}%0A%0A${encodedUrl}`,
    copyLink: url,
  };
};

export const getIdeaShareUrls = async (
  slug: string,
): Promise<IShareUrl | null> => {
  const idea = await prisma.idea.findUnique({
    where: { slug, status: "APPROVED", isDeleted: false },
    select: { title: true, description: true },
  });

  if (!idea) return null;

  const url = `${envVars.FRONTEND_URL}/ideas/${slug}`;
  return generateShareUrls(url, idea.title, idea.description || undefined);
};

export const getBlogShareUrls = async (
  slug: string,
): Promise<IShareUrl | null> => {
  const blog = await prisma.blog.findUnique({
    where: { slug, status: "PUBLISHED", isDeleted: false },
    select: { title: true, excerpt: true },
  });

  if (!blog) return null;

  const url = `${envVars.FRONTEND_URL}/blogs/${slug}`;
  return generateShareUrls(url, blog.title, blog.excerpt || undefined);
};

// ==================== Share Analytics ====================

export const getShareAnalytics = async (
  entityType: ShareEntityType,
  entityId: string,
  startDate?: Date,
  endDate?: Date,
) => {
  const where: any = { entityType, entityId };

  if (startDate) where.createdAt = { gte: startDate };
  if (endDate) where.createdAt = { ...where.createdAt, lte: endDate };

  const shares = await prisma.shareAnalytics.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const sharesByPlatform = await prisma.shareAnalytics.groupBy({
    by: ["platform"],
    where,
    _count: { platform: true },
  });

  const sharesByDay = await prisma.$queryRaw<{ date: Date; count: bigint }[]>`
    SELECT DATE("createdAt") as date, COUNT(*)::bigint as count
    FROM share_analytics
    WHERE "entityType" = ${entityType}::text
      AND "entityId" = ${entityId}
      ${startDate ? Prisma.sql`AND "createdAt" >= ${startDate}` : Prisma.empty}
      ${endDate ? Prisma.sql`AND "createdAt" <= ${endDate}` : Prisma.empty}
    GROUP BY DATE("createdAt")
    ORDER BY date DESC
    LIMIT 30
  `;

  return {
    totalShares: shares.length,
    sharesByPlatform: sharesByPlatform.map((item) => ({
      platform: item.platform,
      count: item._count.platform,
    })),
    sharesByDay: sharesByDay.map((day) => ({
      date: day.date,
      count: Number(day.count),
    })),
    recentShares: shares.slice(0, 20),
  };
};
