---
issue: 81
title: "[STAL-08] Statusmachine + contract aanbieden (met verplicht-veld-validatie) en melding aan eigenaar"
status: "Done"
labels: ["contract", "stalling"]
url: "https://github.com/MiniMaxi-user/velaro/issues/81"
archivedAt: 2026-06-19
---

# #81 — [STAL-08] Statusmachine + contract aanbieden (met verplicht-veld-validatie) en melding aan eigenaar

**Epic:** Aanbieden & accepteren (#91)
**Hangt af van:** STAL-01 (Contract-datamodel + status), STAL-05 (prijs/borg/looptijd â€” gebouwd in PBI #78).
**Geblokkeerd door:** STAL-06 (#79, verzekering & aansprakelijkheid) â€” zie Beslissingen. Daarom label `blocked`: niet bouwen vÃ³Ã³r #79 klaar is.

# User Story

Als **staleigenaar (OWNER) of stalmedewerker (STAFF)**
wil ik een volledig ingevuld concept-stallingscontract aan de paardeigenaar kunnen aanbieden
zodat het contractproces formeel start en de eigenaar het kan beoordelen.

# Context

Dit is de kernmijlpaal van Journey S1: de overgang van een intern concept naar een formeel aanbod aan de paardeigenaar.

Het `Contract`-datamodel bestaat al (`prisma/schema.prisma`), inclusief de `ContractStatus`-enum (`CONCEPT`, `AANGEBODEN`, â€¦) en een `config`-JSON-veld waarin de optieblokken van eerdere stories worden bewaard (huisvesting, dienstpakket, prijs/borg/looptijd). De server-actions voor aanmaken/bewerken/verwijderen van een concept-contract staan in `src/features/contracten/actions.ts`; bewerken is al server-side beperkt tot status `CONCEPT`.

De melding aan de eigenaar loopt via de bestaande Meldingen-functionaliteit: het `Message`-model (paard-/stalgericht via `horseId`/`stableId`) voedt de meldingen-bel in de topbar. Er hoeft geen nieuw meldingskanaal gebouwd te worden.

# Scope

**Binnen scope:**
- Een centrale statusmachine-helper in `src/features/contracten/` die de toegestane contract-statusovergangen kent en een functie biedt om een overgang te valideren. Voor deze story is alleen de overgang `CONCEPT â†’ AANGEBODEN` relevant; de helper wordt zo opgezet dat latere stories er overgangen aan toevoegen.
- Server-side afdwinging: een niet-toegestane statusovergang wordt geweigerd (foutmelding), ongeacht de client.
- Server-action `offerContract` (of vergelijkbaar): controleert dat de verplichte blokken volledig zijn, zet `status` van `CONCEPT` naar `AANGEBODEN`, en legt het aanbiedmoment vast in de statushistorie (zie Beslissingen â€” geen schemawijziging).
- **Verplicht-veld-validatie** vÃ³Ã³r aanbieden. Per optieblok een compleetheids-helper in de bijbehorende feature-module, die de ontbrekende velden teruggeeft voor begrijpelijke feedback. Verplichte set (zie Beslissingen, AC's hieronder):
  - **Prijs/looptijd (STAL-05):** pensionprijs ingevuld; bij bepaalde tijd ook einddatum.
  - **Huisvesting (STAL-03):** boxtype gekozen.
  - **Dienstpakket (STAL-04):** ruwvoer-opgave ingevuld; bij actieve weidegang ook de weidegang-vorm.
  - **Verzekering/aansprakelijkheid (STAL-06):** verplicht zodra dat blok bestaat â€” de reden dat deze story op #79 wacht.
- Melding aan de paardeigenaar (de `counterparty` van het contract) via een nieuw `Message`-record op het betreffende paard, zodat de bestaande meldingen-bel het oppakt.
- "Aanbieden"-knop in het Contracten-paneel (`ContractenPanel.tsx` / `ContractActies.tsx`), alleen zichtbaar bij status `CONCEPT` en alleen voor OWNER/STAFF, met duidelijke validatie-feedback bij onvolledigheid.

**Buiten scope:**
- Accepteren / afwijzen door de eigenaar (STAL-09).
- Contract-PDF genereren (STAL-12).
- Versionering / nieuwe versie maken (STAL-11).
- Het bouwen van het verzekering/aansprakelijkheid-optieblok zelf (STAL-06 / #79). STAL-08 consumeert dat blok alleen als verplicht-validatie.
- Facturatie.

# Acceptatiecriteria

- [ ] Als een concept-contract de verplichte velden volledig heeft ingevuld, wanneer een OWNER of STAFF op "Aanbieden" klikt, dan wordt de status `AANGEBODEN` en wordt het aanbiedmoment vastgelegd in de statushistorie.
- [ ] Als het contract aangeboden wordt, dan ontvangt de paardeigenaar (de wederpartij) een melding via `Message` op het betreffende paard, zichtbaar in de meldingen-bel.
- [ ] Als de **pensionprijs** ontbreekt, of de **einddatum** ontbreekt bij bepaalde tijd, wanneer iemand probeert aan te bieden, dan wordt dit server-side geweigerd met een duidelijke foutmelding en blijft de status `CONCEPT`.
- [ ] Als het **boxtype** (huisvesting) ontbreekt, wanneer iemand probeert aan te bieden, dan wordt dit server-side geweigerd met een duidelijke foutmelding en blijft de status `CONCEPT`.
- [ ] Als de **ruwvoer-opgave** ontbreekt, of bij **actieve weidegang** de weidegang-vorm ontbreekt, wanneer iemand probeert aan te bieden, dan wordt dit server-side geweigerd met een duidelijke foutmelding en blijft de status `CONCEPT`.
- [ ] Als het **verzekering/aansprakelijkheid-blok (STAL-06)** onvolledig is, wanneer iemand probeert aan te bieden, dan wordt dit server-side geweigerd. (Realiseren zodra STAL-06 / #79 gebouwd is.)
- [ ] Als een paardeigenaar (geen OWNER/STAFF van de stal) probeert aan te bieden, dan wordt dit server-side geweigerd.
- [ ] Een niet-toegestane statusovergang (bv. aanbieden van een contract dat niet in `CONCEPT` staat) wordt server-side geweigerd.
- [ ] De "Aanbieden"-knop is uitsluitend zichtbaar bij status `CONCEPT` en uitsluitend voor OWNER/STAFF. Bij onvolledige verplichte velden toont de UI welke blokken nog ontbreken.

# Technische notities

- Volg het bestaande patroon in `src/features/contracten/actions.ts`: autorisatie via `getAuthorizedStaff` / `getStableRole` (hergebruik desnoods `getEditableConceptContract` voor de CONCEPT-bewaking), gegevens uit `config`-JSON lezen met de bestaande defensieve readers (`leesPrijsLooptijd`, `leesHuisvesting`, `leesDienstpakket`).
- Compleetheids-helpers per blok het liefst in de bijbehorende module (`prijsLooptijd.ts`, `huisvesting.ts`, `dienstpakket.ts`), zodat validatie en datavorm bij elkaar staan en de UI dezelfde helper kan gebruiken voor de "ontbreekt nog"-feedback.
- Statusmachine als losse helper (bv. `statusMachine.ts`) met een map van toegestane overgangen; `offerContract` valideert `CONCEPT â†’ AANGEBODEN` daarmee.
- Statuslabels en badge-varianten staan al in `contractHelpers.ts` (`CONTRACT_STATUS_LABELS`, `CONTRACT_STATUS_BADGE`); hergebruiken.
- **Geen Prisma-schemawijziging.** Het aanbiedmoment + statushistorie worden in `Contract.config` bewaard (zie Beslissingen).

# Beslissingen (vastgelegd â€” was: open vragen)

1. **STAL-06-afhankelijkheid:** STAL-08 **wacht op STAL-06** (#79). De verzekering/aansprakelijkheid-validatie hoort bij de verplicht-set; daarom wordt deze story pas gebouwd nadat #79 klaar is. Label `blocked` gezet. (De rest van de story â€” statusmachine, melding, STAL-03/04/05-validatie â€” is al volledig uitvoerbaar; zodra #79 mergt vervalt de blokkade.)
2. **Aanbiedmoment / statuslog:** vastleggen in `Contract.config`, **geen schemawijziging**. Voorstel: een append-only `config.statusHistorie`-array van `{ van, naar, op (ISO-timestamp), doorUserId }`. Het aanbiedmoment is de eerste entry `{ van: "CONCEPT", naar: "AANGEBODEN", â€¦ }`. Een dedicated audit-/historie-model is bewust uitgesteld.
3. **Verplichte blokken vÃ³Ã³r aanbieden:** prijs/looptijd **Ã©n** huisvesting **Ã©n** dienstpakket, met de concrete velden zoals in de AC's hierboven. Verzekering/aansprakelijkheid (STAL-06) komt erbij zodra dat blok bestaat.
