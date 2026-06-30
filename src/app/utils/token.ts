import { JwtPayload, SignOptions } from "jsonwebtoken";
import { envVars } from "../config/env";
import { jwtUtils } from "./jwt";
import { Response } from "express";
import { isProduction } from "better-auth";

const getAccessToken = (payload: JwtPayload) => {
  return jwtUtils.createToken(payload, envVars.ACCESS_TOKEN_SECRET, {
    expiresIn: envVars.ACCESS_TOKEN_EXPIRES_IN,
  } as SignOptions);
};

const getRefreshToken = (payload: JwtPayload) => {
  return jwtUtils.createToken(payload, envVars.REFRESH_TOKEN_SECRET, {
    expiresIn: envVars.REFRESH_TOKEN_EXPIRES_IN,
  } as SignOptions);
};

// Fix cookie setting for localhost
const setAccessTokenCookie = (res: Response, token: string) => {
  const isProduction = envVars.NODE_ENV === "production";
  res.cookie("accessToken", token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
    maxAge: 24 * 60 * 60 * 1000, // 1 day
  });
};

const setRefreshTokenCookie = (res: Response, token: string) => {
  const isProduction = envVars.NODE_ENV === "production";
  res.cookie("refreshToken", token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

const setBetterAuthSessionCookie = (res: Response, token: string) => {
  const isProduction = envVars.NODE_ENV === "production";
  res.cookie("better-auth.session_token", token, {
    httpOnly: true,
    secure: isProduction,
   sameSite: isProduction ? "none" : "lax",
    path: "/",
    maxAge: 24 * 60 * 60 * 1000,
  });
};

const setUserRoleCookie = (res: Response, role: string) => {
  const isProduction = envVars.NODE_ENV === "production";
  res.cookie("userRole", role, {
    httpOnly: false, // Client needs to read this
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

const clearAllTokens = (res: Response) => {
  const cookiesToClear = [
    "accessToken",
    "refreshToken",
    "better-auth.session_token",
    "token",
    "userRole",
    "role",
  ];

  cookiesToClear.forEach((cookieName) => {
    res.clearCookie(cookieName, {
      path: "/",
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
    });
  });
};

export const tokenUtils = {
  getAccessToken,
  getRefreshToken,
  setAccessTokenCookie,
  setRefreshTokenCookie,
  setBetterAuthSessionCookie,
  setUserRoleCookie,
  clearAllTokens,
};
