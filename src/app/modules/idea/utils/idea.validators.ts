/**
 * @file idea.validators.ts
 * @description Validation helpers for Idea module
 * @version 1.0.0
 */

import { prisma } from "../../../lib/prisma";
import AppError from "../../../errorHelpers/AppError";
import status from "http-status";

/**
 * Validate category exists and is active
 */
export const validateCategory = async (categoryId: string): Promise<void> => {
  const category = await prisma.category.findUnique({
    where: { id: categoryId, isActive: true },
    select: { id: true },
  });

  if (!category) {
    throw new AppError(status.BAD_REQUEST, "Invalid or inactive category");
  }
};

/**
 * Validate price for paid ideas
 */
export const validatePriceForPaidIdea = (
  isPaid?: boolean,
  price?: number | null,
): void => {
  if (isPaid) {
    if (!price || price <= 0) {
      throw new AppError(
        status.BAD_REQUEST,
        "Price must be greater than 0 for paid ideas",
      );
    }
    if (price > 999999.99) {
      throw new AppError(status.BAD_REQUEST, "Price cannot exceed 999,999.99");
    }
  }
};

/**
 * Check if user has access to paid idea
 */
// export const checkPaidIdeaAccess = async (
//   userId: string | undefined,
//   ideaId: string,
// ): Promise<boolean> => {
//   if (!userId) return false;

//   const payment = await prisma.payment.findFirst({
//     where: {
//       userId,
//       ideaId,
//       status: "SUCCESS",
//       OR: [{ accessExpiresAt: null }, { accessExpiresAt: { gt: new Date() } }],
//     },
//     select: { id: true },
//   });

//   return !!payment;
// };

// src/app/modules/idea/utils/idea.validators.ts

export const checkPaidIdeaAccess = async (
  userId: string,
  ideaId: string,
): Promise<boolean> => {
  if (!userId || !ideaId) {
    console.warn(`⚠️ checkPaidIdeaAccess: missing userId or ideaId`);
    return false;
  }

  try {
    const payment = await prisma.payment.findFirst({
      where: {
        userId: userId,
        ideaId: ideaId,
        status: "SUCCESS",
        OR: [
          { accessExpiresAt: null },
          { accessExpiresAt: { gt: new Date() } },
        ],
      },
      select: { id: true, status: true, accessExpiresAt: true },
    });

    if (payment) {
      console.log(
        `✅ Found valid payment ${payment.id} for user ${userId}, idea ${ideaId}, status ${payment.status}, expires ${payment.accessExpiresAt}`,
      );
      return true;
    } else {
      console.log(
        `❌ No valid payment found for user ${userId}, idea ${ideaId}`,
      );
      return false;
    }
  } catch (error) {
    console.error(
      `❌ Error checking payment access for user ${userId}, idea ${ideaId}:`,
      error,
    );
    return false;
  }
};
