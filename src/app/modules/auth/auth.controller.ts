import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { AuthService } from "./auth.service";
import { sendResponse } from "../../shared/sendResponse";
import status from "http-status";
import ms, { StringValue } from "ms";
import { tokenUtils } from "../../utils/token";
import AppError from "../../errorHelpers/AppError";

import { envVars } from "../../config/env";
import { auth } from "../../lib/auth";

const registerMember = catchAsync(async (req: Request, res: Response) => {
  const maxAge = ms(envVars.ACCESS_TOKEN_EXPIRES_IN as StringValue);
  console.log({ maxAge });
  const payload = req.body;

  console.log(payload);

  const result = await AuthService.registerMember(payload);

  const { accessToken, refreshToken, token, ...rest } = result;

  tokenUtils.setAccessTokenCookie(res, accessToken);
  tokenUtils.setRefreshTokenCookie(res, refreshToken);
  tokenUtils.setBetterAuthSessionCookie(res, token as string);

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "User registered successfully",
    data: {
      token,
      accessToken,
      refreshToken,
      ...rest,
    },
  });
});

const loginUser = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  const result = await AuthService.loginUser(payload);
  const { accessToken, refreshToken, token, ...rest } = result;

  tokenUtils.setAccessTokenCookie(res, accessToken);
  tokenUtils.setRefreshTokenCookie(res, refreshToken);
  tokenUtils.setBetterAuthSessionCookie(res, token);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "User logged in successfully",
    data: {
      token,
      accessToken,
      refreshToken,
      ...rest,
    },
  });
});
const getMe = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;

  if (!user) {
    throw new AppError(status.UNAUTHORIZED, "User not authenticated");
  }
  console.log({ user });
  const result = await AuthService.getMe(user);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "User profile fetched successfully",
    data: result,
  });
});

const getNewToken = catchAsync(async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refreshToken;
  const betterAuthSessionToken = req.cookies["better-auth.session_token"];
  if (!refreshToken) {
    throw new AppError(status.UNAUTHORIZED, "Refresh token is missing");
  }
  const result = await AuthService.getNewToken(
    refreshToken,
    betterAuthSessionToken,
  );

  const { accessToken, refreshToken: newRefreshToken, sessionToken } = result;

  tokenUtils.setAccessTokenCookie(res, accessToken);
  tokenUtils.setRefreshTokenCookie(res, newRefreshToken);
  tokenUtils.setBetterAuthSessionCookie(res, sessionToken);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "New tokens generated successfully",
    data: {
      accessToken,
      refreshToken: newRefreshToken,
      sessionToken,
    },
  });
});

const changePassword = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  const betterAuthSessionToken = req.cookies["better-auth.session_token"];

  const result = await AuthService.changePassword(
    payload,
    betterAuthSessionToken,
  );

  const { accessToken, refreshToken, token } = result;

  tokenUtils.setAccessTokenCookie(res, accessToken);
  tokenUtils.setRefreshTokenCookie(res, refreshToken);
  tokenUtils.setBetterAuthSessionCookie(res, token as string);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Password changed successfully",
    data: result,
  });
});

const logoutUser = catchAsync(async (req: Request, res: Response) => {
  console.log(" [DEBUG] logoutUser called");

  const betterAuthSessionToken = req.cookies["better-auth.session_token"];

  if (betterAuthSessionToken) {
    try {
      await AuthService.logoutUser(betterAuthSessionToken);
      console.log(" [DEBUG] Better-Auth session killed");
    } catch (error) {
      console.error(" [DEBUG] Logout service error:", error);
    }
  }

  // CRITICAL: Clear cookies using response header method
  const cookiesToClear = [
    "accessToken",
    "refreshToken",
    "better-auth.session_token",
    "token",
    "userRole",
    "role",
  ];

  const expireDate = new Date(0).toUTCString();

  // Method 1: Set multiple Set-Cookie headers (most reliable)
  cookiesToClear.forEach((cookieName) => {
    // Clear with path /
    res.setHeader(
      "Set-Cookie",
      `${cookieName}=; expires=${expireDate}; path=/; HttpOnly; SameSite=Lax`,
    );

    // Clear with path /api
    res.setHeader(
      "Set-Cookie",
      `${cookieName}=; expires=${expireDate}; path=/api; HttpOnly; SameSite=Lax`,
    );

    // Clear with path /admin
    res.setHeader(
      "Set-Cookie",
      `${cookieName}=; expires=${expireDate}; path=/admin; HttpOnly; SameSite=Lax`,
    );

    // Clear with path /dashboard
    res.setHeader(
      "Set-Cookie",
      `${cookieName}=; expires=${expireDate}; path=/dashboard; HttpOnly; SameSite=Lax`,
    );

    // Clear without HttpOnly for client-readable cookies
    if (cookieName === "userRole" || cookieName === "role") {
      res.setHeader(
        "Set-Cookie",
        `${cookieName}=; expires=${expireDate}; path=/; SameSite=Lax`,
      );
    }
  });

  cookiesToClear.forEach((cookieName) => {
    res.clearCookie(cookieName, {
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    });
  });

  // Set response headers to prevent caching
  res.setHeader(
    "Cache-Control",
    "no-cache, no-store, must-revalidate, private",
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  console.log(" [DEBUG] logoutUser completed - cookies cleared via headers");

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "User logged out successfully",
    data: { success: true },
  });
});
const verifyEmail = catchAsync(async (req: Request, res: Response) => {
  const { email, otp } = req.body;
  await AuthService.verifyEmail(email, otp);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Email verified successfully",
  });
});
const forgetPassword = catchAsync(async (req: Request, res: Response) => {
  const { email } = req.body;
  await AuthService.forgetPassword(email);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Password reset OTP sent to email successfully",
  });
});

const resetPassword = catchAsync(async (req: Request, res: Response) => {
  const { email, otp, newPassword } = req.body;
  await AuthService.resetPassword(email, otp, newPassword);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Password reset successfully",
  });
});
const googleLogin = catchAsync((req: Request, res: Response) => {
  const redirectPath = req.query.redirect || "/dashboard";

  const encodedRedirectPath = encodeURIComponent(redirectPath as string);

  const callbackURL = `${envVars.BETTER_AUTH_URL}/api/v1/auth/google/success?redirect=${encodedRedirectPath}`;

  res.render("googleRedirect", {
    callbackURL: callbackURL,
    betterAuthUrl: envVars.BETTER_AUTH_URL,
  });
});
const googleLoginSuccess = catchAsync(async (req: Request, res: Response) => {
  const redirectPath = (req.query.redirect as string) || "/dashboard";

  const sessionToken = req.cookies["better-auth.session_token"];

  if (!sessionToken) {
    return res.redirect(`${envVars.FRONTEND_URL}/login?error=oauth_failed`);
  }

  const session = await auth.api.getSession({
    headers: {
      Cookie: `better-auth.session_token=${sessionToken}`,
    },
  });

  if (!session) {
    return res.redirect(`${envVars.FRONTEND_URL}/login?error=no_session_found`);
  }

  if (session && !session.user) {
    return res.redirect(`${envVars.FRONTEND_URL}/login?error=no_user_found`);
  }

  const result = await AuthService.googleLoginSuccess(session);

  const { accessToken, refreshToken } = result;

  tokenUtils.setAccessTokenCookie(res, accessToken);
  tokenUtils.setRefreshTokenCookie(res, refreshToken);

  const isValidRedirectPath =
    redirectPath.startsWith("/") && !redirectPath.startsWith("//");
  const finalRedirectPath = isValidRedirectPath ? redirectPath : "/dashboard";

  res.redirect(`${envVars.FRONTEND_URL}${finalRedirectPath}`);
});

const handleOAuthError = catchAsync((req: Request, res: Response) => {
  const error = (req.query.error as string) || "oauth_failed";
  res.redirect(`${envVars.FRONTEND_URL}/login?error=${error}`);
});

export const AuthController = {
  registerMember,
  loginUser,
  getMe,
  getNewToken,
  changePassword,
  logoutUser,
  verifyEmail,
  forgetPassword,
  resetPassword,
  googleLogin,
  googleLoginSuccess,
  handleOAuthError,
};
