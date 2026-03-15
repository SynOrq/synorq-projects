CREATE TABLE "WorkspaceMemberCapacity" (
    "id" TEXT NOT NULL,
    "workspaceMemberId" TEXT NOT NULL,
    "weeklyCapacityHours" INTEGER,
    "reservedHours" INTEGER NOT NULL DEFAULT 0,
    "outOfOfficeHours" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceMemberCapacity_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "WorkspaceMemberCapacity"
ADD CONSTRAINT "WorkspaceMemberCapacity_workspaceMemberId_fkey"
FOREIGN KEY ("workspaceMemberId") REFERENCES "WorkspaceMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "WorkspaceMemberCapacity_workspaceMemberId_key" ON "WorkspaceMemberCapacity"("workspaceMemberId");
