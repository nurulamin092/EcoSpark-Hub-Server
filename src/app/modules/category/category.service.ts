/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "../../lib/prisma";
import slugify from "slugify";
import AppError from "../../errorHelpers/AppError";
import status from "http-status";

const createCategory = async (payload: any) => {
  const slug = slugify(payload.name, { lower: true });

  const exists = await prisma.category.findUnique({
    where: { slug },
  });

  if (exists) {
    throw new AppError(status.BAD_REQUEST, "Category already exists");
  }

  const category = await prisma.category.create({
    data: {
      ...payload,
      slug,
      isPredefined: true,
    },
  });

  return category;
};

const getAllCategories = async () => {
  return prisma.category.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
  });
};

const updateCategory = async (id: string, payload: any) => {
  const category = await prisma.category.findUnique({ where: { id } });

  if (!category) {
    throw new AppError(status.NOT_FOUND, "Category not found");
  }

  let slug;
  if (payload.name) {
    slug = slugify(payload.name, { lower: true });
  }

  const updated = await prisma.category.update({
    where: { id },
    data: {
      ...payload,
      ...(slug && { slug }),
    },
  });

  return updated;
};

const deleteCategory = async (id: string) => {
  const category = await prisma.category.findUnique({ where: { id } });

  if (!category) {
    throw new AppError(status.NOT_FOUND, "Category not found");
  }

  await prisma.category.update({
    where: { id },
    data: {
      isActive: false,
    },
  });

  return null;
};

export const CategoryService = {
  createCategory,
  getAllCategories,
  updateCategory,
  deleteCategory,
};
