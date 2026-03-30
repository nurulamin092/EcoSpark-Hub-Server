import { NextFunction, Request, Response } from "express";
import status from "http-status";
import { Role, UserStatus } from "../../generated/prisma/enums";
import { envVars } from "../config/env";

import { prisma } from "../lib/prisma";
import { CookieUtils } from "../utils/cookie";
import { jwtUtils } from "../utils/jwt";
import AppError from "../errorHelpers/AppError";

export const checkAuth =
  (...authRoles: Role[]) =>
  async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const accessToken = CookieUtils.getCookie(req, "accessToken");

      if (!accessToken) {
        throw new AppError(status.UNAUTHORIZED, "No access token provided");
      }

      const verifiedToken = jwtUtils.verifyToken(
        accessToken,
        envVars.ACCESS_TOKEN_SECRET,
      );

      if (!verifiedToken.success || !verifiedToken.data) {
        throw new AppError(status.UNAUTHORIZED, "Invalid access token");
      }

      const user = await prisma.user.findUnique({
        where: { id: verifiedToken.data.userId },
      });

      if (!user || user.isDeleted) {
        throw new AppError(status.UNAUTHORIZED, "User not found");
      }

      if (
        user.status === UserStatus.BLOCKED ||
        user.status === UserStatus.DELETED
      ) {
        throw new AppError(status.UNAUTHORIZED, "User inactive");
      }

      if (authRoles.length && !authRoles.includes(user.role)) {
        throw new AppError(status.FORBIDDEN, "Forbidden");
      }

      req.user = {
        userId: user.id,
        role: user.role,
        email: user.email,
      };

      next();
    } catch (error) {
      next(error);
    }
  };
