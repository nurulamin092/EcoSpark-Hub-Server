/**
 * @file admin.helpers.ts
 * @description Helper functions for Admin module
 * @version 1.0.0
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export const buildAdminWhereClause = (query: any) => {
  const where: any = { isDeleted: false };

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      {
        user: {
          email: { contains: query.search, mode: "insensitive" },
        },
      },
    ];
  }

  return where;
};

export const buildMemberWhereClause = (query: any) => {
  const where: any = {
    isDeleted: false,
    user: {},
  };

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { user: { email: { contains: query.search, mode: "insensitive" } } },
    ];
  }

  if (query.status) {
    where.user.status = query.status;
  }

  return where;
};

export const buildIdeaWhereClauseForAdmin = (query: any) => {
  const where: any = { isDeleted: false };

  if (query.status) {
    where.status = query.status;
  }

  if (query.search) {
    where.OR = [
      { title: { contains: query.search, mode: "insensitive" } },
      { description: { contains: query.search, mode: "insensitive" } },
    ];
  }

  return where;
};

export const getPaginationMeta = (
  page: number,
  limit: number,
  total: number,
) => {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
};
