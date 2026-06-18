-- [Unify 01] #127: 1:1-koppeling Contract <-> Lease.
-- Puur additief: nieuwe nullable kolom Lease.contractId + unieke index + FK met
-- onDelete: SetNull. Geen datamigratie van bestaande rijen in deze story.

-- AlterTable
ALTER TABLE "Lease" ADD COLUMN     "contractId" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "Lease_contractId_key" ON "Lease"("contractId");

-- AddForeignKey
ALTER TABLE "Lease" ADD CONSTRAINT "Lease_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;
