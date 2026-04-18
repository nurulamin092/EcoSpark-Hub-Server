import os from "os";
import { prisma } from "../../lib/prisma";
import { envVars } from "../../config/env";
import { verifyCloudinaryConfig } from "../../config/cloudinary.config";

const checkDatabaseHealth = async () => {
  const start = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: "up", latency: Date.now() - start };
  } catch (error) {
    return {
      status: "down",
      error: (error as Error).message,
    };
  }
};

const checkCloudinaryHealth = () => {
  if (!verifyCloudinaryConfig()) {
    return { status: "not_configured" };
  }
  return { status: "up" };
};

const checkStripeHealth = () => {
  if (!envVars.STRIPE?.STRIPE_SECRET_KEY) {
    return { status: "not_configured" };
  }
  return { status: "up" };
};

const getSystemMetrics = () => {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;

  const cpuCount = os.cpus().length;
  const loadAverage = os.loadavg();

  const cpuUsage = Math.min(100, Math.round((loadAverage[0] / cpuCount) * 100));

  return {
    memory: {
      used: Math.round(usedMemory / 1024 / 1024),
      total: Math.round(totalMemory / 1024 / 1024),
      free: Math.round(freeMemory / 1024 / 1024),
      percentage: Math.round((usedMemory / totalMemory) * 100),
    },
    cpu: {
      usage: cpuUsage,
      cores: cpuCount,
      loadAverage: loadAverage.map((l) => Number(l.toFixed(2))),
    },
  };
};

export const HealthService = {
  async getHealthData() {
    const [db, cloudinary, stripe] = await Promise.all([
      checkDatabaseHealth(),
      Promise.resolve(checkCloudinaryHealth()),
      Promise.resolve(checkStripeHealth()),
    ]);

    let status: "healthy" | "unhealthy" | "degraded" = "healthy";

    if (db.status === "down") status = "unhealthy";
    else if (cloudinary.status === "down" || stripe.status === "down")
      status = "degraded";

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || "1.0.0",
      services: {
        database: db,
        cloudinary,
        stripe,
      },
      system: getSystemMetrics(),
    };
  },

  async getReadiness() {
    const db = await checkDatabaseHealth();

    if (db.status === "down") {
      return {
        ready: false,
        error: db.error,
      };
    }

    return { ready: true };
  },

  getLiveness() {
    return {
      status: "alive",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  },

  async getDetailedHealth() {
    const start = Date.now();

    const base = await this.getHealthData();

    let poolInfo = {};
    try {
      // @ts-expect-error - Prisma does not officially expose pool
      const pool = prisma.$pool;
      if (pool) {
        poolInfo = {
          total: pool.totalCount,
          idle: pool.idleCount,
          waiting: pool.waitingCount,
        };
      }
    } catch {
      poolInfo = { error: "Unavailable" };
    }

    return {
      ...base,
      responseTime: Date.now() - start,
      environment: envVars.NODE_ENV,
      services: {
        ...base.services,
        database: {
          ...base.services.database,
          pool: poolInfo,
        },
      },
      process: {
        pid: process.pid,
        node: process.version,
      },
    };
  },
};
