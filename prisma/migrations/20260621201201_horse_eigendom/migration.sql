-- CreateEnum
CREATE TYPE "HorseEigendom" AS ENUM ('STAL', 'PARTICULIER');

-- AlterTable
ALTER TABLE "Horse" ADD COLUMN     "eigendom" "HorseEigendom" NOT NULL DEFAULT 'PARTICULIER';

-- Backfill: paarden met een ondubbelzinnig staleigendom-relatietype (stalpaard /
-- lespaard/manegepaard) worden STAL, mits er geen particuliere eigenaar (HorsePerson
-- met isOwner) aan hangt. Alle overige paarden blijven PARTICULIER (de kolom-default).
-- De rest van de relatietypes (pension/lease/training/verkoop/fok/opfok/revalidatie/rust)
-- is dubbelzinnig of doorgaans extern en wordt bewust niet automatisch op STAL gezet;
-- de stal kan dat per paard handmatig omzetten.
UPDATE "Horse" h
SET "eigendom" = 'STAL'
WHERE h."relatietype" IN ('STALPAARD', 'LESPAARD')
  AND NOT EXISTS (
    SELECT 1 FROM "HorsePerson" hp
    WHERE hp."horseId" = h."id" AND hp."isOwner" = true
  );
