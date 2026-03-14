-- CreateTable
CREATE TABLE "WorkspaceUserState" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "notificationsReadAt" TIMESTAMP(3),
    "onboardingDismissedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceUserState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceUserState_workspaceId_userId_key" ON "WorkspaceUserState"("workspaceId", "userId");

-- AddForeignKey
ALTER TABLE "WorkspaceUserState" ADD CONSTRAINT "WorkspaceUserState_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceUserState" ADD CONSTRAINT "WorkspaceUserState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
