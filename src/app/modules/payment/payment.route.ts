import { Router } from "express";
import { PaymentController } from "./payment.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";

const router = Router();

router.post(
  "/checkout",
  checkAuth(Role.MEMBER),
  PaymentController.createPayment,
);

router.get("/me", checkAuth(Role.MEMBER), PaymentController.getMyPayments);

export const PaymentRoutes = router;
