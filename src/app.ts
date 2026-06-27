import { toNodeHandler } from "better-auth/node";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Application, NextFunction, Request, Response } from "express";
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

// ==================== CORS Configuration ====================

const allowedOrigins = [
  envVars.FRONTEND_URL,
  envVars.BETTER_AUTH_URL,
  "http://localhost:3000",
  "http://localhost:5000",
  "https://eco-spark-hub-client-eta.vercel.app",
  /\.vercel\.app$/,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      const isVercelApp = /\.vercel\.app$/.test(origin);
      if (isVercelApp) {
        return callback(null, true);
      }

      console.warn(`🚫 CORS blocked: ${origin}`);
      return callback(new Error(`CORS policy: ${origin} not allowed`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Cookie",
      "Set-Cookie",
      "X-Requested-With",
      "Accept",
      "Origin",
      "Access-Control-Allow-Origin",
      "Access-Control-Allow-Credentials",
    ],
    exposedHeaders: ["Set-Cookie", "Authorization"],
    maxAge: 86400,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  }),
);

app.options("*", cors());

// ==================== Request Logger ====================
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log("========================================");
  console.log(`📌 ${req.method} ${req.originalUrl}`);
  console.log(`🌐 Origin: ${req.headers.origin || "No origin"}`);
  console.log(
    `🍪 Cookie: ${req.headers.cookie ? "✅ Present" : "❌ Not present"}`,
  );
  console.log(
    `🔑 Auth: ${req.headers.authorization ? "✅ Present" : "❌ Not present"}`,
  );
  console.log("========================================");
  next();
});

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

// ==================== Body Parsers  ====================

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ==================== Webhook  ====================
app.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    console.log("Received Stripe webhook:", req.body);
    res.status(200).send("Webhook received");
  },
);

// ==================== View Engine Setup ====================
app.set("query parser", (str: string) => qs.parse(str));
app.set("view engine", "ejs");
app.set("views", path.resolve(process.cwd(), `src/app/templates`));

// ==================== Rate Limiting ====================
// Global IP-based rate limiter (fallback for all routes)
app.use(globalRateLimiter);

// User-based rate limiter for all API routes (more precise)
app.use("/api/v1", userRateLimiter);

// Stricter rate limiter for auth routes
app.use("/api/v1/auth", authUserRateLimiter);

// Higher limits for admin routes
app.use("/api/v1/admin", adminRateLimiter);

// ==================== Authentication Routes ====================

app.use("/api/auth", toNodeHandler(auth));

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
