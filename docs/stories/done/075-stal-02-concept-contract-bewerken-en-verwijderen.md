---
issue: 75
title: "[STAL-02] Concept-contract bewerken en verwijderen"
status: "Done"
labels: ["contract", "stalling", "tested"]
url: "https://github.com/MiniMaxi-user/velaro/issues/75"
archivedAt: 2026-06-19
---

# #75 — [STAL-02] Concept-contract bewerken en verwijderen

**Epic:** #89 Contract-fundament & concept-contract
**Hangt af van:** #74 STAL-01 (gedeeld datamodel + concept-contract)

## User story
Als **staleigenaar (OWNER)** of **stalmedewerker (STAFF)** wil ik een concept-stallingscontract kunnen bewerken en verwijderen, zodat ik fouten kan corrigeren of een concept kan weggooien voordat het wordt aangeboden.

## Context & scope
Maakt de CRUD-cyclus rond een contract compleet zolang het status `CONCEPT` heeft. Bouwt op het datamodel en de aanmaak-functionaliteit uit #74 (STAL-01). Bewerken/verwijderen mag uitsluitend bij status `CONCEPT`; voor alle latere statussen (vanaf `AANGEBODEN`) gelden andere regels.

**Buiten scope:**
- Bewerken na aanbieden en versionering (latere STAL-story).
- Wijzigen van opties/prijs/looptijd/verzekering â€” die velden bestaan nog niet (latere STAL-stories); deze story bewerkt alleen de basisvelden uit #74 (wederpartij + ingangsdatum).
- Status-overgangen (annuleren, aanbieden, etc.).

## Functionele inhoud
- **Bewerk-route** `src/app/(app)/paarden/[id]/contracten/[contractId]/bewerken/page.tsx` voor de basisvelden uit STAL-01: wederpartij (gekoppelde eigenaar) en ingangsdatum. Hergebruik het formulier-patroon van de aanmaak-route. Toont een melding/blokkering als het contract geen status `CONCEPT` heeft.
- **Server actions** in `src/features/contracten/actions.ts`:
  - `updateStallingContract` â€” werkt wederpartij + ingangsdatum bij.
  - `deleteStallingContract` â€” verwijdert het contract.
  - Beide met autorisatie (OWNER/STAFF van de stal van het paard, via `getStableRole`) Ã©n statuscheck: alleen toegestaan wanneer `status === CONCEPT`. Server-side afgedwongen.
- **UI in de Contracten-tab** (`src/features/paarden/PaardDetailTabs.tsx` â†’ Contracten-tab uit #74): per concept-contract een "Bewerken"-link (naar de bewerk-route) en een "Verwijderen"-knop met bevestigingsdialoog. Bewerken/verwijderen-acties alleen tonen bij status `CONCEPT`.

## User journey
1. OWNER/STAFF opent de Contracten-tab op een paardprofiel en ziet een concept-contract.
2. **Bewerken:** klikt "Bewerken" â†’ past wederpartij/ingangsdatum aan â†’ bevestigt â†’ terug naar de Contracten-tab met de bijgewerkte gegevens.
3. **Verwijderen:** klikt "Verwijderen" â†’ bevestigt in de dialoog â†’ contract verdwijnt uit de lijst.

## Acceptatiecriteria
- [ ] Given een CONCEPT-contract, When OWNER/STAFF de wederpartij en/of ingangsdatum bewerkt en bevestigt, Then worden die velden bijgewerkt en is de wijziging zichtbaar in de Contracten-tab.
- [ ] Given een CONCEPT-contract, When OWNER/STAFF "Verwijderen" kiest en de bevestiging bevestigt, Then is het contract verwijderd en niet meer zichtbaar op het paardprofiel.
- [ ] Given een contract met status ongelijk aan `CONCEPT`, When de bewerk- of verwijder-action wordt aangeroepen, Then wordt deze server-side geweigerd en blijft het contract ongewijzigd.
- [ ] Given een paardeneigenaar (niet OWNER/STAFF), When hij de bewerk-/verwijder-action of -route rechtstreeks aanroept, Then wordt deze server-side geweigerd.
- [ ] `npx tsc --noEmit` slaagt.

## Oplevert (testbaar)
Concepten zijn volledig beheersbaar (CRUD-cyclus rond) vÃ³Ã³r aanbieden.

## Open vragen
Geen.
