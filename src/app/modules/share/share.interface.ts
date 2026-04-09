/**
 * @file share.interface.ts
 * @description TypeScript interfaces for Share module
 * @version 1.0.0
 */

import {
  SharePlatform,
  ShareEntityType,
} from "../../../generated/prisma/enums";

export interface ITrackSharePayload {
  entityType: ShareEntityType;
  entityId: string;
  platform: SharePlatform;
}

export interface IShareCountResponse {
  entityType: ShareEntityType;
  entityId: string;
  count: number;
  sharesByPlatform: {
    platform: SharePlatform;
    count: number;
  }[];
}

export interface IOpenGraphMetadata {
  title: string;
  description: string;
  image: string | null;
  url: string;
  type: "article" | "website";
  siteName: string;
  author?: string;
  publishedTime?: string;
  tags?: string[];
}

export interface IShareUrl {
  facebook: string;
  twitter: string;
  linkedin: string;
  whatsapp: string;
  telegram: string;
  email: string;
  copyLink: string;
}
