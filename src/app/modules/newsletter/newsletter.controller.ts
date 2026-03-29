import { Request, Response } from "express";
import { NewsletterService } from "./newsletter.service";
import status from "http-status";

const subscribe = async (req: Request, res: Response) => {
  const result = await NewsletterService.subscribe(req.body.email);

  res.status(status.CREATED).json({
    success: true,
    message: "Subscribed successfully",
    data: result,
  });
};

const unsubscribe = async (req: Request, res: Response) => {
  const result = await NewsletterService.unsubscribe(req.body.email);

  res.status(status.OK).json({
    success: true,
    message: "Unsubscribed successfully",
    data: result,
  });
};

const getSubscribers = async (req: Request, res: Response) => {
  const result = await NewsletterService.getAllSubscribers(req.query);

  res.status(status.OK).json({
    success: true,
    message: "Subscribers fetched",
    data: result,
  });
};

export const NewsletterController = {
  subscribe,
  unsubscribe,
  getSubscribers,
};
