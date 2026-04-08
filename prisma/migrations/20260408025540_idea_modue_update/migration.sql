-- CreateIndex
CREATE INDEX "ideas_status_isPaid_isDeleted_idx" ON "ideas"("status", "isPaid", "isDeleted");

-- CreateIndex
CREATE INDEX "ideas_categoryId_status_isDeleted_idx" ON "ideas"("categoryId", "status", "isDeleted");

-- CreateIndex
CREATE INDEX "ideas_authorId_status_isDeleted_idx" ON "ideas"("authorId", "status", "isDeleted");

-- CreateIndex
CREATE INDEX "ideas_status_upvoteCount_createdAt_idx" ON "ideas"("status", "upvoteCount", "createdAt");

-- CreateIndex
CREATE INDEX "ideas_isFeatured_featuredUntil_status_idx" ON "ideas"("isFeatured", "featuredUntil", "status");
