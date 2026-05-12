import { CookieOptions, Request, Response } from "express";

const isProduction = process.env.NODE_ENV === "production";
const isDevelopment = process.env.NODE_ENV === "development";

// Type for sameSite - proper union type
type SameSiteOption = "strict" | "lax" | "none";

// Get cookie options based on environment
const getDefaultCookieOptions = (): CookieOptions => {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: (isProduction ? "none" : "lax") as SameSiteOption,
    path: "/",
    maxAge: 24 * 60 * 60 * 1000, // 1 day
  };
};

// For cross-origin requests (production only)
const getCrossOriginCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: true,
  sameSite: "none" as SameSiteOption,
  path: "/",
  maxAge: 24 * 60 * 60 * 1000,
});

const setCookie = (
  res: Response,
  key: string,
  value: string,
  options?: Partial<CookieOptions>,
) => {
  const baseOptions = isProduction
    ? getCrossOriginCookieOptions()
    : getDefaultCookieOptions();
  const cookieOptions = { ...baseOptions, ...options };
  res.cookie(key, value, cookieOptions);

  if (isDevelopment) {
    console.log(`🍪 Cookie set: ${key}`);
  }
};

const getCookie = (req: Request, key: string) => {
  return req.cookies?.[key];
};

const clearCookie = (res: Response, key: string) => {
  // Clear with environment-appropriate options - proper typing
  const clearOptions: CookieOptions = {
    path: "/",
    httpOnly: true,
    secure: isProduction,
    sameSite: (isProduction ? "none" : "lax") as SameSiteOption,
  };

  // Standard clear
  res.clearCookie(key, clearOptions);

  // Also clear with different path variations
  const paths = ["/api", "/admin", "/dashboard"];
  paths.forEach((path) => {
    const pathOptions: CookieOptions = {
      ...clearOptions,
      path: path,
    };
    res.clearCookie(key, pathOptions);
  });

  // Force expired cookie as ultimate fallback
  const expiredOptions: CookieOptions = {
    expires: new Date(0),
    maxAge: 0,
    path: "/",
    httpOnly: true,
    secure: isProduction,
    sameSite: (isProduction ? "none" : "lax") as SameSiteOption,
  };
  res.cookie(key, "", expiredOptions);

  if (isDevelopment) {
    console.log(`🗑️ Cookie cleared: ${key}`);
  }
};

const clearAllAuthCookies = (res: Response) => {
  const cookiesToClear = [
    "accessToken",
    "refreshToken",
    "better-auth.session_token",
    "token",
    "userRole",
    "role",
  ];

  cookiesToClear.forEach((cookieName) => {
    clearCookie(res, cookieName);
  });

  if (isDevelopment) {
    console.log("🗑️ All auth cookies cleared");
  }
};

export const CookieUtils = {
  setCookie,
  getCookie,
  clearCookie,
  clearAllAuthCookies,
  getDefaultCookieOptions,
  getCrossOriginCookieOptions,
};
