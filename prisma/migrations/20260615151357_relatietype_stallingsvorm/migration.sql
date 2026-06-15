-- CreateEnum
CREATE TYPE "HorseRelatietype" AS ENUM ('STALPAARD', 'PENSIONPAARD', 'LESPAARD', 'LEASEPAARD', 'TRAININGSPAARD', 'VERKOOPPAARD', 'FOKPAARD', 'OPFOKPAARD', 'REVALIDATIEPAARD', 'RUSTPAARD');

-- CreateEnum
CREATE TYPE "HorseStallingsvorm" AS ENUM ('VOLLEDIG_PENSION', 'HALFPENSION', 'WEIDESTALLING', 'PADDOCK', 'TIJDELIJK');

-- AlterTable: voeg de twee nieuwe (nullable) kenmerken toe.
ALTER TABLE "Horse" ADD COLUMN     "relatietype" "HorseRelatietype";
ALTER TABLE "Horse" ADD COLUMN     "stallingsvorm" "HorseStallingsvorm";

-- Backfill: leid het relatietype af uit het oude boolean-veld vóór het wordt gedropt,
-- zodat er geen bestaande relatie-informatie verloren gaat.
--   ownedByStable = true  -> STALPAARD (eigendom van de stal)
--   ownedByStable = false -> PENSIONPAARD (gestald door externe eigenaar)
-- Stallingsvorm wordt niet gevuld (geen oude bron) en blijft NULL.
UPDATE "Horse" SET "relatietype" = 'STALPAARD' WHERE "ownedByStable" = true;
UPDATE "Horse" SET "relatietype" = 'PENSIONPAARD' WHERE "ownedByStable" = false;

-- AlterTable: het oude boolean-veld vervalt; stal/extern volgt voortaan uit het relatietype.
ALTER TABLE "Horse" DROP COLUMN "ownedByStable";
