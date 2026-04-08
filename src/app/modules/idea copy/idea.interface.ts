/**
 * @file idea.interface.ts
 * @description TypeScript interfaces for Idea module
 * @version 3.0.0
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Interface for creating a new idea
 */
export interface ICreateIdeaPayload {
  /** Title of the idea (3-200 characters) */
  title: string;
  /** Problem statement (10-5000 characters) */
  problem: string;
  /** Proposed solution (10-5000 characters) */
  solution: string;
  /** Detailed description (20-10000 characters) */
  description: string;
  /** Category ID (must be valid UUID) */
  categoryId: string;
  /** Whether this is a paid/premium idea */
  isPaid?: boolean;
  /** Price for paid ideas (required if isPaid = true) */
  price?: number;
}

/**
 * Interface for updating an existing idea
 */
export interface IUpdateIdeaPayload {
  /** Updated title (3-200 characters) */
  title?: string;
  /** Updated problem statement (10-5000 characters) */
  problem?: string;
  /** Updated solution (10-5000 characters) */
  solution?: string;
  /** Updated description (20-10000 characters) */
  description?: string;
  /** Updated category ID */
  categoryId?: string;
  /** Updated paid status */
  isPaid?: boolean;
  /** Updated price */
  price?: number;
}

/**
 * Query filters for listing ideas
 */
export interface IIdeaFilters {
  /** Page number (default: 1) */
  page?: number;
  /** Items per page (default: 10, max: 50) */
  limit?: number;
  /** Search term for title/description/problem/solution */
  search?: string;
  /** Filter by category ID */
  category?: string;
  /** Filter by paid status */
  isPaid?: boolean;
  /** Sort method */
  sort?: "recent" | "top" | "commented" | "trending";
  /** Filter by status (admin only) */
  status?: "DRAFT" | "UNDER_REVIEW" | "APPROVED" | "REJECTED";
}

/**
 * Complete idea response structure
 */
export interface IIdeaResponse {
  id: string;
  title: string;
  slug: string;
  problem: string;
  solution: string;
  description: string;
  images?: any;
  attachments?: any;
  viewCount: number;
  upvoteCount: number;
  downvoteCount: number;
  commentCount: number;
  bookmarkCount: number;
  isPaid: boolean;
  price?: number;
  status: string;
  categoryId: string;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Paginated response metadata
 */
export interface IPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Paginated ideas response
 */
export interface IPaginatedIdeasResponse {
  meta: IPaginationMeta;
  data: IIdeaResponse[];
}
