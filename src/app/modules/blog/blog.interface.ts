/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file blog.interface.ts
 * @description TypeScript interfaces for Blog module
 * @version 1.0.0
 */

import { BlogStatus } from "../../../generated/prisma/enums";

export interface ICreateBlogPayload {
  title: string;
  content: string;
  excerpt?: string;
  featuredImage?: string;
  images?: any[];
  videoUrl?: string;
  categoryId?: string;
  tags?: string[];
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
}

export interface IUpdateBlogPayload extends Partial<ICreateBlogPayload> {
  status?: BlogStatus;
  isFeatured?: boolean;
}

export interface IBlogFilters {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  tag?: string;
  status?: BlogStatus;
  sort?: "recent" | "popular" | "trending";
}

export interface IBlogResponse {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  featuredImage: string | null;
  viewCount: number;
  likeCount: number;
  shareCount: number;
  readTime: number | null;
  status: BlogStatus;
  isFeatured: boolean;
  author: {
    id: string;
    name: string;
    image: string | null;
  };
  category: {
    id: string;
    name: string;
    color: string | null;
  } | null;
  tags: { id: string; name: string }[];
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreateCommentPayload {
  content: string;
  blogId: string;
  parentId?: string;
}

export interface ICreateCategoryPayload {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  image?: string;
}

export interface ICreateTagPayload {
  name: string;
  description?: string;
}
