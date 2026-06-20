import express, { Router } from "express";
import { PaymentController } from "./payment.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";

const router = Router();

router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  PaymentController.webhook,
);
router.post(
  "/checkout",
  checkAuth(Role.MEMBER),
  PaymentController.createPayment,
);

router.get("/me", checkAuth(Role.MEMBER), PaymentController.getMyPayments);


router.get(
  "/admin/all",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  PaymentController.getAllPaymentsForAdmin,
);

router.patch(
  "/admin/:paymentId/approve",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  PaymentController.approvePayment,
);

router.patch(
  "/admin/:paymentId/reject",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  PaymentController.rejectPayment,
);


export const PaymentRoutes: Router = router;
