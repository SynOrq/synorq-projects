CREATE TYPE "RetainerCadence" AS ENUM ('MONTHLY', 'QUARTERLY', 'ANNUAL', 'PROJECT');
CREATE TYPE "RetainerStatus" AS ENUM ('ACTIVE', 'RENEWAL_DUE', 'PAUSED', 'ENDED');

ALTER TABLE "Client"
ADD COLUMN "contractValue" INTEGER,
ADD COLUMN "contractStartDate" TIMESTAMP(3),
ADD COLUMN "contractEndDate" TIMESTAMP(3),
ADD COLUMN "retainerCadence" "RetainerCadence",
ADD COLUMN "retainerStatus" "RetainerStatus";
