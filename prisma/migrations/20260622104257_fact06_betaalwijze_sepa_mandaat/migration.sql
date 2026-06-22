-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('OVERBOEKING', 'SEPA_INCASSO');

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "paymentMethod" "PaymentMethod",
ADD COLUMN     "sepaAccountHolder" TEXT,
ADD COLUMN     "sepaIban" TEXT,
ADD COLUMN     "sepaMandateDate" TIMESTAMP(3),
ADD COLUMN     "sepaMandateReference" TEXT;

-- AlterTable
ALTER TABLE "OwnerBusinessProfile" ADD COLUMN     "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'OVERBOEKING',
ADD COLUMN     "sepaAccountHolder" TEXT,
ADD COLUMN     "sepaIban" TEXT,
ADD COLUMN     "sepaMandateDate" TIMESTAMP(3),
ADD COLUMN     "sepaMandateReference" TEXT;

-- AlterTable
ALTER TABLE "Stable" ADD COLUMN     "accountHolder" TEXT,
ADD COLUMN     "iban" TEXT;
