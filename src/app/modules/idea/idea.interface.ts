/* eslint-disable @typescript-eslint/no-explicit-any */
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

export interface IIdeaFilters {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  isPaid?: boolean;
  sort?: "recent" | "top" | "commented" | "trending";
  status?: "DRAFT" | "UNDER_REVIEW" | "APPROVED" | "REJECTED";
}

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
