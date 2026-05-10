-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'ACCOUNT_BLOCKED';
ALTER TYPE "NotificationType" ADD VALUE 'ACCOUNT_STATUS_CHANGED';
ALTER TYPE "NotificationType" ADD VALUE 'ACCOUNT_DELETED';
ALTER TYPE "NotificationType" ADD VALUE 'PAYMENT_FAILED';
ALTER TYPE "NotificationType" ADD VALUE 'REPORT_RESOLVED';
ALTER TYPE "NotificationType" ADD VALUE 'NEWSLETTER_SUBSCRIBED';
