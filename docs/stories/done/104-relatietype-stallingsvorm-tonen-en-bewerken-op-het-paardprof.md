---
issue: 104
title: "Relatietype & stallingsvorm tonen en bewerken op het paardprofiel"
status: "Done"
labels: []
url: "https://github.com/MiniMaxi-user/velaro/issues/104"
archivedAt: 2026-06-19
---

# #104 — Relatietype & stallingsvorm tonen en bewerken op het paardprofiel

# User Story

**Als** staleigenaar (OWNER) of stalmedewerker (STAFF)
**wil ik** per paard het **relatietype** en de **stallingsvorm** kunnen instellen en in
Ã©Ã©n oogopslag terugzien op het paardprofiel en in het paardenoverzicht
**zodat** ik direct weet wat de relatie van een paard met de stal is en welke
stallingsdienst het afneemt.

# Context

Vervolg op de fundament-story #103 (relatietype + stallingsvorm als enum-velden op
`Horse`; `ownedByStable` verwijderd). Deze story maakt de twee kenmerken zichtbaar en
bewerkbaar in de UI, volgens het bestaande design system en de bestaande paarden-UI.

**Beslist door PO (2026-06-15):** `Horse.ownedByStable` vervalt. De bestaande
eigendoms-UI verdwijnt en wordt vervangen door het relatietype:
- `src/features/paarden/EigendomBadge.tsx` wordt **verwijderd**;
- het Eigendom-selectveld in `PaardForm.tsx` wordt **verwijderd**;
- het inlezen van `ownedByStable` in `src/features/paarden/actions.ts` wordt
  **verwijderd**;
- op de detailpagina komt op de plek van de oude Eigendom-badge de **relatietype-badge**.

Relevante bestaande UI:
- Aanmaken/bewerken: `src/features/paarden/PaardForm.tsx`.
- Detailpagina: `src/app/(app)/paarden/[id]/page.tsx`.
- Lijst: `src/app/(app)/paarden/page.tsx` met `PaardKaart.tsx`.
- Badge-stijl: bestaande `badge`-klassen uit `src/styles/globals.css` (geen nieuwe kleuren).

# Scope

## In scope
- **Verwijderen** van `EigendomBadge.tsx`, het Eigendom-selectveld in `PaardForm.tsx`, en
  alle resterende UI-/action-verwijzingen naar `ownedByStable`
  (`actions.ts`, `paarden/page.tsx`, `paarden/[id]/page.tsx`).
- In `PaardForm.tsx` (aanmaken Ã©n bewerken) twee keuzevelden toevoegen: relatietype en
  stallingsvorm, met de Nederlandse labels uit de centrale label-maps (#103).
  Beide optioneel (mogen leeg blijven).
- Server-action (`actions.ts`) slaat beide enum-velden op bij aanmaken/bewerken.
- Op de paard-detailpagina beide kenmerken tonen als badge/label, met de relatietype-badge
  op de plek van de oude Eigendom-badge.
- In het paardenoverzicht (`PaardKaart.tsx`) minstens het relatietype als badge tonen.
- Lege waarde wordt netjes afgehandeld (geen badge of een neutrale "â€”").

## Out of scope
- Datamodelwijzigingen (komen uit #103).
- Koppeling met de contractmodule (#105).
- Filteren/sorteren/zoeken op de kenmerken.

# Acceptatiecriteria

- [ ] `EigendomBadge.tsx` en het Eigendom-selectveld zijn verwijderd; er zijn geen
  verwijzingen naar `ownedByStable` meer in de UI of in `actions.ts`.
- [ ] Bij **aanmaken** van een paard (`/paarden/nieuw`) kan de gebruiker een relatietype
  en een stallingsvorm kiezen; beide mogen leeg blijven.
- [ ] Bij **bewerken** (`/paarden/[id]/bewerken`) worden de huidige waarden voorgevuld en
  kan de gebruiker ze wijzigen of leegmaken.
- [ ] Na opslaan zijn de gekozen waarden gepersisteerd en zichtbaar op de detailpagina.
- [ ] Op de **paard-detailpagina** staan relatietype en stallingsvorm als badge/label
  (Nederlandse labels); de relatietype-badge staat op de plek van de oude Eigendom-badge.
- [ ] In het **paardenoverzicht** is per paard ten minste het relatietype als badge
  zichtbaar.
- [ ] Een paard zonder ingevuld kenmerk toont geen kapotte UI (neutrale weergave).
- [ ] Styling gebruikt bestaande tokens/`badge`-klassen uit `src/styles/globals.css`; geen
  nieuwe kleuren. UI-teksten in het Nederlands. `npm run build` slaagt.

# Technische notities

- Hergebruik de centrale label-maps uit #103; geen labels dupliceren.
- Volg het bestaande selectveld-patroon in `PaardForm.tsx` (zoals `sex`/`discipline`).
- Voor badges: hergebruik de generieke `badge`-klassen; spiegel de stijl die `EigendomBadge`
  had (die verdwijnt).
