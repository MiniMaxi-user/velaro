-- AlterTable
ALTER TABLE "User" ADD COLUMN     "address" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "companyName" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "invoiceAddress" TEXT,
ADD COLUMN     "invoiceCity" TEXT,
ADD COLUMN     "invoiceCountry" TEXT,
ADD COLUMN     "invoicePostalCode" TEXT,
ADD COLUMN     "kvkNumber" TEXT,
ADD COLUMN     "postalCode" TEXT,
ADD COLUMN     "separateInvoiceAddress" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "vatNumber" TEXT;
