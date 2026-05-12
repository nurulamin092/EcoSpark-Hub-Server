import { toNodeHandler } from "better-auth/node";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Application, Request, Response } from "express";
import path from "path";
import qs from "qs";
import helmet from "helmet";
import { envVars } from "./app/config/env";
import { auth } from "./app/lib/auth";
import { globalErrorHandler } from "./app/middleware/globalErrorHandler";
import { notFound } from "./app/middleware/notFound";
import { IndexRoutes } from "./app/routes";
import {
  globalRateLimiter,
  userRateLimiter,
  adminRateLimiter,
  authUserRateLimiter,
} from "./app/middleware/rateLimiter";

const app: Application = express();

// ==================== Security Headers ====================
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        imgSrc: ["'self'", "data:", "https:", "http:"],
      },
    },
  }),
);

// ==================== View Engine Setup ====================
app.set("query parser", (str: string) => qs.parse(str));
app.set("view engine", "ejs");
app.set("views", path.resolve(process.cwd(), `src/app/templates`));

// ==================== Webhook (MUST be before express.json()) ====================
app.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    console.log("Received Stripe webhook:", req.body);
    res.status(200).send("Webhook received");
  },
);

// ==================== CORS Configuration ====================
app.use(
  cors({
    origin: [
      envVars.FRONTEND_URL,
      envVars.BETTER_AUTH_URL,
      "http://localhost:3000",
      "http://localhost:5000",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// ==================== Authentication Routes ====================

app.use("/api/auth", toNodeHandler(auth));

// ==================== Body Parsers ====================
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// ==================== Rate Limiting ====================
// Global IP-based rate limiter (fallback for all routes)
app.use(globalRateLimiter);

// User-based rate limiter for all API routes (more precise)
app.use("/api/v1", userRateLimiter);

// Stricter rate limiter for auth routes
app.use("/api/v1/auth", authUserRateLimiter);

// Higher limits for admin routes
app.use("/api/v1/admin", adminRateLimiter);

// ==================== API Routes ====================
app.use("/api/v1", IndexRoutes);

// ==================== Health Check ====================
app.get("/", async (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "API is working",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ==================== Error Handlers ====================
app.use(globalErrorHandler);
app.use(notFound);

export default app;
