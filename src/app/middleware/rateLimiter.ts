/**
 * @file rateLimiter.ts
 * @description Rate limiting middleware configurations
 * @version 2.0.0
 */

import rateLimit, { RateLimitRequestHandler } from "express-rate-limit";
import { Request, Response } from "express";

const rateLimitHandler = (_req: Request, res: Response) => {
  res.status(429).json({
    success: false,
    message: "Too many requests, please try again later.",
  });
};

// ==================== IP-based Limiters (Fallback) ====================

export const globalRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

export const authRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

export const writeRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 50,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

// ==================== Export User-based Limiters ====================

export {
  userRateLimiter,
  strictUserRateLimiter,
  sensitiveOperationLimiter,
  authUserRateLimiter,
  createIdeaRateLimiter,
  commentRateLimiter,
  voteRateLimiter,
  paymentRateLimiter,
  adminRateLimiter,
  dynamicRateLimiter,
  redisClient,
  useRedis,
} from "./userRateLimiter";
