-- CreateTable
CREATE TABLE "RedesignJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "clientRequestId" TEXT NOT NULL,
    "requestFingerprint" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "sourceImageUrl" TEXT NOT NULL,
    "sourceImageFileId" TEXT NOT NULL,
    "resultImageUrl" TEXT,
    "resultImageFileId" TEXT,
    "leaseToken" TEXT,
    "style" TEXT NOT NULL,
    "roomType" TEXT NOT NULL,
    "shoppingCountry" TEXT NOT NULL,
    "refinement" TEXT,
    "accessMode" TEXT NOT NULL,
    "designAccessJson" TEXT NOT NULL,
    "resultJson" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "retryable" BOOLEAN NOT NULL DEFAULT false,
    "freeDesignClaimed" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RedesignJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "RedesignJob_userId_clientRequestId_key" ON "RedesignJob"("userId", "clientRequestId");

-- CreateIndex
CREATE INDEX "RedesignJob_userId_status_completedAt_idx" ON "RedesignJob"("userId", "status", "completedAt");

-- CreateIndex
CREATE INDEX "RedesignJob_status_updatedAt_idx" ON "RedesignJob"("status", "updatedAt");
