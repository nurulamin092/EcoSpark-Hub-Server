import { prisma } from "../../lib/prisma";
import { jwtUtils } from "../../utils/jwt";

export class TokenBlacklistService {
  static async blacklistToken(
    token: string,
    type: "ACCESS" | "REFRESH" | "SESSION",
    userId?: string,
  ) {
    try {
      let expiresAt: Date;

      if (type === "SESSION") {
        const session = await prisma.session.findUnique({
          where: { token },
          select: { expiresAt: true },
        });
        expiresAt = session?.expiresAt || new Date(Date.now() + 24 * 3600000);
      } else {
        const decoded = jwtUtils.decodeToken(token);
        expiresAt = decoded?.exp
          ? new Date(decoded.exp * 1000)
          : new Date(Date.now() + 24 * 3600000);
      }

      await prisma.tokenBlacklist.create({
        data: {
          token,
          type,
          userId,
          expiresAt,
        },
      });

      await this.cleanExpiredTokens();
    } catch (error) {
      console.error("Failed to blacklist token:", error);
    }
  }

  static async isBlacklisted(token: string): Promise<boolean> {
    const blacklisted = await prisma.tokenBlacklist.findUnique({
      where: { token },
    });
    return !!blacklisted;
  }

  static async cleanExpiredTokens() {
    await prisma.tokenBlacklist.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
  }

  static async blacklistAllUserTokens(userId: string) {
    const sessions = await prisma.session.findMany({
      where: { userId },
    });

    for (const session of sessions) {
      await this.blacklistToken(session.token, "SESSION", userId);
    }
  }
}
