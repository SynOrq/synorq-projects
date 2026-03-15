-- CreateEnum
CREATE TYPE "WorkspaceAutomationTrigger" AS ENUM ('TASK_OVERDUE', 'RISK_CREATED', 'MILESTONE_AT_RISK', 'WEEKLY_DIGEST_READY');

-- CreateEnum
CREATE TYPE "WorkspaceAutomationAction" AS ENUM ('SLACK_MESSAGE', 'WEBHOOK', 'CREATE_TASK');

-- CreateEnum
CREATE TYPE "WorkspaceAutomationStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED');

-- CreateTable
CREATE TABLE "WorkspaceAutomation" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "targetProjectId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "trigger" "WorkspaceAutomationTrigger" NOT NULL,
    "action" "WorkspaceAutomationAction" NOT NULL,
    "status" "WorkspaceAutomationStatus" NOT NULL DEFAULT 'DRAFT',
    "config" JSONB,
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceAutomation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkspaceAutomation_workspaceId_status_idx" ON "WorkspaceAutomation"("workspaceId", "status");

-- AddForeignKey
ALTER TABLE "WorkspaceAutomation" ADD CONSTRAINT "WorkspaceAutomation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceAutomation" ADD CONSTRAINT "WorkspaceAutomation_targetProjectId_fkey" FOREIGN KEY ("targetProjectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
