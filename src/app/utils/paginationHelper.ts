// src/app/utils/paginationHelper.ts

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * @file paginationHelper.ts
 * @description Advanced pagination utility for Prisma queries
 * @version 2.0.0
 */

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  minPage?: number;
  maxLimit?: number;
  defaultLimit?: number;
}

export interface PaginationResult {
  page: number;
  limit: number;
  skip: number;
  take: number;
  sortBy: string;
  sortOrder: "asc" | "desc";
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  startIndex: number;
  endIndex: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

/**
 * Default pagination configuration
 */
const DEFAULT_CONFIG = {
  MIN_PAGE: 1,
  MAX_LIMIT: 100,
  DEFAULT_LIMIT: 10,
  DEFAULT_SORT_BY: "createdAt",
  DEFAULT_SORT_ORDER: "desc" as const,
};

/**
 * Main pagination helper function
 * @param page - Current page number (default: 1)
 * @param limit - Items per page (default: 10, max: 100)
 * @param options - Additional pagination options
 * @returns Pagination object with skip, take, page, limit
 */
export const paginationHelper = (
  page?: number,
  limit?: number,
  options?: Partial<PaginationOptions>,
): PaginationResult => {
  // Validate and sanitize page
  const validPage = Math.max(
    options?.minPage || DEFAULT_CONFIG.MIN_PAGE,
    Number(page) || 1,
  );

  // Validate and sanitize limit with max constraint
  const maxLimit = options?.maxLimit || DEFAULT_CONFIG.MAX_LIMIT;
  const defaultLimit = options?.defaultLimit || DEFAULT_CONFIG.DEFAULT_LIMIT;
  let validLimit = Number(limit) || defaultLimit;

  if (validLimit > maxLimit) {
    validLimit = maxLimit;
  }
  if (validLimit < 1) {
    validLimit = defaultLimit;
  }

  const skip = (validPage - 1) * validLimit;
  const take = validLimit;

  return {
    page: validPage,
    limit: validLimit,
    skip,
    take,
    sortBy: options?.sortBy || DEFAULT_CONFIG.DEFAULT_SORT_BY,
    sortOrder: options?.sortOrder || DEFAULT_CONFIG.DEFAULT_SORT_ORDER,
  };
};

/**
 * Generate pagination metadata
 * @param page - Current page
 * @param limit - Items per page
 * @param total - Total number of items
 * @returns Pagination metadata object
 */
export const generatePaginationMeta = (
  page: number,
  limit: number,
  total: number,
): PaginationMeta => {
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;
  const startIndex = (page - 1) * limit + 1;
  const endIndex = Math.min(page * limit, total);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage,
    hasPrevPage,
    startIndex,
    endIndex,
  };
};

/**
 * Create paginated response with data and metadata
 * @param data - Array of items
 * @param page - Current page
 * @param limit - Items per page
 * @param total - Total number of items
 * @returns Paginated response object
 */
export const createPaginatedResponse = <T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
): PaginatedResponse<T> => {
  return {
    data,
    meta: generatePaginationMeta(page, limit, total),
  };
};

/**
 * Advanced pagination builder for Prisma queries
 * @param query - Request query object
 * @param options - Pagination options
 * @returns Prisma-compatible pagination object
 */
export const buildPrismaPagination = (
  query: any,
  options?: Partial<PaginationOptions>,
): { skip: number; take: number; orderBy: any } => {
  const page = parseInt(query.page as string) || 1;
  const limit = parseInt(query.limit as string) || options?.defaultLimit || 10;
  const sortBy = (query.sortBy as string) || options?.sortBy || "createdAt";
  const sortOrder =
    (query.sortOrder as "asc" | "desc") || options?.sortOrder || "desc";

  const pagination = paginationHelper(page, limit, {
    ...options,
    sortBy,
    sortOrder,
  });

  return {
    skip: pagination.skip,
    take: pagination.take,
    orderBy: { [pagination.sortBy]: pagination.sortOrder },
  };
};

/**
 * Cursor-based pagination for infinite scrolling
 */
export interface CursorPaginationOptions {
  cursor?: string;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface CursorPaginationResult {
  take: number;
  skip?: number;
  cursor?: { id: string };
  orderBy: any;
}

export const cursorPaginationHelper = (
  options: CursorPaginationOptions,
): CursorPaginationResult => {
  const limit = Math.min(options.limit || 10, 100);
  const sortBy = options.sortBy || "createdAt";
  const sortOrder = options.sortOrder || "desc";

  const result: CursorPaginationResult = {
    take: sortOrder === "desc" ? -limit : limit,
    orderBy: { [sortBy]: sortOrder },
  };

  if (options.cursor) {
    result.cursor = { id: options.cursor };
    result.skip = 1; // Skip the cursor itself
  }

  return result;
};

/**
 * Get pagination info from headers (for API responses)
 */
export const getPaginationHeaders = (
  meta: PaginationMeta,
): Record<string, string> => {
  return {
    "X-Pagination-Page": meta.page.toString(),
    "X-Pagination-Limit": meta.limit.toString(),
    "X-Pagination-Total": meta.total.toString(),
    "X-Pagination-Total-Pages": meta.totalPages.toString(),
    "X-Pagination-Has-Next": meta.hasNextPage.toString(),
    "X-Pagination-Has-Prev": meta.hasPrevPage.toString(),
  };
};

/**
 * Validate pagination parameters
 * @param page - Page number to validate
 * @param limit - Limit to validate
 * @returns Validation result with errors
 */
export const validatePaginationParams = (
  page?: number,
  limit?: number,
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (page !== undefined && (page < 1 || !Number.isInteger(page))) {
    errors.push("Page must be a positive integer");
  }

  if (limit !== undefined) {
    if (limit < 1 || !Number.isInteger(limit)) {
      errors.push("Limit must be a positive integer");
    }
    if (limit > 100) {
      errors.push("Limit cannot exceed 100");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Parse pagination query parameters from request
 */
export const parsePaginationQuery = (query: any): PaginationOptions => {
  return {
    page: query.page ? parseInt(query.page) : undefined,
    limit: query.limit ? parseInt(query.limit) : undefined,
    sortBy: query.sortBy as string,
    sortOrder: query.sortOrder as "asc" | "desc",
  };
};

/**
 * Generate page range for pagination UI
 * @param currentPage - Current page number
 * @param totalPages - Total number of pages
 * @param maxVisible - Maximum visible page buttons (default: 5)
 * @returns Array of page numbers to display
 */
export const generatePageRange = (
  currentPage: number,
  totalPages: number,
  maxVisible: number = 5,
): (number | string)[] => {
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const halfVisible = Math.floor(maxVisible / 2);
  let startPage = Math.max(currentPage - halfVisible, 1);
  let endPage = startPage + maxVisible - 1;

  if (endPage > totalPages) {
    endPage = totalPages;
    startPage = Math.max(endPage - maxVisible + 1, 1);
  }

  const pages: (number | string)[] = [];

  if (startPage > 1) {
    pages.push(1);
    if (startPage > 2) pages.push("...");
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) pages.push("...");
    pages.push(totalPages);
  }

  return pages;
};

/**
 * Calculate offset for SQL queries (raw queries)
 */
export const calculateOffset = (page: number, limit: number): number => {
  return (Math.max(1, page) - 1) * Math.max(1, limit);
};

/**
 * Create pagination middleware for Express
 */
export const paginationMiddleware = (options?: Partial<PaginationOptions>) => {
  return (req: any, res: any, next: any) => {
    const pagination = paginationHelper(
      req.query.page,
      req.query.limit,
      options,
    );
    req.pagination = pagination;
    next();
  };
};

/**
 * Advanced pagination with aggregation support
 */
export interface AggregatedPaginationResult<T> extends PaginatedResponse<T> {
  aggregations: Record<string, any>;
}

export const createAggregatedPaginatedResponse = <T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
  aggregations: Record<string, any>,
): AggregatedPaginationResult<T> => {
  return {
    data,
    meta: generatePaginationMeta(page, limit, total),
    aggregations,
  };
};

/**
 * Offset-based pagination for large datasets with search
 */
export interface SearchPaginationOptions extends PaginationOptions {
  searchFields?: string[];
  searchTerm?: string;
}

export const buildSearchPaginationQuery = (
  options: SearchPaginationOptions,
): { skip: number; take: number; where?: any; orderBy: any } => {
  const pagination = paginationHelper(options.page, options.limit, options);
  const result: any = {
    skip: pagination.skip,
    take: pagination.take,
    orderBy: { [pagination.sortBy]: pagination.sortOrder },
  };

  if (
    options.searchTerm &&
    options.searchFields &&
    options.searchFields.length > 0
  ) {
    result.where = {
      OR: options.searchFields.map((field) => ({
        [field]: {
          contains: options.searchTerm,
          mode: "insensitive",
        },
      })),
    };
  }

  return result;
};

// Default export with all utilities
export default {
  paginationHelper,
  generatePaginationMeta,
  createPaginatedResponse,
  buildPrismaPagination,
  cursorPaginationHelper,
  getPaginationHeaders,
  validatePaginationParams,
  parsePaginationQuery,
  generatePageRange,
  calculateOffset,
  paginationMiddleware,
  createAggregatedPaginatedResponse,
  buildSearchPaginationQuery,
};
