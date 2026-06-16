-- CreateEnum
CREATE TYPE "LeaseType" AS ENUM ('FULL', 'DEEL', 'BIJRIJDEN', 'WEDSTRIJD', 'KOOPOPTIE', 'FOK');

-- CreateEnum
CREATE TYPE "LeaseStatus" AS ENUM ('CONCEPT', 'ACTIEF', 'OPGEZEGD', 'BEEINDIGD');

-- CreateTable
CREATE TABLE "LeaseListing" (
    "id" UUID NOT NULL,
    "horseId" UUID NOT NULL,
    "leaseType" "LeaseType" NOT NULL,
    "daysPerWeek" INTEGER,
    "pricePerMonth" DECIMAL(10,2),
    "region" TEXT,
    "discipline" TEXT,
    "movable" BOOLEAN NOT NULL DEFAULT false,
    "exclusive" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaseListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lease" (
    "id" UUID NOT NULL,
    "horseId" UUID NOT NULL,
    "leaserUserId" UUID NOT NULL,
    "leaseType" "LeaseType" NOT NULL,
    "status" "LeaseStatus" NOT NULL DEFAULT 'CONCEPT',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "minimumTermMonths" INTEGER,
    "noticePeriodDays" INTEGER,
    "trialEndsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lease_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeaseListing_horseId_idx" ON "LeaseListing"("horseId");

-- CreateIndex
CREATE INDEX "LeaseListing_isActive_idx" ON "LeaseListing"("isActive");

-- CreateIndex
CREATE INDEX "Lease_horseId_idx" ON "Lease"("horseId");

-- CreateIndex
CREATE INDEX "Lease_leaserUserId_idx" ON "Lease"("leaserUserId");

-- CreateIndex
CREATE INDEX "Lease_status_idx" ON "Lease"("status");

-- AddForeignKey
ALTER TABLE "LeaseListing" ADD CONSTRAINT "LeaseListing_horseId_fkey" FOREIGN KEY ("horseId") REFERENCES "Horse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lease" ADD CONSTRAINT "Lease_horseId_fkey" FOREIGN KEY ("horseId") REFERENCES "Horse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lease" ADD CONSTRAINT "Lease_leaserUserId_fkey" FOREIGN KEY ("leaserUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
