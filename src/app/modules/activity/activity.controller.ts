import { Request, Response } from "express";
import { ActivityService } from "./activity.service";
import status from "http-status";

const getMyActivities = async (req: Request, res: Response) => {
  const result = await ActivityService.getMyActivities(
    req.user.userId,
    req.query,
  );

  res.status(status.OK).json({
    success: true,
    message: "My activities fetched",
    data: result,
  });
};

const getAllActivities = async (req: Request, res: Response) => {
  const result = await ActivityService.getAllActivities(req.query);

  res.status(status.OK).json({
    success: true,
    message: "All activities fetched",
    data: result,
  });
};

export const ActivityController = {
  getMyActivities,
  getAllActivities,
};
