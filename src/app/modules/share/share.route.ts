/**
 * @file share.route.ts
 * @description Route definitions for Share module
 * @version 1.0.0
 */

import { Router } from "express";
import * as ShareController from "./share.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";
import { validateRequest } from "../../middleware/validateRequest";
import { z } from "zod";
import { writeRateLimiter } from "../../middleware/rateLimiter";

const router = Router();

// Validation schemas
const trackShareSchema = z.object({
  entityType: z.enum(["IDEA", "BLOG"]),
  entityId: z.string().uuid(),
  platform: z.enum([
    "FACEBOOK",
    "TWITTER",
    "LINKEDIN",
    "WHATSAPP",
    "TELEGRAM",
    "EMAIL",
    "COPY_LINK",
  ]),
});

const bulkShareCountSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});

// ==================== Public Routes (No Auth) ====================

// Open Graph metadata for social media preview
router.get("/og/idea/:slug", ShareController.getIdeaOGMetadata);
router.get("/og/blog/:slug", ShareController.getBlogOGMetadata);

// Get share URLs for frontend buttons
router.get("/urls/idea/:slug", ShareController.getIdeaShareUrls);
router.get("/urls/blog/:slug", ShareController.getBlogShareUrls);

// Get share count
router.get("/count/:entityType/:entityId", ShareController.getShareCount);

// ==================== Protected Routes (Auth Optional for tracking) ====================

// Track share (auth optional - we still track if user is logged in)
router.post(
  "/track",
  writeRateLimiter,
  validateRequest(z.object({ body: trackShareSchema })),
  ShareController.trackShare,
);

// Bulk share counts
router.post(
  "/bulk/:entityType",
  validateRequest(z.object({ body: bulkShareCountSchema })),
  ShareController.getBulkShareCounts,
);

// ==================== Admin Routes ====================

// Get detailed share analytics
router.get(
  "/analytics/:entityType/:entityId",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  ShareController.getShareAnalytics,
);

export const ShareRoutes = router;
