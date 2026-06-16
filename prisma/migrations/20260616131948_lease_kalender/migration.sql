-- CreateTable
CREATE TABLE "LeaseDagdeelClaim" (
    "id" UUID NOT NULL,
    "horseId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "datum" DATE NOT NULL,
    "dagdeel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaseDagdeelClaim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeaseDagdeelClaim_horseId_idx" ON "LeaseDagdeelClaim"("horseId");

-- CreateIndex
CREATE INDEX "LeaseDagdeelClaim_userId_idx" ON "LeaseDagdeelClaim"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LeaseDagdeelClaim_horseId_datum_dagdeel_key" ON "LeaseDagdeelClaim"("horseId", "datum", "dagdeel");

-- AddForeignKey
ALTER TABLE "LeaseDagdeelClaim" ADD CONSTRAINT "LeaseDagdeelClaim_horseId_fkey" FOREIGN KEY ("horseId") REFERENCES "Horse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaseDagdeelClaim" ADD CONSTRAINT "LeaseDagdeelClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
