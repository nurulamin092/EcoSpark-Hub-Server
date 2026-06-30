// src/app/modules/admin/admin.interface.ts

import { Role, UserStatus } from "../../../generated/prisma/enums";

/* eslint-disable @typescript-eslint/no-explicit-any */

// ==================== Base Types ====================

export interface IUserRelation {
  id: string;
  email: string;
  role: Role;
  status: UserStatus;
  emailVerified: boolean;
  needPasswordChange: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMember {
  id: string;
  userId: string;
  name: string | null;
  profilePhoto: string | null;
  contactNumber: string | null;
  address: string | null;
  bio: string | null;
  isDeleted: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  user?: IUserRelation;
}

// ==================== DTO (Data Transfer Objects) ====================

export interface IUpdateMemberDTO {
  name?: string;
  profilePhoto?: string;
  contactNumber?: string;
  address?: string;
  bio?: string;
  status?: UserStatus;
}

export interface ICreateMemberDTO {
  userId: string;
  name?: string;
  profilePhoto?: string;
  contactNumber?: string;
  address?: string;
  bio?: string;
}

// ==================== Query & Filter Types ====================

export interface IMemberFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: UserStatus;
  role?: Role;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  fromDate?: Date;
  toDate?: Date;
  isDeleted?: boolean;
}

export interface IMemberQueryParams {
  page?: string;
  limit?: string;
  search?: string;
  status?: UserStatus;
  role?: Role;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  fromDate?: string;
  toDate?: string;
  isDeleted?: string;
}

// ==================== Response Types ====================

export interface IMemberStats {
  totalIdeas: number;
  totalVotes: number;
  totalComments: number;
  totalPayments: number;
  totalBookmarks: number;
  totalReports: number;
}

export interface IRecentIdea {
  id: string;
  title: string;
  status: string;
  upvoteCount: number;
  viewCount: number;
  createdAt: Date;
}

export interface IRecentActivity {
  id: string;
  action: string;
  entity: string;
  entityId?: string;
  createdAt: Date;
}

export interface IMemberWithDetails extends IMember {
  stats: IMemberStats;
  recentIdeas: IRecentIdea[];
  recentActivities: IRecentActivity[];
}

export interface IPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface IPaginatedResponse<T> {
  data: T[];
  meta: IPaginationMeta;
}

// ==================== Bulk Operation Types ====================

export type BulkActionType = "activate" | "deactivate" | "delete" | "export";

export interface IMemberBulkAction {
  ids: string[];
  action: BulkActionType;
}

export interface IBulkActionResult {
  success: number;
  failed: number;
  errors: Array<{
    id: string;
    error: string;
  }>;
}

// ==================== Export Types ====================

export type ExportFormat = "csv" | "json" | "excel";

export interface IMemberExportOptions {
  format: ExportFormat;
  fields?: (keyof IMember)[];
  filters?: IMemberFilters;
}

export interface IExportOptions {
  format: ExportFormat;
  startDate?: string;
  endDate?: string;
}

// ==================== Audit Types ====================

export interface IMemberAuditContext {
  userId?: string;
  userEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  action?: string;
  reason?: string;
  metadata?: Record<string, any>;
}

// ==================== Request/Response DTOs ====================

export interface IMemberListResponse {
  members: IMember[];
  pagination: IPaginationMeta;
  summary: {
    totalActive: number;
    totalInactive: number;
    totalBlocked: number;
    totalDeleted: number;
  };
}

export interface IMemberUpdateRequest {
  data: IUpdateMemberDTO;
  reason?: string;
}

export interface IMemberDeactivateRequest {
  reason: string;
}

// ==================== Constants ====================

export const DEFAULT_PAGINATION = {
  PAGE: 1,
  LIMIT: 10,
  MAX_LIMIT: 100,
  SORT_BY: "createdAt",
  SORT_ORDER: "desc" as const,
} as const;

export const ALLOWED_MEMBER_SORT_FIELDS = [
  "createdAt",
  "updatedAt",
  "name",
  "email",
  "status",
] as const;

export type MemberSortField = (typeof ALLOWED_MEMBER_SORT_FIELDS)[number];

// ==================== Helper Types ====================

export type MemberStatus = UserStatus;
export type MemberRole = Role;

export interface IMemberSearchParams {
  searchTerm?: string;
  searchFields?: (keyof IMember | keyof IUserRelation)[];
}

export interface IMemberActivitySummary {
  userId: string;
  memberId: string;
  name: string | null;
  email: string;
  activityScore: number;
  lastActiveAt: Date | null;
}

// ==================== Event Types for Webhooks/Notifications ====================

export interface IMemberActivatedEvent {
  memberId: string;
  userId: string;
  activatedBy: string;
  activatedAt: Date;
}

export interface IMemberDeactivatedEvent {
  memberId: string;
  userId: string;
  deactivatedBy: string;
  deactivatedAt: Date;
  reason: string;
}

export interface IMemberDeletedEvent {
  memberId: string;
  userId: string;
  deletedBy: string;
  deletedAt: Date;
  softDelete: boolean;
}

export interface IUpdateAdminPayload {
  admin?: {
    name?: string;
    profilePhoto?: string;
    contactNumber?: string;
    address?: string;
    bio?: string;
  };
  user?: {
    email?: string;
    status?: UserStatus;
    role?: Role;
  };
}
