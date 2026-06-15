-- Verplaats zakelijke-/factuurvelden van User naar een nieuw 1-1 gekoppeld
-- OwnerBusinessProfile. Datamodel-refactor ZONDER functionele wijziging.
--
-- Volgorde is bewust: eerst de nieuwe tabel aanmaken, dan bestaande ingevulde
-- data kopiëren, en pas daarna de kolommen op User droppen — zodat er geen data
-- verloren gaat.

-- 1. Nieuwe tabel
CREATE TABLE "OwnerBusinessProfile" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "companyName" TEXT,
    "address" TEXT,
    "postalCode" TEXT,
    "city" TEXT,
    "country" TEXT,
    "kvkNumber" TEXT,
    "vatNumber" TEXT,
    "separateInvoiceAddress" BOOLEAN NOT NULL DEFAULT false,
    "invoiceAddress" TEXT,
    "invoicePostalCode" TEXT,
    "invoiceCity" TEXT,
    "invoiceCountry" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OwnerBusinessProfile_pkey" PRIMARY KEY ("id")
);

-- 2. Unieke index op userId (1-1 relatie)
CREATE UNIQUE INDEX "OwnerBusinessProfile_userId_key" ON "OwnerBusinessProfile"("userId");

-- 3. Foreign key naar User
ALTER TABLE "OwnerBusinessProfile" ADD CONSTRAINT "OwnerBusinessProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. DATAMIGRATIE — kopieer bestaande ingevulde waarden naar profielrijen.
--    Alleen voor User-rijen die ten minste één zakelijk/factuurveld ingevuld
--    hebben (separateInvoiceAddress = true telt ook als ingevuld). Accounts
--    zonder ingevulde gegevens krijgen geen profielrij (relatie is optioneel).
INSERT INTO "OwnerBusinessProfile" (
    "id", "userId",
    "companyName", "address", "postalCode", "city", "country",
    "kvkNumber", "vatNumber",
    "separateInvoiceAddress", "invoiceAddress", "invoicePostalCode", "invoiceCity", "invoiceCountry",
    "createdAt", "updatedAt"
)
SELECT
    gen_random_uuid(), "id",
    "companyName", "address", "postalCode", "city", "country",
    "kvkNumber", "vatNumber",
    "separateInvoiceAddress", "invoiceAddress", "invoicePostalCode", "invoiceCity", "invoiceCountry",
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "User"
WHERE
    "companyName" IS NOT NULL OR
    "address" IS NOT NULL OR
    "postalCode" IS NOT NULL OR
    "city" IS NOT NULL OR
    "country" IS NOT NULL OR
    "kvkNumber" IS NOT NULL OR
    "vatNumber" IS NOT NULL OR
    "separateInvoiceAddress" = true OR
    "invoiceAddress" IS NOT NULL OR
    "invoicePostalCode" IS NOT NULL OR
    "invoiceCity" IS NOT NULL OR
    "invoiceCountry" IS NOT NULL;

-- 5. Pas NU de oude kolommen op User droppen (data is veiliggesteld).
ALTER TABLE "User"
    DROP COLUMN "companyName",
    DROP COLUMN "address",
    DROP COLUMN "postalCode",
    DROP COLUMN "city",
    DROP COLUMN "country",
    DROP COLUMN "kvkNumber",
    DROP COLUMN "vatNumber",
    DROP COLUMN "separateInvoiceAddress",
    DROP COLUMN "invoiceAddress",
    DROP COLUMN "invoicePostalCode",
    DROP COLUMN "invoiceCity",
    DROP COLUMN "invoiceCountry";
