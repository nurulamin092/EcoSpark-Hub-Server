/* eslint-disable @typescript-eslint/no-explicit-any */

import { prisma } from "../../lib/prisma";
import AppError from "../../errorHelpers/AppError";
import status from "http-status";
import { ReportStatus } from "../../../generated/prisma/enums";

const createReport = async (userId: string, payload: any) => {
  const { type, ideaId, commentId, reason, description } = payload;

  if (type === "IDEA" && !ideaId) {
    throw new AppError(status.BAD_REQUEST, "ideaId required");
  }

  if (type === "COMMENT" && !commentId) {
    throw new AppError(status.BAD_REQUEST, "commentId required");
  }

  return prisma.report.create({
    data: {
      reporterId: userId,
      type,
      ideaId: ideaId || null,
      commentId: commentId || null,
      reason,
      description,
    },
  });
};

const getAllReports = async () => {
  return prisma.report.findMany({
    include: {
      reporter: true,
      idea: true,
      comment: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

const updateReportStatus = async (
  adminId: string,
  reportId: string,
  statusUpdate: ReportStatus,
  notes?: string,
) => {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
  });

  if (!report) {
    throw new AppError(status.NOT_FOUND, "Report not found");
  }

  return prisma.report.update({
    where: { id: reportId },
    data: {
      status: statusUpdate,
      resolvedBy: adminId,
      resolvedAt: new Date(),
      notes,
    },
  });
};

export const ReportService = {
  createReport,
  getAllReports,
  updateReportStatus,
};
