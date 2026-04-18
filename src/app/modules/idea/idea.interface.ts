/**
 * @file idea.interface.ts
 * @description TypeScript interfaces for Idea module
 * @version 3.0.0
 */

import { Prisma } from "../../../generated/prisma/client";
import { IdeaStatus } from "../../../generated/prisma/enums";
import { IImageData } from "./utils/idea.helpers";

// ==================== Payload Types ====================

export interface ICreateIdeaPayload {
  title: string;
  problem: string;
  solution: string;
  description: string;
  categoryId: string;
  isPaid?: boolean;
  price?: number;
}

export interface IUpdateIdeaPayload {
  title?: string;
  problem?: string;
  solution?: string;
  description?: string;
  categoryId?: string;
  isPaid?: boolean;
  price?: number;
}

// ==================== Query Types ====================

export interface GetAllIdeasQuery {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  isPaid?: string;
  sort?: "recent" | "top" | "commented";
}

// ==================== Response Types ====================

export interface IIdeaAuthor {
  id: string;
  name: string;
  email: string;
  image: string | null;
  bio: string | null;
}

export interface IIdeaCategory {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  description: string | null;
}

export interface IIdeaSimpleCategory {
  id: string;
  name: string;
  color: string | null;
}

export interface IIdeaSimpleAuthor {
  id: string;
  name: string;
  image: string | null;
}

export interface IIdeaReviewer {
  id: string;
  name: string;
}

export interface IIdeaWithLockStatus {
  id: string;
  title: string;
  slug: string;
  problem: string;
  solution: string;
  description: string;
  images: IImageData[] | null;
  attachments: unknown;
  viewCount: number;
  upvoteCount: number;
  downvoteCount: number;
  commentCount: number;
  bookmarkCount: number;
  isPaid: boolean;
  price: number | null;
  status: string;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  publishedAt: Date | null;
  adminFeedback: string | null;
  isFeatured: boolean;
  createdAt: Date;
  updatedAt: Date;
  author: IIdeaAuthor;
  category: IIdeaCategory;
  reviewer: IIdeaReviewer | null;
  isLocked?: boolean;
}

export interface IUserIdea {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: IdeaStatus;
  upvoteCount: number;
  downvoteCount: number;
  viewCount: number;
  isPaid: boolean;
  price: number | null;
  createdAt: Date;
  category: IIdeaSimpleCategory | null;
}

export interface ICategoryIdea {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  upvoteCount: number;
  downvoteCount: number;
  viewCount: number;
  isPaid: boolean;
  price: number | null;
  createdAt: Date;
  author: IIdeaSimpleAuthor;
}

export interface PaginatedResult<T> {
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  data: T[];
}

// ==================== Testimonial Types ====================

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

export interface ITestimonialStats {
  totalTestimonials: number;
  averageUpvotes: number;
  highestUpvotes: number;
  newThisMonth: number;
}

// ==================== Type Alias for Prisma ====================

export type IdeaWithRelations = Prisma.IdeaGetPayload<{
  select: {
    id: true;
    title: true;
    slug: true;
    description: true;
    images: true;
    viewCount: true;
    upvoteCount: true;
    downvoteCount: true;
    commentCount: true;
    bookmarkCount: true;
    isPaid: true;
    price: true;
    status: true;
    createdAt: true;
    updatedAt: true;
    category: { select: { id: true; name: true; color: true; icon: true } };
    author: { select: { id: true; name: true; image: true } };
  };
}>;
