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

// ============================================================
// 🚀 PRODUCTION-GRADE CORS CONFIGURATION
// ============================================================

const allowedOrigins = [
  envVars.FRONTEND_URL,
  envVars.BETTER_AUTH_URL,
  "http://localhost:3000",
  "http://localhost:5000",
  "https://eco-spark-hub-client-eta.vercel.app",
  "https://eco-spark-hub.vercel.app",
  /\.vercel\.app$/,
  /\.onrender\.com$/,
].filter(Boolean);

// ✅ CORS Middleware with Production-Grade Configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // ✅ Allow requests with no origin (like mobile apps or curl)
      if (!origin) {
        return callback(null, true);
      }

      // ✅ Check if origin is in allowed list
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // ✅ Check if origin matches vercel.app pattern
      const isVercelApp = /\.vercel\.app$/.test(origin);
      if (isVercelApp) {
        return callback(null, true);
      }

      // ✅ Check if origin matches onrender.com pattern
      const isRenderApp = /\.onrender\.com$/.test(origin);
      if (isRenderApp) {
        return callback(null, true);
      }

      // ✅ Development origins
      const isLocalhost = /^https?:\/\/localhost(:\d+)?$/.test(origin);
      if (isLocalhost) {
        return callback(null, true);
      }

      // ❌ Block all other origins
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
      "Access-Control-Allow-Methods",
      "Access-Control-Allow-Headers",
      "X-Response-Time",
      "x-access-token",
      "x-refresh-token",
    ],
    exposedHeaders: [
      "Set-Cookie",
      "Authorization",
      "X-Response-Time",
      "x-access-token",
      "x-refresh-token",
    ],
    maxAge: 86400, // 24 hours
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);

// ✅ Handle preflight requests explicitly
app.options("*", cors());

// ============================================================
// 🚀 REQUEST LOGGER (Production & Development)
// ============================================================

app.use((req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // ✅ Log request
  console.log("========================================");
  console.log(`📌 [${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  console.log(`🌐 Origin: ${req.headers.origin || "No origin"}`);
  console.log(`🍪 Cookie: ${req.headers.cookie ? "✅ Present" : "❌ Not present"}`);
  console.log(`🔑 Auth: ${req.headers.authorization ? "✅ Present" : "❌ Not present"}`);
  console.log(`📦 Content-Type: ${req.headers["content-type"] || "None"}`);

  // ✅ Response interceptor for logging
  const originalSend = res.send;
  res.send = function (body) {
    const duration = Date.now() - startTime;
    console.log(`⏱️ ${duration}ms | Status: ${res.statusCode}`);
    console.log("========================================");
    return originalSend.call(this, body);
  };

  next();
});

// ============================================================
// 🚀 SECURITY HEADERS
// ============================================================

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        imgSrc: ["'self'", "data:", "https:", "http:"],
        connectSrc: [
          "'self'",
          "https://eco-spark-hub-client-eta.vercel.app",
       
          "https://*.vercel.app",
          "https://*.onrender.com",
        ],
        frameSrc: ["'self'"],
        fontSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    dnsPrefetchControl: true,
    frameguard: { action: "deny" },
    hidePoweredBy: true,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    xssFilter: true,
  })
);

// ============================================================
// 🚀 BODY PARSERS (With Size Limits)
// ============================================================

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// ============================================================
// 🚀 VIEW ENGINE SETUP
// ============================================================

app.set("query parser", (str: string) => qs.parse(str));
app.set("view engine", "ejs");
app.set("views", path.resolve(process.cwd(), `src/app/templates`));

// ============================================================
// 🚀 WEBHOOK HANDLER (Must be before body parsers)
// ============================================================

app.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req: Request, res: Response) => {
    console.log("📦 Stripe webhook received:", {
      timestamp: new Date().toISOString(),
      bodyLength: req.body.length,
    });

    try {
      // ✅ Process webhook here
      // const event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], webhookSecret);
      // await handleWebhook(event);

      res.status(200).json({ received: true });
    } catch (error) {
      console.error("❌ Webhook error:", error);
      res.status(400).json({ error: "Webhook processing failed" });
    }
  }
);

// ============================================================
// 🚀 RATE LIMITING
// ============================================================

// Global IP-based rate limiter (fallback for all routes)
app.use(globalRateLimiter);

// User-based rate limiter for all API routes (more precise)
app.use("/api/v1", userRateLimiter);

// Stricter rate limiter for auth routes
app.use("/api/v1/auth", authUserRateLimiter);

// Higher limits for admin routes
app.use("/api/v1/admin", adminRateLimiter);

// ============================================================
// 🚀 AUTHENTICATION ROUTES
// ============================================================

app.use("/api/auth", toNodeHandler(auth));

// ============================================================
// 🚀 API ROUTES
// ============================================================

app.use("/api/v1", IndexRoutes);

// ============================================================
// 🚀 HEALTH CHECK
// ============================================================

app.get("/", async (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "🚀 EcoSpark Hub API is running",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: envVars.NODE_ENV,
    version: process.env.npm_package_version || "1.0.0",
  });
});

// ============================================================
// 🚀 ERROR HANDLERS
// ============================================================

// ✅ Global Error Handler
app.use(globalErrorHandler);

// ✅ 404 Not Found Handler
app.use(notFound);

// ✅ Unhandled Promise Rejection Handler
process.on("unhandledRejection", (error: Error) => {
  console.error("❌ Unhandled Promise Rejection:", error);
  // In production, you might want to gracefully shutdown
  // process.exit(1);
});

// ✅ Uncaught Exception Handler
process.on("uncaughtException", (error: Error) => {
  console.error("❌ Uncaught Exception:", error);
  // In production, gracefully shutdown
  // process.exit(1);
});

export default app;