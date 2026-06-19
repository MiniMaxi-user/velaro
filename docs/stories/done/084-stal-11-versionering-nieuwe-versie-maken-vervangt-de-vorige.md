---
issue: 84
title: "[STAL-11] Versionering: nieuwe versie maken vervangt de vorige"
status: "Done"
labels: ["contract", "stalling"]
url: "https://github.com/MiniMaxi-user/velaro/issues/84"
archivedAt: 2026-06-19
---

# #84 — [STAL-11] Versionering: nieuwe versie maken vervangt de vorige

**Epic:** Aanbieden & accepteren (#91)
**Hangt af van:** STAL-08 (#81 â€” statusmachine + aanbieden, levert `statusMachine`-helper en `config.statusHistorie`). STAL-11 bouwt voort op de daar gekozen conventies.

# User Story

Als **staleigenaar (OWNER) of stalmedewerker (STAFF)**
wil ik een nieuwe versie van een aangeboden of afgewezen stallingscontract kunnen maken
zodat ik gewijzigde voorwaarden opnieuw kan aanbieden zonder tegenvoorstel-mechaniek, waarbij de oude versie wordt vervangen en de historie bewaard blijft.

# Context

Dit realiseert de Â§4-regel "Vervangen door nieuwe versie": Velaro kent bewust **geen tegenvoorstel-/onderhandelingsmechaniek**. Wijzigen van voorwaarden na een aanbod gebeurt door een nieuwe versie te maken die de vorige vervangt.

Het `Contract`-datamodel bestaat al (`prisma/schema.prisma`) en bevat alles wat hiervoor nodig is:
- `currentVersion Int @default(1)` â€” versienummer.
- `config Json?` â€” JSON-blok met de optie-inhoud (huisvesting, dienstpakket, prijs/looptijd, verzekering, gezondheidsplicht) Ã©n â€” sinds STAL-08 â€” de append-only `config.statusHistorie`-array.
- `ContractStatus`-enum met o.a. `CONCEPT`, `AANGEBODEN`, `AFGEWEZEN`, `VERVANGEN`.

STAL-08 (#81) introduceert een centrale statusmachine-helper (`src/features/contracten/statusMachine.ts`) met een map van toegestane overgangen en legt vast dat statusmomenten in `Contract.config.statusHistorie` worden bewaard **zonder schemawijziging**. STAL-11 volgt diezelfde lijn en breidt de statusmachine uit met de overgangen die voor versionering nodig zijn.

# Scope

**Binnen scope:**
- Server-action `createNewVersion(horseId, contractId)` in `src/features/contracten/actions.ts`:
  - Autorisatie OWNER/STAFF via het bestaande patroon (`getAuthorizedStaff` / `getStableRole`).
  - Alleen toegestaan op een contract met status `AANGEBODEN` of `AFGEWEZEN` (server-side afgedwongen).
  - Zet de huidige versie op status `VERVANGEN` (via de statusmachine-overgang) en legt dit vast in `config.statusHistorie`.
  - Maakt een nieuwe versie aan als status `CONCEPT` met `currentVersion = oude versie + 1`, als **kopie van de inhoud** (alle config-optieblokken: huisvesting, dienstpakket, prijs/looptijd, verzekering/aansprakelijkheid, gezondheidsplicht), zodat de OWNER/STAFF de nieuwe versie direct kan bewerken en opnieuw aanbieden.
- Uitbreiding van de statusmachine-helper met de overgangen `AANGEBODEN â†’ VERVANGEN` en `AFGEWEZEN â†’ VERVANGEN`.
- **Versiehistorie zichtbaar op het contract** in het Contracten-paneel (`ContractenPanel.tsx`): de gebruiker ziet de eerdere (vervangen) versie(s) met versienummer en status naast de huidige versie.
- "Nieuwe versie maken"-knop in het Contracten-paneel (`ContractActies.tsx`), uitsluitend zichtbaar bij status `AANGEBODEN` of `AFGEWEZEN` en uitsluitend voor OWNER/STAFF.

**Buiten scope:**
- Contract-PDF per versie (STAL-12 / #85 voegt de PDF-uitdraai toe).
- Tegenvoorstel-/onderhandelingsmechaniek (bewust niet aanwezig).
- Accepteren/afwijzen door de eigenaar (STAL-09 / #82) en aanbieden zelf (STAL-08 / #81).
- Een apart audit-/`ContractVersion`-Prisma-model: bewust uitgesteld, conform de in STAL-08 vastgelegde lijn (versie-/statusgegevens in `Contract.config`, geen schemawijziging).
- Facturatie.

# Acceptatiecriteria

- [ ] Als een contract status `AANGEBODEN` of `AFGEWEZEN` heeft, wanneer een OWNER of STAFF op "Nieuwe versie maken" klikt, dan krijgt de huidige versie status `VERVANGEN` en wordt een nieuwe versie aangemaakt met status `CONCEPT` en `currentVersion + 1`.
- [ ] Als de nieuwe versie is aangemaakt, dan bevat deze een kopie van alle config-optieblokken van de vervangen versie (huisvesting, dienstpakket, prijs/looptijd, verzekering/aansprakelijkheid, gezondheidsplicht), zodat ze direct bewerkbaar zijn.
- [ ] Als een nieuwe versie wordt gemaakt, dan wordt zowel het `VERVANGEN`-moment (oude versie) als het ontstaan van de nieuwe `CONCEPT`-versie vastgelegd in de statushistorie (`config.statusHistorie`), inclusief tijdstip en uitvoerende gebruiker.
- [ ] Als het contract nÃ­et in status `AANGEBODEN` of `AFGEWEZEN` staat (bv. `CONCEPT`, `GEACCEPTEERD`, `ACTIEF`, `VERVANGEN`), wanneer iemand probeert een nieuwe versie te maken, dan wordt dit server-side geweigerd met een duidelijke foutmelding en verandert er niets.
- [ ] Als een paardeigenaar of een gebruiker zonder OWNER/STAFF-rol op de stal probeert een nieuwe versie te maken, dan wordt dit server-side geweigerd.
- [ ] De versiehistorie (eerdere, vervangen versies met versienummer en status) is zichtbaar op het contract in het Contracten-paneel.
- [ ] De "Nieuwe versie maken"-knop is uitsluitend zichtbaar bij status `AANGEBODEN` of `AFGEWEZEN` en uitsluitend voor OWNER/STAFF.

# Technische notities

- Volg het bestaande patroon in `src/features/contracten/actions.ts`: autorisatie via `getAuthorizedStaff` / `getStableRole`; defensief config-JSON lezen/schrijven zoals de bestaande readers (`leesHuisvesting`, `leesDienstpakket`, `leesPrijsLooptijd`, `leesVerzekeringAansprakelijkheid`, `leesGezondheidsplicht`).
- Hergebruik de in STAL-08 (#81) opgezette `statusMachine`-helper en de `config.statusHistorie`-conventie; voeg daar de overgangen `AANGEBODEN â†’ VERVANGEN` en `AFGEWEZEN â†’ VERVANGEN` aan toe in plaats van een eigen mechaniek.
- Statuslabels/badge-varianten staan in `contractHelpers.ts` (`CONTRACT_STATUS_LABELS`, `CONTRACT_STATUS_BADGE`) â€” hergebruiken voor de historieweergave.
- **Geen Prisma-schemawijziging.** `currentVersion` en `config` bestaan al; versionering verloopt via deze velden en een snapshot van de inhoud in `config`.

Betrokken bestanden (verwacht):
- `src/features/contracten/actions.ts` â€” server-action `createNewVersion`.
- `src/features/contracten/statusMachine.ts` â€” overgangen toevoegen (afkomstig uit STAL-08).
- `src/features/contracten/ContractActies.tsx` â€” "Nieuwe versie maken"-knop.
- `src/features/contracten/ContractenPanel.tsx` â€” versiehistorie tonen.
- `src/features/contracten/queries.ts` â€” indien nodig de historie/versiegegevens ophalen.

# Open vragen

Geen.
