import rateLimit from "express-rate-limit";
import { Request, Response } from "express";

const rateLimitHandler = (_req: Request, res: Response) => {
  res.status(429).json({
    success: false,
    message: "Too many requests, please try again later.",
  });
};

export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

// ✅ Strict limiter (Auth routes)
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // stricter
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

export const writeRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});
