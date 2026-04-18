import { Request, Response } from "express";
import { HealthService } from "./health.service";

export const getHealth = async (_req: Request, res: Response) => {
  const data = await HealthService.getHealthData();

  const statusCode = data.status === "unhealthy" ? 503 : 200;

  res.status(statusCode).json(data);
};

export const getReadiness = async (_req: Request, res: Response) => {
  const result = await HealthService.getReadiness();

  if (!result.ready) {
    return res.status(503).json({
      status: "not_ready",
      error: result.error,
    });
  }

  res.status(200).json({
    status: "ready",
  });
};

export const getLiveness = (_req: Request, res: Response) => {
  res.status(200).json(HealthService.getLiveness());
};

export const getDetailedHealth = async (_req: Request, res: Response) => {
  const data = await HealthService.getDetailedHealth();

  const statusCode = data.status === "unhealthy" ? 503 : 200;

  res.status(statusCode).json(data);
};
