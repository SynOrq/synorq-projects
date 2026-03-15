-- CreateTable
CREATE TABLE "ClientPortal" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "shareToken" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "welcomeTitle" TEXT,
    "welcomeMessage" TEXT,
    "accentColor" TEXT NOT NULL DEFAULT '#0f172a',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "ClientPortal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientPortal_clientId_key" ON "ClientPortal"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientPortal_shareToken_key" ON "ClientPortal"("shareToken");

-- AddForeignKey
ALTER TABLE "ClientPortal" ADD CONSTRAINT "ClientPortal_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
