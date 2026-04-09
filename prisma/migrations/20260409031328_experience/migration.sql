-- CreateEnum
CREATE TYPE "ExperienceStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'FEATURED');

-- CreateEnum
CREATE TYPE "ExperienceResultType" AS ENUM ('COST_SAVING', 'ENERGY_SAVED', 'WASTE_REDUCED', 'CO2_REDUCED', 'TIME_SAVED', 'OTHER');

-- CreateTable
CREATE TABLE "user_experiences" (
    "id" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" SMALLINT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "images" JSONB,
    "results" JSONB,
    "status" "ExperienceStatus" NOT NULL DEFAULT 'PENDING',
    "helpfulCount" INTEGER NOT NULL DEFAULT 0,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "adminFeedback" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "featuredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_experiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experience_helpful_votes" (
    "id" TEXT NOT NULL,
    "experienceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "experience_helpful_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experience_likes" (
    "id" TEXT NOT NULL,
    "experienceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "experience_likes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_experiences_ideaId_idx" ON "user_experiences"("ideaId");

-- CreateIndex
CREATE INDEX "user_experiences_userId_idx" ON "user_experiences"("userId");

-- CreateIndex
CREATE INDEX "user_experiences_rating_idx" ON "user_experiences"("rating");

-- CreateIndex
CREATE INDEX "user_experiences_status_idx" ON "user_experiences"("status");

-- CreateIndex
CREATE INDEX "user_experiences_createdAt_idx" ON "user_experiences"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "user_experiences_helpfulCount_idx" ON "user_experiences"("helpfulCount" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "user_experiences_ideaId_userId_key" ON "user_experiences"("ideaId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "experience_helpful_votes_experienceId_userId_key" ON "experience_helpful_votes"("experienceId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "experience_likes_experienceId_userId_key" ON "experience_likes"("experienceId", "userId");

-- AddForeignKey
ALTER TABLE "user_experiences" ADD CONSTRAINT "user_experiences_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "ideas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_experiences" ADD CONSTRAINT "user_experiences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experience_helpful_votes" ADD CONSTRAINT "experience_helpful_votes_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "user_experiences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experience_helpful_votes" ADD CONSTRAINT "experience_helpful_votes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experience_likes" ADD CONSTRAINT "experience_likes_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "user_experiences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experience_likes" ADD CONSTRAINT "experience_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
