/*
  Warnings:

  - You are about to drop the column `hasAccess` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `paymentIntent` on the `payments` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[stripeSessionId]` on the table `payments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,ideaId,provider]` on the table `payments` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "payments_transactionId_idx";

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "hasAccess",
DROP COLUMN "paymentIntent",
ADD COLUMN     "stripePaymentIntentId" TEXT,
ADD COLUMN     "stripeSessionId" TEXT,
ALTER COLUMN "currency" SET DEFAULT 'USD',
ALTER COLUMN "status" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "payments_stripeSessionId_key" ON "payments"("stripeSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_userId_ideaId_provider_key" ON "payments"("userId", "ideaId", "provider");
