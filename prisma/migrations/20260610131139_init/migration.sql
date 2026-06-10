-- CreateEnum
CREATE TYPE "StableRole" AS ENUM ('OWNER', 'STAFF');

-- CreateEnum
CREATE TYPE "HorseSex" AS ENUM ('MARE', 'STALLION', 'GELDING');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stable" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "postalCode" TEXT,
    "city" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StableMember" (
    "id" UUID NOT NULL,
    "stableId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "StableRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StableMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Horse" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "breed" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "sex" "HorseSex",
    "color" TEXT,
    "chipNumber" TEXT,
    "boxNumber" TEXT,
    "stableId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Horse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HorseOwner" (
    "id" UUID NOT NULL,
    "horseId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HorseOwner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "StableMember_userId_idx" ON "StableMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StableMember_stableId_userId_key" ON "StableMember"("stableId", "userId");

-- CreateIndex
CREATE INDEX "Horse_stableId_idx" ON "Horse"("stableId");

-- CreateIndex
CREATE INDEX "HorseOwner_userId_idx" ON "HorseOwner"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "HorseOwner_horseId_userId_key" ON "HorseOwner"("horseId", "userId");

-- AddForeignKey
ALTER TABLE "StableMember" ADD CONSTRAINT "StableMember_stableId_fkey" FOREIGN KEY ("stableId") REFERENCES "Stable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StableMember" ADD CONSTRAINT "StableMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Horse" ADD CONSTRAINT "Horse_stableId_fkey" FOREIGN KEY ("stableId") REFERENCES "Stable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HorseOwner" ADD CONSTRAINT "HorseOwner_horseId_fkey" FOREIGN KEY ("horseId") REFERENCES "Horse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HorseOwner" ADD CONSTRAINT "HorseOwner_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
