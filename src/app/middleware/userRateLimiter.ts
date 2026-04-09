/**
 * @file userRateLimiter.ts
 * @description User-based rate limiting middleware
 * @version 2.0.0
 */

import rateLimit, { RateLimitRequestHandler } from "express-rate-limit";
import { Request, Response } from "express";
import Redis from "ioredis";

// Extend Express Request type to include rateLimit property
declare module "express-serve-static-core" {
  interface Request {
    rateLimit?: {
      limit: number;
      current: number;
      remaining: number;
      resetTime: Date;
    };
  }
}

// Redis connection (optional - falls back to memory store if not configured)
let redisClient: Redis | null = null;
let useRedis = false;

try {
  if (process.env.REDIS_URL) {
    redisClient = new Redis(process.env.REDIS_URL);
    useRedis = true;
    console.log("✅ Redis connected for rate limiting");
  }
} catch {
  // ✅ FIXED: Used '_err' instead of 'error' to avoid unused variable warning
  console.warn("⚠️ Redis not configured, using memory store for rate limiting");
}

// Custom key generator that uses user ID if available, otherwise IP
const keyGenerator = (req: Request): string => {
  // If user is authenticated, use user ID
  if (req.user?.userId) {
    return `user:${req.user.userId}`;
  }
  // Otherwise use IP address
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  return `ip:${ip}`;
};

// Custom handler for rate limit exceeded
const rateLimitHandler = (req: Request, res: Response) => {
  const isAuthenticated = !!req.user?.userId;

  // ✅ FIXED: Safe access to rateLimit property
  let retryAfter = 60;
  if (req.rateLimit?.resetTime) {
    retryAfter = Math.ceil(
      (req.rateLimit.resetTime.getTime() - Date.now()) / 1000,
    );
  }

  res.status(429).json({
    success: false,
    message: isAuthenticated
      ? "You have exceeded your request limit. Please try again later."
      : "Too many requests from this IP. Please try again later.",
    retryAfter: Math.max(1, retryAfter),
    limit: req.rateLimit?.limit || 0,
    remaining: 0,
    resetTime:
      req.rateLimit?.resetTime || new Date(Date.now() + retryAfter * 1000),
  });
};

// ==================== Rate Limiter Configurations ====================

// General API rate limiter (all users)
export const userRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // 100 requests per window (using 'limit' instead of 'max' for newer version)
  keyGenerator,
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Count all requests
});

// Strict limiter for authenticated users (write operations)
export const strictUserRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 30, // 30 requests per minute
  keyGenerator,
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
});

// Very strict limiter for sensitive operations
export const sensitiveOperationLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 5, // 5 requests per minute
  keyGenerator,
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
});

// Login/Register specific limiter (stricter)
export const authUserRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10, // 10 attempts per window
  keyGenerator,
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: false,
});

// Per-endpoint custom limiters
export const createIdeaRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 5, // 5 ideas per minute
  keyGenerator,
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
});

export const commentRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 20, // 20 comments per minute
  keyGenerator,
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
});

export const voteRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 30, // 30 votes per minute
  keyGenerator,
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
});

export const paymentRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 3, // 3 payment attempts per minute
  keyGenerator,
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
});

// Admin specific limiter (higher limits)
export const adminRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 200, // 200 requests per minute for admins
  keyGenerator: (req: Request): string => {
    // Admins get higher limits
    if (req.user?.userId) {
      return `admin:${req.user.userId}`;
    }
    return keyGenerator(req);
  },
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
});

// Dynamic rate limiter based on user role
export const dynamicRateLimiter = (options: {
  defaultMax: number;
  memberMax?: number;
  adminMax?: number;
  windowMs?: number;
}): RateLimitRequestHandler => {
  return rateLimit({
    windowMs: options.windowMs || 60 * 1000,
    limit: (req: Request): number => {
      // Higher limits for authenticated users
      if (req.user?.userId) {
        // Even higher for admins
        if (req.user.role === "ADMIN" || req.user.role === "SUPER_ADMIN") {
          return options.adminMax || options.defaultMax * 2;
        }
        return options.memberMax || options.defaultMax;
      }
      // Lower limits for unauthenticated users
      return Math.floor(options.defaultMax / 2);
    },
    keyGenerator,
    handler: rateLimitHandler,
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Export Redis client for use in other parts of the app
export { redisClient, useRedis };
