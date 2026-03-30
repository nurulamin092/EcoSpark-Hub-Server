/* eslint-disable @typescript-eslint/no-explicit-any */

import { prisma } from "../../lib/prisma";
import AppError from "../../errorHelpers/AppError";
import status from "http-status";
import { SettingType } from "../../../generated/prisma/enums";
import { Prisma } from "../../../generated/prisma/client";

const toPrismaJson = (
  value: any,
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput => {
  if (value === null || value === undefined) {
    return Prisma.JsonNull;
  }
  return value as Prisma.InputJsonValue;
};

const parseValueByType = (value: any, type: SettingType) => {
  switch (type) {
    case SettingType.STRING:
      return String(value);

    case SettingType.NUMBER:
      if (isNaN(Number(value))) {
        throw new AppError(status.BAD_REQUEST, "Invalid number value");
      }
      return Number(value);

    case SettingType.BOOLEAN:
      if (value === "true" || value === true) return true;
      if (value === "false" || value === false) return false;
      throw new AppError(status.BAD_REQUEST, "Invalid boolean value");

    case SettingType.JSON:
      return value;

    default:
      return value;
  }
};

const createSetting = async (payload: {
  key: string;
  value: any;
  type: SettingType;
  description?: string;
  isPublic?: boolean;
}) => {
  const existing = await prisma.setting.findUnique({
    where: { key: payload.key },
  });

  if (existing) {
    throw new AppError(status.BAD_REQUEST, "Setting already exists");
  }

  const parsedValue = parseValueByType(payload.value, payload.type);

  return prisma.setting.create({
    data: {
      key: payload.key,
      value: toPrismaJson(parsedValue),
      type: payload.type,
      description: payload.description,
      isPublic: payload.isPublic ?? false,
    },
  });
};

const updateSetting = async (
  key: string,
  payload: {
    value?: any;
    description?: string;
    isPublic?: boolean;
  },
) => {
  const setting = await prisma.setting.findUnique({
    where: { key },
  });

  if (!setting) {
    throw new AppError(status.NOT_FOUND, "Setting not found");
  }

  let updatedValue = setting.value;

  if (payload.value !== undefined) {
    updatedValue = parseValueByType(payload.value, setting.type);
  }

  return prisma.setting.update({
    where: { key },
    data: {
      value: toPrismaJson(updatedValue),
      description: payload.description ?? setting.description,
      isPublic: payload.isPublic ?? setting.isPublic,
    },
  });
};

const getSetting = async (key: string) => {
  const setting = await prisma.setting.findUnique({
    where: { key },
  });

  if (!setting) {
    throw new AppError(status.NOT_FOUND, "Setting not found");
  }

  return setting;
};

const getPublicSettings = async () => {
  return prisma.setting.findMany({
    where: { isPublic: true },
    orderBy: { createdAt: "desc" },
  });
};

const getAllSettings = async () => {
  return prisma.setting.findMany({
    orderBy: { createdAt: "desc" },
  });
};

const deleteSetting = async (key: string) => {
  const setting = await prisma.setting.findUnique({
    where: { key },
  });

  if (!setting) {
    throw new AppError(status.NOT_FOUND, "Setting not found");
  }

  return prisma.setting.delete({
    where: { key },
  });
};

export const SettingService = {
  createSetting,
  updateSetting,
  getSetting,
  getPublicSettings,
  getAllSettings,
  deleteSetting,
};
