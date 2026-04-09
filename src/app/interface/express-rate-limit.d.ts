/**
 * @file express-rate-limit.d.ts
 * @description Type declarations for express-rate-limit
 */

import "express";

declare module "express" {
  interface Request {
    /**
     * Rate limit information for the current request
     * Available after rate limit middleware has been applied
     */
    rateLimit?: {
      /** Maximum number of requests allowed in the window */
      limit: number;
      /** Current number of requests made in this window */
      current: number;
      /** Number of requests remaining in this window */
      remaining: number;
      /** Date when the current window resets */
      resetTime: Date;
    };
  }
}
