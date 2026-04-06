/* eslint-disable @typescript-eslint/no-explicit-any */

import { Role, UserStatus } from "../../../generated/prisma/enums";

export interface IUpdateAdminPayload {
  admin?: {
    name?: string;
    profilePhoto?: string;
    contactNumber?: string;
  };
}

export interface IUpdateMemberPayload {
  name?: string;
  email?: string;
  profilePhoto?: string;
  contactNumber?: string;
  address?: string;
  bio?: string;
  status?: UserStatus;
  role?: Role;
}

export interface IMemberFilter {
  page?: number;
  limit?: number;
  search?: string;
  status?: UserStatus;
  isActive?: boolean;
}

export interface IBulkActionPayload {
  ids: string[];
  feedback?: string;
}

export interface IExportOptions {
  format: "csv" | "json";
  startDate?: string;
  endDate?: string;
}

export interface IDashboardStats {
  users: number;
  ideas: number;
  ideaStatus: {
    approved: number;
    pending: number;
    rejected: number;
  };
  reports: number;
  revenue: number;
}

export interface IGrowthAnalytics {
  ideas: any[];
  revenue: any[];
}

export interface ISystemHealth {
  activeUsers24h: number;
  newIdeas24h: number;
  activeSessions: number;
  timestamp: Date;
}

export interface IMemberGrowthStats {
  last7Days: any[];
  totalActive: number;
  totalBlocked: number;
}
