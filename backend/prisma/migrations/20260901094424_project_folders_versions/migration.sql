-- CreateTable
CREATE TABLE "Folder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Folder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjectVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "sourceImageUrl" TEXT NOT NULL,
    "sourceImageFileId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "imageFileId" TEXT NOT NULL,
    "revisedPrompt" TEXT NOT NULL,
    "itemsJson" TEXT NOT NULL,
    "shoppingCountry" TEXT NOT NULL,
    "style" TEXT NOT NULL,
    "roomType" TEXT NOT NULL,
    "baseVersionId" TEXT,
    "refinement" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectVersion_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectVersion_baseVersionId_fkey" FOREIGN KEY ("baseVersionId") REFERENCES "ProjectVersion" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Preserve every existing project's design as immutable version 1.
INSERT INTO "ProjectVersion" (
    "id",
    "projectId",
    "number",
    "sourceImageUrl",
    "sourceImageFileId",
    "imageUrl",
    "imageFileId",
    "revisedPrompt",
    "itemsJson",
    "shoppingCountry",
    "style",
    "roomType",
    "createdAt"
)
SELECT
    lower(hex(randomblob(16))),
    "id",
    1,
    "sourceImageUrl",
    "sourceImageFileId",
    "imageUrl",
    "imageFileId",
    "revisedPrompt",
    "itemsJson",
    "shoppingCountry",
    "style",
    "roomType",
    "createdAt"
FROM "Project";

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "folderId" TEXT,
    "title" TEXT NOT NULL,
    "style" TEXT NOT NULL,
    "roomType" TEXT NOT NULL,
    "shoppingCountry" TEXT NOT NULL,
    "revisedPrompt" TEXT NOT NULL,
    "itemsJson" TEXT NOT NULL,
    "sourceImageUrl" TEXT NOT NULL,
    "sourceImageFileId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "imageFileId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Project_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Project" ("createdAt", "id", "imageFileId", "imageUrl", "itemsJson", "revisedPrompt", "roomType", "shoppingCountry", "sourceImageFileId", "sourceImageUrl", "style", "title", "updatedAt", "userId") SELECT "createdAt", "id", "imageFileId", "imageUrl", "itemsJson", "revisedPrompt", "roomType", "shoppingCountry", "sourceImageFileId", "sourceImageUrl", "style", "title", "updatedAt", "userId" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
CREATE INDEX "Project_userId_updatedAt_idx" ON "Project"("userId", "updatedAt");
CREATE INDEX "Project_folderId_idx" ON "Project"("folderId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Folder_userId_updatedAt_idx" ON "Folder"("userId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Folder_userId_name_key" ON "Folder"("userId", "name");

-- CreateIndex
CREATE INDEX "ProjectVersion_projectId_createdAt_idx" ON "ProjectVersion"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "ProjectVersion_baseVersionId_idx" ON "ProjectVersion"("baseVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectVersion_projectId_number_key" ON "ProjectVersion"("projectId", "number");
