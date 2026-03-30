import { Request, Response, NextFunction } from "express";
import { PaymentService } from "../modules/payment/payment.service";
import AppError from "../errorHelpers/AppError";
import status from "http-status";
import { prisma } from "../lib/prisma";

export const checkPaymentAccess = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    const ideaId = req.params.ideaId || req.params.id;
    const userId = req.user?.userId;

    const idea = await prisma.idea.findUnique({
      where: { id: ideaId as string },
      select: { isPaid: true, authorId: true },
    });

    if (!idea) {
      throw new AppError(status.NOT_FOUND, "Idea not found");
    }

    if (!idea.isPaid || idea.authorId === userId) {
      return next();
    }

    const hasAccess = await PaymentService.verifyPaymentAccess(
      userId,
      ideaId as string,
    );

    if (!hasAccess) {
      throw new AppError(status.FORBIDDEN, "Purchase required");
    }

    next();
  } catch (error) {
    next(error);
  }
};
