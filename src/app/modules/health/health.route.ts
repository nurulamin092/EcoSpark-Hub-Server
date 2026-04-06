import { Router } from "express";
import {
  getHealth,
  getReadiness,
  getLiveness,
  getDetailedHealth,
} from "./health.controller";
import { globalRateLimiter } from "../../middleware/rateLimiter";
import { checkAuth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";

const router = Router();

// Public health endpoints (no auth required)
router.get("/", globalRateLimiter, getHealth);
router.get("/readiness", globalRateLimiter, getReadiness);
router.get("/liveness", globalRateLimiter, getLiveness);

// Detailed health check - Admin only (optional)
router.get(
  "/detailed",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  getDetailedHealth,
);

export const HealthRoutes = router;
