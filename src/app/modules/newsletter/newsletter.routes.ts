import { Router } from "express";
import { NewsletterController } from "./newsletter.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";

const router = Router();

router.post("/subscribe", NewsletterController.subscribe);

router.post("/unsubscribe", NewsletterController.unsubscribe);

router.get(
  "/",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  NewsletterController.getSubscribers,
);

export const NewsletterRoutes = router;
