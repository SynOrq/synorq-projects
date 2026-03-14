-- AlterTable
ALTER TABLE "WorkspaceUserState"
ADD COLUMN "riskAlertsEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "activityAlertsEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "weeklyDigestEnabled" BOOLEAN NOT NULL DEFAULT false;
