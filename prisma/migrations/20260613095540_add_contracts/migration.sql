-- CreateEnum
CREATE TYPE "ContractFamily" AS ENUM ('STALLING', 'LEASE');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('CONCEPT', 'AANGEBODEN', 'GEACCEPTEERD', 'ACTIEF', 'OPGESCHORT', 'OPZEGGING_LOOPT', 'VERLENGD', 'BEEINDIGD', 'VERLOPEN', 'GEANNULEERD', 'AFGEWEZEN', 'VERVANGEN');

-- CreateTable
CREATE TABLE "Contract" (
    "id" UUID NOT NULL,
    "horseId" UUID NOT NULL,
    "stableId" UUID NOT NULL,
    "family" "ContractFamily" NOT NULL,
    "type" TEXT NOT NULL,
    "counterpartyUserId" UUID,
    "status" "ContractStatus" NOT NULL DEFAULT 'CONCEPT',
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "startDate" TIMESTAMP(3),
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Contract_horseId_idx" ON "Contract"("horseId");

-- CreateIndex
CREATE INDEX "Contract_stableId_idx" ON "Contract"("stableId");

-- CreateIndex
CREATE INDEX "Contract_counterpartyUserId_idx" ON "Contract"("counterpartyUserId");

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_horseId_fkey" FOREIGN KEY ("horseId") REFERENCES "Horse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_stableId_fkey" FOREIGN KEY ("stableId") REFERENCES "Stable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_counterpartyUserId_fkey" FOREIGN KEY ("counterpartyUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
