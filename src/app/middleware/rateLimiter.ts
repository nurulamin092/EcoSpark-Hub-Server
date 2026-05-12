import rateLimit, { RateLimitRequestHandler } from "express-rate-limit";
import { Request, Response } from "express";

const rateLimitHandler = (_req: Request, res: Response) => {
  res.status(429).json({
    success: false,
    message: "Too many login attempts. Please try again after 1 minute.",
  });
};

// ==================== IP-based Limiters ====================

export const globalRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  limit: 200, // 200 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "development", // Skip in development
  handler: rateLimitHandler,
});

export const authRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  limit: 20, // Increased from 10 to 20
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "development", // Skip in development
  handler: rateLimitHandler,
});

export const writeRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

// Export other limiters
export const userRateLimiter = globalRateLimiter;
export const strictUserRateLimiter = writeRateLimiter;
export const sensitiveOperationLimiter = authRateLimiter;
export const authUserRateLimiter = authRateLimiter;
export const createIdeaRateLimiter = writeRateLimiter;
export const commentRateLimiter = writeRateLimiter;
export const voteRateLimiter = writeRateLimiter;
export const paymentRateLimiter = authRateLimiter;
export const adminRateLimiter = globalRateLimiter;
export const dynamicRateLimiter = () => globalRateLimiter;
export const redisClient = null;
export const useRedis = false;
