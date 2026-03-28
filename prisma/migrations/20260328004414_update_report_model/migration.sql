/*
  Warnings:

  - A unique constraint covering the columns `[reporterId,ideaId]` on the table `reports` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[reporterId,commentId]` on the table `reports` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `type` to the `reports` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `reports` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('IDEA', 'COMMENT');

-- DropForeignKey
ALTER TABLE "reports" DROP CONSTRAINT "reports_commentId_fkey";

-- DropForeignKey
ALTER TABLE "reports" DROP CONSTRAINT "reports_ideaId_fkey";

-- DropForeignKey
ALTER TABLE "reports" DROP CONSTRAINT "reports_reporterId_fkey";

-- AlterTable
ALTER TABLE "reports" ADD COLUMN     "type" "ReportType" NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "reports_reporterId_idx" ON "reports"("reporterId");

-- CreateIndex
CREATE INDEX "reports_ideaId_idx" ON "reports"("ideaId");

-- CreateIndex
CREATE INDEX "reports_commentId_idx" ON "reports"("commentId");

-- CreateIndex
CREATE INDEX "reports_status_idx" ON "reports"("status");

-- CreateIndex
CREATE UNIQUE INDEX "reports_reporterId_ideaId_key" ON "reports"("reporterId", "ideaId");

-- CreateIndex
CREATE UNIQUE INDEX "reports_reporterId_commentId_key" ON "reports"("reporterId", "commentId");

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "ideas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
