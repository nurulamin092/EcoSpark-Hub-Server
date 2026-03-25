/*
  Warnings:

  - You are about to drop the column `reviewedBy` on the `ideas` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "ideas" DROP CONSTRAINT "ideas_reviewedBy_fkey";

-- DropIndex
DROP INDEX "ideas_createdAt_idx";

-- DropIndex
DROP INDEX "ideas_lastActivityAt_idx";

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "color" TEXT,
ADD COLUMN     "isPredefined" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ideas" DROP COLUMN "reviewedBy",
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedByUserId" TEXT,
ADD COLUMN     "submittedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "categories_isActive_idx" ON "categories"("isActive");

-- CreateIndex
CREATE INDEX "categories_order_idx" ON "categories"("order");

-- CreateIndex
CREATE INDEX "comments_ideaId_path_idx" ON "comments"("ideaId", "path");

-- CreateIndex
CREATE INDEX "comments_createdAt_idx" ON "comments"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "ideas_createdAt_idx" ON "ideas"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "ideas_status_createdAt_idx" ON "ideas"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ideas_status_upvoteCount_idx" ON "ideas"("status", "upvoteCount" DESC);

-- CreateIndex
CREATE INDEX "ideas_isPaid_idx" ON "ideas"("isPaid");

-- CreateIndex
CREATE INDEX "ideas_isDeleted_idx" ON "ideas"("isDeleted");

-- CreateIndex
CREATE INDEX "ideas_categoryId_status_idx" ON "ideas"("categoryId", "status");

-- CreateIndex
CREATE INDEX "ideas_authorId_status_idx" ON "ideas"("authorId", "status");

-- CreateIndex
CREATE INDEX "ideas_lastActivityAt_idx" ON "ideas"("lastActivityAt" DESC);

-- CreateIndex
CREATE INDEX "votes_createdAt_idx" ON "votes"("createdAt" DESC);

-- AddForeignKey
ALTER TABLE "ideas" ADD CONSTRAINT "ideas_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
