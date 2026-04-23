// ============ src/app/middleware/validateRequest.ts ============
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextFunction, Request, Response } from "express";
import { z } from "zod";

export const validateRequest = (zodSchema: z.ZodTypeAny) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const isGetRequest = req.method === "GET";
    const dataToValidate = isGetRequest ? req.query : req.body;

    try {
      const parsedResult = zodSchema.safeParse(dataToValidate);

      if (!parsedResult.success) {
        return next(parsedResult.error);
      }

      // Instead, modify the properties individually
      if (isGetRequest) {
        const validatedData = parsedResult.data as Record<string, any>;
        Object.keys(validatedData).forEach((key) => {
          (req.query as any)[key] = validatedData[key];
        });
      } else {
        req.body = parsedResult.data;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
