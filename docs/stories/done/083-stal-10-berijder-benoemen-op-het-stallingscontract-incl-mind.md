---
issue: 83
title: "[STAL-10] Berijder benoemen op het stallingscontract (incl. minderjarige)"
status: "Done"
labels: ["contract", "stalling"]
url: "https://github.com/MiniMaxi-user/velaro/issues/83"
archivedAt: 2026-06-19
---

# #83 — [STAL-10] Berijder benoemen op het stallingscontract (incl. minderjarige)

# User Story

Als **staleigenaar (OWNER) of stalmedewerker (STAFF)** wil ik op het stallingscontract de **berijder** van het paard kunnen benoemen (ook als deze minderjarig is), zodat duidelijk is wie het paard rijdt â€” zonder dat die berijder het contract hoeft te ondertekenen.

# Context

Onderdeel van de contracten-module (stalling), epic **#90 â€” Contractinhoud: opties & voorwaarden**. Dit is het optieblok "Berijder".

**Productbeslissing (14 juni 2026):** een stallingscontract wordt **altijd gesloten met een meerderjarige paardeigenaar (ouder/voogd)**. Een minderjarige is nooit de contractpartij en geeft gÃ©Ã©n akkoord/handtekening. De (eventueel minderjarige) berijder wordt wÃ©l op de overeenkomst benoemd, puur informatief. Hiermee vervalt de oorspronkelijke premisse van deze story (mede-akkoord van een gemachtigde vÃ³Ã³r activatie) volledig.

Gevolg voor andere stories: STAL-09 (#82) houdt zijn directe overgang acceptatie â†’ ACTIEF in Ã©Ã©n stap; er is gÃ©Ã©n minderjarig-uitzondering. STAL-08 (#81) wordt niet geraakt. Er is dus geen statusmachine-aanpassing nodig.

Dit blok volgt exact het bestaande optieblok-patroon (huisvesting, dienstpakket, prijs/looptijd, verzekering/aansprakelijkheid, gezondheidsplicht): gegevens als JSON op het bestaande `Contract.config`-veld, beheerd door de stal in het contract-bewerkscherm. **Geen schemawijziging.**

# Scope

**Binnen scope**
- Een optioneel optieblok "Berijder" op het stallingscontract, opgeslagen onder `config.berijder` (JSON op het bestaande `Contract.config`-veld). Velden:
  - `naam` (string).
  - `geboortedatum` (optioneel; gebruikt om minderjarigheid af te leiden voor een indicatie in de weergave).
  - `relatieTotEigenaar` (optioneel, bv. zoon/dochter/pupil).
- Beheer van dit blok door de stal (OWNER/STAFF) in het contract-bewerkscherm, net als de andere optieblokken (via `updateStallingContract`), met server-side autorisatie en alleen op status `CONCEPT` (hergebruik `getEditableConceptContract`).
- Lees-/weergavehelper-module `src/features/contracten/berijder.ts` conform het patroon van de andere blokken: `BerijderConfig`-type, `LEEG_BERIJDER`, `leesBerijder(config)` (defensief uitlezen).
- De berijder tonen in de leesbare contractweergave (`ContractenPanel`), met een minderjarig-indicatie wanneer een geboortedatum is ingevuld (hergebruik `isMinderjarig` uit `src/features/paarden/paardHelpers.ts`).

**Buiten scope**
- Mede-akkoord, bevestiging of handtekening van de berijder of een gemachtigde (vervalt â€” beslissing 14 juni 2026).
- Wijziging aan de accepteer-/activatie-flow (STAL-09 blijft acceptatie â†’ ACTIEF in Ã©Ã©n stap).
- Berijder als optioneel verplicht veld in de aanbied-poort (STAL-08): het blok is optioneel en blokkeert aanbieden niet.
- Rechtsgeldige digitale handtekening (algemeen later, visie regel 142).
- Minderjarige berijder in de lease-module (aparte story onder de lease-epic).

# Acceptatiecriteria

- [ ] Als de stal een concept-contract bewerkt, dan kan zij een berijder benoemen (naam, optioneel geboortedatum en relatie tot eigenaar); deze worden onder `config.berijder` bewaard.
- [ ] Als er een berijder is vastgelegd, dan is deze zichtbaar in de leesbare contractweergave (zowel voor de stal als in de eigenaar-weergave).
- [ ] Als bij de berijder een geboortedatum is ingevuld waaruit volgt dat deze minderjarig is, dan toont de weergave een minderjarig-indicatie.
- [ ] Als het berijder-blok leeg is, dan blokkeert dit het aanbieden van het contract niet (optioneel blok) en toont de weergave geen berijder-sectie.
- [ ] De beheer-actie weigert server-side bewerking door een gebruiker die geen OWNER/STAFF van de stal is, en bewerking van een contract dat niet op `CONCEPT` staat.

# Technische notities

- **Geen schemawijziging.** Gegevens onder `config.berijder` op het bestaande `Contract.config`-JSON, spiegelbeeldig aan `src/features/contracten/verzekeringAansprakelijkheid.ts` / `gezondheidsplicht.ts`.
- Nieuwe module `src/features/contracten/berijder.ts` met `BerijderConfig`-type, `LEEG_BERIJDER` en `leesBerijder(config)` (defensief uitlezen). Geen compleetheids-/verplicht-helper nodig (optioneel blok).
- Beheer-UI inhaken op het bestaande contract-bewerkscherm `src/app/(app)/paarden/[id]/contracten/[contractId]/bewerken/page.tsx` en `ContractForm.tsx`; opslaan via bestaande `updateStallingContract` in `src/features/contracten/actions.ts` (config-spread, overige blokken behouden).
- Minderjarig-indicatie: hergebruik bestaande `isMinderjarig(dateOfBirth)` uit `src/features/paarden/paardHelpers.ts`.
- Weergave in `src/features/contracten/ContractenPanel.tsx`.

# Open vragen

Geen.
