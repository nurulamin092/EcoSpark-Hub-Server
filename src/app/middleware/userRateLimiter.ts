/* eslint-disable @typescript-eslint/no-explicit-any */
// ============ src/app/middleware/userRateLimiter.ts ============
import rateLimit, { RateLimitRequestHandler } from "express-rate-limit";
import { Request, Response } from "express";

const keyGenerator = (req: Request): string => {
  // Use express-rate-limit's recommended approach
  const ip =
    req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
  const ipString = Array.isArray(ip) ? ip[0] : ip;
  return `rl:${ipString}`;
};

const rateLimitHandler = (req: Request, res: Response) => {
  res.status(429).json({
    success: false,
    message: "Too many requests, please try again later.",
  });
};

// General API rate limiter (authenticated users)
export const userRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  keyGenerator,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

// Strict limiter for authenticated users (write operations)
export const strictUserRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  keyGenerator,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

// Very strict limiter for sensitive operations
export const sensitiveOperationLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  keyGenerator,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

// Login/Register specific limiter
export const authUserRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  keyGenerator,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

// Create idea limiter
export const createIdeaRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  keyGenerator,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

// Comment rate limiter
export const commentRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  keyGenerator,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

// Vote rate limiter
export const voteRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  keyGenerator,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

// Payment rate limiter
export const paymentRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 1000,
  limit: 3,
  keyGenerator,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

// Admin specific limiter
export const adminRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 1000,
  limit: 200,
  keyGenerator,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
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
    limit: (req: Request) => {
      const user = (req as any).user;
      if (user?.role === "ADMIN" || user?.role === "SUPER_ADMIN") {
        return options.adminMax || options.defaultMax * 2;
      }
      if (user?.userId) {
        return options.memberMax || options.defaultMax;
      }
      return Math.floor(options.defaultMax / 2);
    },
    keyGenerator,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler,
  });
};

export let redisClient: any = null;
export let useRedis = false;

(async () => {
  try {
    if (process.env.REDIS_URL) {
      const Redis = await import("ioredis");
      redisClient = new Redis.default(process.env.REDIS_URL);
      useRedis = true;
      console.log("Redis connected for rate limiting");
    }
  } catch {
    console.warn(
      "⚠️ Redis not configured, using memory store for rate limiting",
    );
  }
})();

export { rateLimitHandler };
