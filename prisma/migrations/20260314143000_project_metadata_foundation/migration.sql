CREATE TYPE "ProjectType" AS ENUM ('WEBSITE', 'MOBILE_APP', 'RETAINER', 'INTERNAL', 'MAINTENANCE');

CREATE TYPE "ClientHealth" AS ENUM ('STABLE', 'WATCH', 'AT_RISK');

CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "ownerId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "industry" TEXT,
    "notes" TEXT,
    "health" "ClientHealth" NOT NULL DEFAULT 'STABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Project"
ADD COLUMN "ownerId" TEXT,
ADD COLUMN "clientId" TEXT,
ADD COLUMN "type" "ProjectType" NOT NULL DEFAULT 'INTERNAL',
ADD COLUMN "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE UNIQUE INDEX "Client_workspaceId_slug_key" ON "Client"("workspaceId", "slug");

ALTER TABLE "Client"
ADD CONSTRAINT "Client_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Client"
ADD CONSTRAINT "Client_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Project"
ADD CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Project"
ADD CONSTRAINT "Project_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
