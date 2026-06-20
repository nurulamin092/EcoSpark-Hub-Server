/* eslint-disable @typescript-eslint/no-explicit-any */

import { Request, Response } from "express";
import { PaymentService } from "./payment.service";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import status from "http-status";
import Stripe from "stripe";
import { stripe } from "../../config/stripe.config";

const createPayment = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentService.createCheckoutSession(
    req.user.userId,
    req.body.ideaId,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Stripe checkout session created",
    data: result,
  });
});

const getMyPayments = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentService.getMyPayments(req.user.userId);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Payments fetched successfully",
    data: result,
  });
});

const webhook = async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  if (!webhookSecret) {
    console.error("❌ STRIPE_WEBHOOK_SECRET is not configured");
    return res.status(status.INTERNAL_SERVER_ERROR).json({
      error: "Webhook secret not configured",
    });
  }

  if (!sig) {
    console.error("❌ No Stripe signature found in request");
    return res.status(status.BAD_REQUEST).json({
      error: "No signature found",
    });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error(`❌ Webhook signature verification failed: ${err.message}`);

    return res.status(status.OK).json({
      received: false,
      error: "Webhook signature verification failed",
    });
  }

  res.status(status.OK).json({ received: true });

  try {
    await PaymentService.handleWebhook(event);
    console.log(`✅ Webhook processed successfully: ${event.type}`);
  } catch (error) {
    console.error(`❌ Failed to process webhook ${event.type}:`, error);
  }
};

const verifyAccess = catchAsync(async (req: Request, res: Response) => {
  const { ideaId } = req.params;
  const hasAccess = await PaymentService.verifyPaymentAccess(
    req.user.userId,
    ideaId as string,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: hasAccess ? "Access granted" : "Access denied",
    data: { hasAccess },
  });
});

const getPaymentStatus = catchAsync(async (req: Request, res: Response) => {
  const { ideaId } = req.params;
  const payment = await PaymentService.getPaymentStatus(
    req.user.userId,
    ideaId as string,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Payment status fetched",
    data: payment,
  });
});

const getAllPaymentsForAdmin = catchAsync(
  async (req: Request, res: Response) => {
    const { status: statusFilter, page = 1, limit = 10 } = req.query;

    const result = await PaymentService.getAllPaymentsForAdmin({
      status: statusFilter as string | undefined,
      page: Number(page),
      limit: Number(limit),
    });

    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "All payments fetched successfully",
      data: result,
    });
  },
);

const approvePayment = catchAsync(async (req: Request, res: Response) => {
  const { paymentId } = req.params;

  const result = await PaymentService.approvePayment(
    paymentId as string,
    req.user.userId,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Payment approved successfully",
    data: result,
  });
});

const rejectPayment = catchAsync(async (req: Request, res: Response) => {
  const { paymentId } = req.params;
  const { reason } = req.body;

  const result = await PaymentService.rejectPayment(
    paymentId as string,
    req.user.userId,
    reason || "Payment rejected by admin",
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Payment rejected successfully",
    data: result,
  });
});

export const PaymentController = {
  createPayment,
  getMyPayments,
  webhook,
  verifyAccess,
  getPaymentStatus,
  getAllPaymentsForAdmin,
  approvePayment,
  rejectPayment,
};
