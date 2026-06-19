---
issue: 60
title: "[Lease 01] Datamodel & migratie â€” lease-kern"
status: "Done"
labels: ["lease"]
url: "https://github.com/MiniMaxi-user/velaro/issues/60"
archivedAt: 2026-06-19
---

# #60 — [Lease 01] Datamodel & migratie â€” lease-kern

Onderdeel van epic #59. Gereviewd met de huidige app-context en de visie uit `velaro-leasemodule.md`.

**Doel:** fundament leggen voor de leasemodule in het Prisma-datamodel. **Geen UI in deze story** â€” die volgt vanaf Lease 02.

## Datamodel-effect (Prisma)
Nieuwe modellen, hakend aan `Horse` (centraal profiel):
- `LeaseListing` â€” lease-**aanbod** bij een `Horse`: `leaseType`, `daysPerWeek`, `pricePerMonth`, `region`, `discipline`, `movable`, `exclusive`, `description`, `isActive`.
- `Lease` â€” actieve **overeenkomst** die een leaser (`User`) aan een `Horse` koppelt: `leaseType`, `startDate`, `endDate`, `minimumTermMonths`, `noticePeriodDays`, `trialEndsAt`, `status`.
- Enum `LeaseType`: `FULL`, `DEEL`, `BIJRIJDEN`, `WEDSTRIJD`, `KOOPOPTIE`, `FOK`.
- Enum `LeaseStatus`: `CONCEPT`, `ACTIEF`, `OPGEZEGD`, `BEEINDIGD`.
- Terugrelaties op `Horse` (`leaseListings`, `leases`) en `User` (`leases`).

## UI & plaatsing
N.v.t. â€” alleen schema + migratie. Wel: zet de Nederlandse labels voor `LeaseType` alvast in een helper (`src/features/lease/leaseHelpers.ts`, net als `paardHelpers.ts` met `GESLACHT_LABELS`) zodat alle volgende UI-stories dezelfde teksten gebruiken (Full lease, Deellease, Bijrijden, Wedstrijdlease, Lease met koopoptie, Foklease).

## Acceptatie
- Schema uitgebreid, `npx prisma migrate` draait schoon (Prisma 6, geen prisma.config.ts).
- `npx prisma generate` werkt; bestaande build blijft groen.
- `leaseHelpers.ts` met label-maps aanwezig.

**Afhankelijkheden:** geen â€” dit is het fundament. **Size:** M
