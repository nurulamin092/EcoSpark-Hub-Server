import Stripe from "stripe";
import { prisma } from "../../lib/prisma";
import AppError from "../../errorHelpers/AppError";
import status from "http-status";
import { stripe } from "../../config/stripe.config";
import {
  PaymentStatus,
  PaymentProvider,
  NotificationType,
} from "../../../generated/prisma/enums";
import { NotificationService } from "../notification/notification.service";

interface CheckoutSessionResult {
  url: string;
  sessionId: string;
}

const createCheckoutSession = async (
  userId: string,
  ideaId: string,
): Promise<CheckoutSessionResult> => {
  const existingPayment = await prisma.payment.findFirst({
    where: {
      userId,
      ideaId,
      status: PaymentStatus.SUCCESS,
    },
  });

  if (existingPayment) {
    throw new AppError(status.BAD_REQUEST, "You already purchased this idea");
  }

  const idea = await prisma.idea.findUnique({
    where: { id: ideaId },
  });

  if (!idea || idea.isDeleted) {
    throw new AppError(status.NOT_FOUND, "Idea not found");
  }

  if (!idea.isPaid || !idea.price) {
    throw new AppError(status.BAD_REQUEST, "This idea is free");
  }

  let payment = await prisma.payment.findFirst({
    where: {
      userId,
      ideaId,
      status: PaymentStatus.PENDING,
    },
  });

  if (!payment) {
    payment = await prisma.payment.create({
      data: {
        userId,
        ideaId,
        amount: idea.price,
        status: PaymentStatus.PENDING,
        provider: PaymentProvider.STRIPE,
      },
    });
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
    metadata: {
      userId,
      ideaId,
      paymentId: payment.id,
    },
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: idea.title,
            description: idea.description?.slice(0, 100),
          },
          unit_amount: Number(idea.price) * 100,
        },
        quantity: 1,
      },
    ],
  });

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      transactionId: session.id,
      stripeSessionId: session.id,
    },
  });

  return {
    url: session.url!,
    sessionId: session.id,
  };
};

const handleWebhook = async (event: Stripe.Event) => {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;

      const userId = session.metadata?.userId;
      const ideaId = session.metadata?.ideaId;
      const paymentId = session.metadata?.paymentId;

      if (!userId || !ideaId || !paymentId) {
        throw new AppError(status.BAD_REQUEST, "Missing metadata");
      }

      const updatedPayment = await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.SUCCESS,
          transactionId: session.id,
          stripeSessionId: session.id,
          stripePaymentIntentId:
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : null,
          paymentMethod: "card",
          accessExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          metadata: {
            customerEmail: session.customer_details?.email || null,
          },
        },
      });

      await NotificationService.createNotification(
        userId,
        NotificationType.PAYMENT_SUCCESS,
        "Payment Successful 💰",
        "You unlocked a premium idea",
        {
          ideaId,
          paymentId: updatedPayment.id,
        },
      );

      break;
    }

    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;

      await prisma.payment.updateMany({
        where: {
          stripeSessionId: session.id,
          status: PaymentStatus.PENDING,
        },
        data: {
          status: PaymentStatus.FAILED,
        },
      });

      break;
    }

    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;

      const paymentIntentId =
        typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : null;

      if (!paymentIntentId) return;

      await prisma.payment.updateMany({
        where: {
          stripePaymentIntentId: paymentIntentId,
        },
        data: {
          status: PaymentStatus.REFUNDED,
          refundAmount: charge.amount_refunded / 100,
          refundReason: charge.refunded ? "Refund processed" : "Unknown reason",
        },
      });

      break;
    }
  }
};

const getMyPayments = async (userId: string) => {
  return prisma.payment.findMany({
    where: { userId },
    include: {
      idea: {
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

const verifyPaymentAccess = async (userId: string, ideaId: string) => {
  const payment = await prisma.payment.findFirst({
    where: {
      userId,
      ideaId,
      status: PaymentStatus.SUCCESS,
      OR: [{ accessExpiresAt: null }, { accessExpiresAt: { gt: new Date() } }],
    },
  });

  return !!payment;
};

const getPaymentStatus = async (userId: string, ideaId: string) => {
  return prisma.payment.findFirst({
    where: { userId, ideaId },
    orderBy: { createdAt: "desc" },
  });
};

export const PaymentService = {
  createCheckoutSession,
  handleWebhook,
  getMyPayments,
  verifyPaymentAccess,
  getPaymentStatus,
};
