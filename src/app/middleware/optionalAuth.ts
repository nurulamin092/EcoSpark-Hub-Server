/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/middleware/optionalAuth.ts
import { Request, Response, NextFunction } from "express";
import { jwtUtils } from "../utils/jwt";
import { envVars } from "../config/env";
import { prisma } from "../lib/prisma";

export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    const accessToken =
      req.cookies?.accessToken || req.headers.authorization?.split(" ")[1];

    if (!accessToken) {
      (req as any).user = undefined;
      return next();
    }

    const verifiedToken = jwtUtils.verifyToken(
      accessToken,
      envVars.ACCESS_TOKEN_SECRET,
    );

    if (!verifiedToken.success || !verifiedToken.data) {
      (req as any).user = undefined;
      return next();
    }

    const user = await prisma.user.findUnique({
      where: { id: verifiedToken.data.userId },
      select: { id: true, role: true, email: true },
    });

    if (!user) {
      (req as any).user = undefined;
      return next();
    }

    req.user = {
      userId: user.id,
      role: user.role,
      email: user.email,
    };

    next();
  } catch (_error) {
    (req as any).user = undefined;
    next();
  }
};
