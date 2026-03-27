/* eslint-disable @typescript-eslint/no-explicit-any */
import status from "http-status";
import { UserStatus } from "../../../generated/prisma/enums";
import AppError from "../../errorHelpers/AppError";

import { prisma } from "../../lib/prisma";
import { IUpdateAdminPayload } from "./admin.interface";
import { IRequestUser } from "../../interface/requestUser.interface";

const getAllAdmins = async (query: any) => {
  const { page = 1, limit = 10 } = query;

  const skip = (Number(page) - 1) * Number(limit);

  const [admins, total] = await Promise.all([
    prisma.admin.findMany({
      where: {
        isDeleted: false,
      },
      skip,
      take: Number(limit),
      orderBy: { createdAt: "desc" },
      include: {
        user: true,
      },
    }),
    prisma.admin.count({
      where: {
        isDeleted: false,
      },
    }),
  ]);

  return {
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
    data: admins,
  };
};
const getAdminById = async (id: string) => {
  const admin = await prisma.admin.findFirst({
    where: {
      id,
      isDeleted: false,
    },
    include: {
      user: true,
    },
  });

  if (!admin) {
    throw new AppError(status.NOT_FOUND, "Admin not found");
  }

  return admin;
};

const updateAdmin = async (id: string, payload: IUpdateAdminPayload) => {
  const isAdminExist = await prisma.admin.findUnique({
    where: { id },
  });

  if (!isAdminExist || isAdminExist.isDeleted) {
    throw new AppError(status.NOT_FOUND, "Admin not found");
  }

  const { admin } = payload;

  const updatedAdmin = await prisma.admin.update({
    where: { id },
    data: {
      ...admin,
    },
  });

  return updatedAdmin;
};

const deleteAdmin = async (id: string, user: IRequestUser) => {
  const isAdminExist = await prisma.admin.findUnique({
    where: { id },
  });

  if (!isAdminExist || isAdminExist.isDeleted) {
    throw new AppError(status.NOT_FOUND, "Admin not found");
  }

  if (isAdminExist.userId === user.userId) {
    throw new AppError(status.BAD_REQUEST, "You cannot delete yourself");
  }

  const result = await prisma.$transaction(async (tx) => {
    const admin = await tx.admin.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
      include: {
        user: true,
      },
    });

    await tx.user.update({
      where: { id: isAdminExist.userId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        status: UserStatus.DELETED,
      },
    });

    await tx.session.deleteMany({
      where: { userId: isAdminExist.userId },
    });

    await tx.account.deleteMany({
      where: { userId: isAdminExist.userId },
    });

    return admin;
  });

  return result;
};
export const AdminService = {
  getAllAdmins,
  getAdminById,
  updateAdmin,
  deleteAdmin,
};
