-- CreateEnum
CREATE TYPE "WorkspacePlan" AS ENUM ('TEAM', 'GROWTH', 'SCALE', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "WorkspaceBillingStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELED');

-- CreateTable
CREATE TABLE "WorkspaceBilling" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "plan" "WorkspacePlan" NOT NULL DEFAULT 'TEAM',
    "status" "WorkspaceBillingStatus" NOT NULL DEFAULT 'ACTIVE',
    "billingEmail" TEXT,
    "seatCap" INTEGER,
    "allowOverage" BOOLEAN NOT NULL DEFAULT false,
    "usageAlertThresholdPct" INTEGER NOT NULL DEFAULT 85,
    "renewalDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceBilling_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceBilling_workspaceId_key" ON "WorkspaceBilling"("workspaceId");

-- AddForeignKey
ALTER TABLE "WorkspaceBilling" ADD CONSTRAINT "WorkspaceBilling_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
