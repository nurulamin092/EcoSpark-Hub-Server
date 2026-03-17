/*
  Warnings:

  - You are about to drop the column `lastLogin` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `loginCount` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `profileImage` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `resetToken` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `resetTokenExp` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `verificationToken` on the `users` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "users_resetToken_key";

-- DropIndex
DROP INDEX "users_verificationToken_key";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "lastLogin",
DROP COLUMN "loginCount",
DROP COLUMN "profileImage",
DROP COLUMN "resetToken",
DROP COLUMN "resetTokenExp",
DROP COLUMN "verificationToken",
ADD COLUMN     "image" TEXT;
