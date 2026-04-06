/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { envVars } from "../../config/env";
import { verifyCloudinaryConfig } from "../../config/cloudinary.config";
import os from "os";

interface HealthStatus {
  status: "healthy" | "unhealthy" | "degraded";
  timestamp: string;
  uptime: number;
  version: string;
  services: {
    database: {
      status: "up" | "down";
      latency?: number;
      error?: string;
    };
    redis?: {
      status: "up" | "down" | "not_configured";
      latency?: number;
    };
    cloudinary: {
      status: "up" | "down" | "not_configured";
      error?: string;
    };
    stripe: {
      status: "up" | "down" | "not_configured";
    };
  };
  system: {
    memory: {
      used: number;
      total: number;
      percentage: number;
      free: number;
    };
    cpu: {
      usage: number;
      cores: number;
      loadAverage: number[];
    };
  };
}

const checkDatabaseHealth = async (): Promise<{
  status: "up" | "down";
  latency?: number;
  error?: string;
}> => {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - start;
    return { status: "up", latency };
  } catch (error) {
    return { status: "down", error: (error as Error).message };
  }
};

const checkCloudinaryHealth = (): {
  status: "up" | "down" | "not_configured";
  error?: string;
} => {
  const isConfigured = verifyCloudinaryConfig();
  if (!isConfigured) {
    return { status: "not_configured" };
  }
  return { status: "up" };
};

const checkStripeHealth = (): { status: "up" | "down" | "not_configured" } => {
  const hasKey = !!envVars.STRIPE?.STRIPE_SECRET_KEY;
  if (!hasKey) {
    return { status: "not_configured" };
  }
  return { status: "up" };
};

const getSystemMetrics = () => {
  const memoryUsage = process.memoryUsage();
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;

  // Calculate CPU usage
  const cpus = os.cpus();
  const cpuCount = cpus.length;

  // Get load average (1, 5, 15 minutes)
  const loadAverage = os.loadavg();

  // Calculate CPU usage percentage (simple approach)
  const cpuUsagePercent = (loadAverage[0] / cpuCount) * 100;

  return {
    memory: {
      used: Math.round(usedMemory / 1024 / 1024), // MB
      total: Math.round(totalMemory / 1024 / 1024), // MB
      free: Math.round(freeMemory / 1024 / 1024), // MB
      percentage: Math.round((usedMemory / totalMemory) * 100),
    },
    cpu: {
      usage: Math.min(100, Math.round(cpuUsagePercent)),
      cores: cpuCount,
      loadAverage: loadAverage.map((load) => parseFloat(load.toFixed(2))),
    },
  };
};

export const getHealth = async (req: Request, res: Response) => {
  // Run all checks in parallel for efficiency
  const [dbHealth, cloudinaryStatus, stripeStatus] = await Promise.all([
    checkDatabaseHealth(),
    Promise.resolve(checkCloudinaryHealth()),
    Promise.resolve(checkStripeHealth()),
  ]);

  const systemMetrics = getSystemMetrics();

  // Determine overall status
  let overallStatus: "healthy" | "unhealthy" | "degraded" = "healthy";
  if (dbHealth.status === "down") {
    overallStatus = "unhealthy";
  } else if (
    cloudinaryStatus.status === "down" ||
    stripeStatus.status === "down"
  ) {
    overallStatus = "degraded";
  }

  const healthData: HealthStatus = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || "1.0.0",
    services: {
      database: dbHealth,
      cloudinary: cloudinaryStatus,
      stripe: stripeStatus,
    },
    system: systemMetrics,
  };

  const statusCode =
    overallStatus === "healthy"
      ? 200
      : overallStatus === "degraded"
        ? 200
        : 503;

  res.status(statusCode).json(healthData);
};

export const getReadiness = async (req: Request, res: Response) => {
  // Readiness checks if the app is ready to accept traffic
  const dbHealth = await checkDatabaseHealth();

  if (dbHealth.status === "up") {
    res.status(200).json({
      status: "ready",
      timestamp: new Date().toISOString(),
      services: {
        database: "connected",
      },
    });
  } else {
    res.status(503).json({
      status: "not_ready",
      timestamp: new Date().toISOString(),
      error: dbHealth.error,
    });
  }
};

export const getLiveness = (req: Request, res: Response) => {
  // Liveness just checks if the process is alive
  res.status(200).json({
    status: "alive",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
};

// Detailed health check with more information (admin only)
export const getDetailedHealth = async (req: Request, res: Response) => {
  const startTime = Date.now();

  const [dbHealth, cloudinaryStatus, stripeStatus] = await Promise.all([
    checkDatabaseHealth(),
    Promise.resolve(checkCloudinaryHealth()),
    Promise.resolve(checkStripeHealth()),
  ]);

  const systemMetrics = getSystemMetrics();

  let dbPoolInfo = {};
  try {
    // @ts-ignore - Prisma client has internal pool info
    const pool = prisma.$pool;
    if (pool) {
      dbPoolInfo = {
        totalConnections: pool.totalCount,
        idleConnections: pool.idleCount,
        waitingConnections: pool.waitingCount,
      };
    }
  } catch (error) {
    dbPoolInfo = { error: "Unable to get pool info" };
  }

  let overallStatus: "healthy" | "unhealthy" | "degraded" = "healthy";
  if (dbHealth.status === "down") {
    overallStatus = "unhealthy";
  } else if (
    cloudinaryStatus.status === "down" ||
    stripeStatus.status === "down"
  ) {
    overallStatus = "degraded";
  }

  const detailedHealth = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    responseTime: Date.now() - startTime,
    version: process.env.npm_package_version || "1.0.0",
    environment: envVars.NODE_ENV,
    services: {
      database: {
        ...dbHealth,
        pool: dbPoolInfo,
      },
      cloudinary: cloudinaryStatus,
      stripe: stripeStatus,
    },
    system: systemMetrics,
    process: {
      pid: process.pid,
      title: process.title,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
    },
  };

  const statusCode =
    overallStatus === "healthy"
      ? 200
      : overallStatus === "degraded"
        ? 200
        : 503;
  res.status(statusCode).json(detailedHealth);
};
