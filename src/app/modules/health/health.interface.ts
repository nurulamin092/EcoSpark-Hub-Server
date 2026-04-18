export interface HealthStatus {
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
