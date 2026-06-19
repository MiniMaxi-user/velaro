---
issue: 103
title: "Datamodel: relatietype & stallingsvorm op het paardprofiel"
status: "Done"
labels: []
url: "https://github.com/MiniMaxi-user/velaro/issues/103"
archivedAt: 2026-06-19
---

# #103 — Datamodel: relatietype & stallingsvorm op het paardprofiel

# User Story

**Als** staleigenaar (OWNER) of stalmedewerker (STAFF)
**wil ik** dat het datamodel per paard een **relatietype** (relatie/eigendom met de stal)
Ã©n een **stallingsvorm** (afgenomen dienst) kan vastleggen
**zodat** deze twee onafhankelijke kenmerken later in de UI en in de contractmodule
betrouwbaar gebruikt kunnen worden.

# Context

Dit is de **fundament-story** van de epic "Paard-stalrelatie & stallingsvorm". Conform
de bouwvolgorde in `CLAUDE.md` (fundament/datamodel vÃ³Ã³r UI vÃ³Ã³r feature) leggen we
eerst het datamodel vast; UI (#104) en contract-koppeling (#105) bouwen hierop voort.

Het centrale paardprofiel is model `Horse` in `prisma/schema.prisma`. De PO wil dit
verrijken met **twee onafhankelijke, naast elkaar bestaande tags**:

- **As 1 â€” Relatietype** (eigendom/relatie met de stal), Ã©Ã©n waarde per paard:
  stalpaard/eigen paard, pensionpaard, lespaard/manegepaard, leasepaard,
  trainings-/beleerpaard, verkoop-/handelspaard, fokpaard, opfokpaard,
  revalidatie-/herstelpaard, rust-/pensioenpaard. (10 waarden)
- **As 2 â€” Stallingsvorm** (dienst, los van As 1), Ã©Ã©n waarde per paard:
  volledig pension, halfpension, weidestalling/grass livery, paddock/trailbox,
  tijdelijke/nachtstalling. (5 waarden)

**Beslist door PO (2026-06-15):**
- Het bestaande veld `Horse.ownedByStable` **vervalt**. Stal/extern volgt voortaan
  impliciet uit het relatietype (As 1); de concrete externe eigenaar blijft af te leiden
  uit `HorsePerson.isOwner = true`.
- De waardenlijsten worden vastgelegd als **Prisma enums** (`PascalCase` enumnaam,
  `UPPER_SNAKE`-waarden), consistent met `HorseSex`/`ContractStatus`/`ContractFamily`.
  Nederlandse labels via centrale label-maps in `paardHelpers.ts`.

# Scope

## In scope
- Twee nieuwe **Prisma enums** + twee nieuwe velden op `Horse`:
  - relatietype (As 1) â€” enum met exact de 10 waarden hierboven, veld nullable.
  - stallingsvorm (As 2) â€” enum met exact de 5 waarden hierboven, veld nullable.
- **Verwijderen** van `Horse.ownedByStable` (schema) en de bijbehorende
  invariant-comment in `schema.prisma`.
- **Datamigratie/backfill** bij het droppen van `ownedByStable`, zodat geen bestaande
  informatie verloren gaat:
  - `ownedByStable = true â†’ relatietype = stalpaard/eigen paard`
  - `ownedByStable = false â†’ relatietype = pensionpaard`
  (uit te voeren binnen dezelfde migratie, vÃ³Ã³r de kolom wordt gedropt).
- Centrale label-maps voor beide assen (Nederlandse UI-labels) in
  `src/features/paarden/paardHelpers.ts`, in lijn met `GESLACHT_LABELS`.
- Prisma-migratie + `prisma generate`.

## Out of scope
- UI om de velden te tonen/bewerken (#104).
- Koppeling met de contractmodule / contract_type (#105).
- Verwijderen van `EigendomBadge.tsx` / het Eigendom-selectveld in de UI â€” dat hoort bij
  #104 (deze story raakt alleen schema, migratie en label-maps).
- Filteren/zoeken op de nieuwe kenmerken.
- Nieuwe waarden buiten de hierboven genoemde sets.

# Acceptatiecriteria

- [ ] In `schema.prisma` bestaat een enum voor **relatietype** met exact de 10 waarden uit
  As 1 (`UPPER_SNAKE`), en een veld op `Horse` dat ernaar verwijst; het veld is nullable.
- [ ] In `schema.prisma` bestaat een enum voor **stallingsvorm** met exact de 5 waarden uit
  As 2 (`UPPER_SNAKE`), en een veld op `Horse` dat ernaar verwijst; het veld is nullable.
- [ ] Het veld `Horse.ownedByStable` en de bijbehorende invariant-comment zijn uit het
  schema verwijderd.
- [ ] De migratie voert vÃ³Ã³r het droppen van `ownedByStable` de backfill uit:
  `true â†’ stalpaard`, `false â†’ pensionpaard`; er gaat geen bestaande relatie-informatie
  verloren.
- [ ] In `paardHelpers.ts` staan twee centrale label-maps (`Record<Enum, string>`,
  Nederlands) voor relatietype en stallingsvorm, herbruikbaar door #104 en #105.
- [ ] `npx prisma migrate` en `npx prisma generate` zijn uitgevoerd; de Prisma-client kent
  de nieuwe enums/velden en kent `ownedByStable` niet meer.
- [ ] Het project compileert: `npm run build` / typecheck slaagt. (Let op: code die nu nog
  `ownedByStable` leest â€” `actions.ts`, `PaardForm.tsx`, `EigendomBadge.tsx`,
  `paarden/page.tsx`, `paarden/[id]/page.tsx` â€” moet minimaal compileerbaar blijven; het
  funtioneel verwijderen ervan is #104. Verwijder hier uitsluitend wat nodig is om te
  blijven compileren, zonder UI-gedrag te herontwerpen.)
- [ ] Geen nieuwe UI of contract-functionaliteit in deze story (puur fundament).

# Technische notities

- Volg de bestaande enum-conventie in `schema.prisma` (`PascalCase` enumnaam,
  `UPPER_SNAKE`-waarden, zoals `HorseSex`, `ContractStatus`, `ContractFamily`).
- Modelkeuze "Ã©Ã©n paardprofiel, twee tags": twee losse enum-velden op `Horse`; geen apart
  koppelmodel, geen many-to-many, geen losse tag-tabel.
- De backfill hoort in de Prisma-migratie zelf (raw SQL `UPDATE` op basis van
  `ownedByStable`) vÃ³Ã³r de `DROP COLUMN`. Map exact: `true â†’ stalpaard/eigen paard`,
  `false â†’ pensionpaard`.
- Stallingsvorm wordt door de migratie **niet** gevuld (blijft NULL voor bestaande
  paarden) â€” er is geen oude bron voor af te leiden.
