-- CreateTable
CREATE TABLE "ContractBijlage" (
    "id" UUID NOT NULL,
    "contractId" UUID NOT NULL,
    "categorie" TEXT NOT NULL,
    "bestandsnaam" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractBijlage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContractBijlage_contractId_idx" ON "ContractBijlage"("contractId");

-- AddForeignKey
ALTER TABLE "ContractBijlage" ADD CONSTRAINT "ContractBijlage_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
