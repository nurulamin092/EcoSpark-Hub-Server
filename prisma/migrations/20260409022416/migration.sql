-- CreateEnum
CREATE TYPE "SharePlatform" AS ENUM ('FACEBOOK', 'TWITTER', 'LINKEDIN', 'WHATSAPP', 'TELEGRAM', 'EMAIL', 'COPY_LINK');

-- CreateEnum
CREATE TYPE "ShareEntityType" AS ENUM ('IDEA', 'BLOG');

-- CreateTable
CREATE TABLE "share_analytics" (
    "id" TEXT NOT NULL,
    "entityType" "ShareEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "platform" "SharePlatform" NOT NULL,
    "userId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "share_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShareCount" (
    "entityType" "ShareEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShareCount_pkey" PRIMARY KEY ("entityType","entityId")
);

-- CreateIndex
CREATE INDEX "share_analytics_entityType_entityId_idx" ON "share_analytics"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "share_analytics_entityType_entityId_platform_idx" ON "share_analytics"("entityType", "entityId", "platform");

-- CreateIndex
CREATE INDEX "share_analytics_createdAt_idx" ON "share_analytics"("createdAt");
