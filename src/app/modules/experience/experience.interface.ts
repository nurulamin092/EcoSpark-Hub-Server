/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file experience.interface.ts
 * @description TypeScript interfaces for User Experience module
 * @version 1.0.0
 */

import {
  ExperienceStatus,
  ExperienceResultType,
} from "../../../generated/prisma/enums";

export interface IMeasurableResult {
  type: ExperienceResultType;
  amount: number;
  unit: string;
  description?: string;
}

export interface ICreateExperiencePayload {
  ideaId: string;
  rating: number; // 1-10
  title: string;
  content: string;
  images?: any[];
  results?: IMeasurableResult[];
}

export interface IUpdateExperiencePayload {
  rating?: number;
  title?: string;
  content?: string;
  images?: any[];
  results?: IMeasurableResult[];
}

export interface IExperienceFilters {
  page?: number;
  limit?: number;
  ideaId?: string;
  userId?: string;
  minRating?: number;
  maxRating?: number;
  status?: ExperienceStatus;
  sort?: "recent" | "helpful" | "rating" | "mostLiked";
}

export interface IExperienceResponse {
  id: string;
  ideaId: string;
  userId: string;
  rating: number;
  title: string;
  content: string;
  images: any[] | null;
  results: IMeasurableResult[] | null;
  helpfulCount: number;
  likeCount: number;
  status: ExperienceStatus;
  isOwner?: boolean;
  hasUserVotedHelpful?: boolean;
  hasUserLiked?: boolean;
  author: {
    id: string;
    name: string;
    image: string | null;
  };
  idea: {
    id: string;
    title: string;
    slug: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface IExperienceStats {
  totalExperiences: number;
  averageRating: number;
  ratingDistribution: {
    rating: number;
    count: number;
  }[];
  totalHelpfulVotes: number;
  totalLikes: number;
  topRatedExperiences: IExperienceResponse[];
}
