-- [Unify 08] #134: opruimen onbereikbare lease-concepten.
-- Sinds [Unify 07] #133 bestaat er geen UI meer om losse Lease-concepten te
-- beheren; nieuwe operationele leases ontstaan uitsluitend 1:1 bij activatie van
-- een unified Contract ([Unify 06] #132). De resterende, niet aan een Contract
-- gekoppelde concept-leases zijn daarmee onbeheerbaar geworden.
--
-- Triviale datamigratie: verwijder uitsluitend Lease-rijen die zowel losgekoppeld
-- (contractId IS NULL) als status = 'CONCEPT' zijn. Leases met een contractId of
-- met een niet-CONCEPT-status (ACTIEF / OPGEZEGD / BEEINDIGD) blijven ongemoeid,
-- zodat geen leaser-toegang, gedeelde kalender of mijlpaal van een actieve lease
-- verloren gaat. Geen schema-wijziging.

DELETE FROM "Lease"
WHERE "contractId" IS NULL
  AND "status" = 'CONCEPT';
