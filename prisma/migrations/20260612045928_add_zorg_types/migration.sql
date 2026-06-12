-- CreateEnum
CREATE TYPE "ZorgType" AS ENUM ('VACCINATIE', 'ONTWORMING', 'DIERENARTS', 'HOEFSMIT');

-- AlterTable
ALTER TABLE "RecurringTask" ADD COLUMN     "zorgType" "ZorgType";

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "zorgType" "ZorgType";

-- CreateTable
CREATE TABLE "HoefsmitBezoek" (
    "id" UUID NOT NULL,
    "horseId" UUID NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "hoefsmid" TEXT,
    "nextDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HoefsmitBezoek_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HoefsmitBezoek_horseId_idx" ON "HoefsmitBezoek"("horseId");

-- AddForeignKey
ALTER TABLE "HoefsmitBezoek" ADD CONSTRAINT "HoefsmitBezoek_horseId_fkey" FOREIGN KEY ("horseId") REFERENCES "Horse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
