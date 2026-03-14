CREATE TYPE "MilestoneStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'AT_RISK', 'COMPLETED');
CREATE TYPE "RiskStatus" AS ENUM ('OPEN', 'MITIGATING', 'WATCH', 'CLOSED');
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

ALTER TABLE "Task"
ADD COLUMN "milestoneId" TEXT;

CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "ownerId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "MilestoneStatus" NOT NULL DEFAULT 'PLANNED',
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Risk" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "ownerId" TEXT,
    "taskId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "RiskStatus" NOT NULL DEFAULT 'OPEN',
    "impact" "RiskLevel" NOT NULL DEFAULT 'MEDIUM',
    "likelihood" "RiskLevel" NOT NULL DEFAULT 'MEDIUM',
    "mitigationPlan" TEXT,
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Risk_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Task"
ADD CONSTRAINT "Task_milestoneId_fkey"
FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Milestone"
ADD CONSTRAINT "Milestone_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Milestone"
ADD CONSTRAINT "Milestone_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Risk"
ADD CONSTRAINT "Risk_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Risk"
ADD CONSTRAINT "Risk_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Risk"
ADD CONSTRAINT "Risk_taskId_fkey"
FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Milestone_projectId_dueDate_idx" ON "Milestone"("projectId", "dueDate");
CREATE INDEX "Risk_projectId_status_idx" ON "Risk"("projectId", "status");
