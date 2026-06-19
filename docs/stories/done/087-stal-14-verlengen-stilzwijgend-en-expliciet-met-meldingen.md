---
issue: 87
title: "[STAL-14] Verlengen (stilzwijgend en expliciet) met meldingen"
status: "Done"
labels: ["contract", "stalling"]
url: "https://github.com/MiniMaxi-user/velaro/issues/87"
archivedAt: 2026-06-19
---

# #87 — [STAL-14] Verlengen (stilzwijgend en expliciet) met meldingen

**Epic:** #93 Beheer & dashboard
**Hangt af van:** #82 STAL-09 (contract komt op ACTIEF), #78 STAL-05 (looptijd/verlengingsmodus in `config.prijsLooptijd.looptijd`)
**Labels:** contract, stalling

# User Story

Als **stal (OWNER/STAFF)** en **paardeigenaar**
wil ik dat een actief stallingscontract conform de vastgelegde looptijdregels kan verlengen,
zodat lopende stallingsafspraken niet onbedoeld eindigen en beide partijen op de hoogte blijven.

# Context

Journey E/S3 (verlengen) uit de contracten-module (stalling). Dit is een beheer-story op een
contract dat al **ACTIEF** is (geleverd via STAL-09, #82). De verlengingsmodus is al per contract
vastgelegd in STAL-05 (#78) onder `config.prijsLooptijd.looptijd.verlenging` met drie waarden:
- `STILZWIJGEND` â€” verlengt automatisch per periode, met melding aan beide partijen.
- `EXPLICIET` â€” verlengt pas nadat beide partijen het bevestigen.
- `GEEN` â€” geen verlenging (deze story doet hier niets).

De `ContractStatus`-enum kent al de waarde `VERLENGD`; er zijn nog gÃ©Ã©n statusovergangen
naar of vanuit `VERLENGD` gedefinieerd. Deze story voegt die overgang(en) toe aan de bestaande
statusmachine-helper (`src/features/contracten/statusMachine.ts`) en dwingt ze server-side af,
net als bij eerdere stories.

Meldingen lopen via het bestaande `Message`-mechanisme (`prisma.message.create` in een transactie,
gekoppeld via `horseId`/`stableId`), dat de meldingen-bel in de topbar voedt. Hetzelfde patroon
als in `acceptContract`/`rejectContract` (`src/features/contracten/actions.ts`). Er hoeft geen nieuw
meldingskanaal gebouwd te worden.

Het verlengmoment (= nieuwe periode/nieuwe einddatum) wordt afgeleid uit de looptijdgegevens
(`einddatum`, `minimumperiode`) in `config.prijsLooptijd.looptijd`. De verlengingen worden,
net als status- en versie-metadata, append-only in `Contract.config` vastgelegd (geen schemawijziging),
in lijn met `leesStatusHistorie`/`metStatusHistorie`.

# Scope

**Binnen scope:**
- Statusmachine uitbreiden: overgang `ACTIEF â†’ VERLENGD` en `VERLENGD â†’ VERLENGD` (een verlengd
  contract kan opnieuw verlengen) toevoegen aan `TOEGESTANE_OVERGANGEN`, server-side afgedwongen.
- **Looptijd-mijlpaal-logica** die voor een actief/verlengd contract het naderende einde en het
  eerstvolgende verlengmoment bepaalt op basis van de looptijdgegevens uit `config.prijsLooptijd`.
- **Stilzwijgende verlenging** (`verlenging === 'STILZWIJGEND'`): wanneer het verlengmoment bereikt
  is, gaat het contract naar `VERLENGD` met een nieuwe periode/einddatum, vastgelegd in `config`,
  en ontvangen beide partijen (stal Ã©n eigenaar) een `Message`.
- **Expliciete verlenging** (`verlenging === 'EXPLICIET'`): een bevestig-actie voor zowel de stal
  (OWNER/STAFF) als de eigenaar (`Contract.counterpartyUserId`). Pas nadat **beide** partijen hebben
  bevestigd, gaat het contract naar `VERLENGD` met nieuwe periode en krijgen beide partijen een melding.
  De afzonderlijke bevestigingen worden in `config` bijgehouden.
- Server-actions in `src/features/contracten/actions.ts` (autorisatie hergebruiken: stalrol via de
  bestaande staf-helpers; eigenaar via `counterpartyUserId`).
- Tonen van het verlengmoment/de verlengstatus en de bevestig-acties in de contract-weergave
  (paardprofiel voor de stal; eigenaar-weergave voor de eigenaar).

**Buiten scope:**
- Opzeggen, opschorten, tijdelijke prijsverlaging en retentierecht (STAL-15, #88).
- Facturatie/innen van de verlengde periode (latere facturatie-stap).
- Indexering/prijswijziging bij verlenging als aparte berekening (alleen de bestaande `indexering`-
  gegevens worden ongewijzigd meegenomen; geen nieuwe prijslogica).
- Contracten met `verlenging === 'GEEN'` (geen verlengactie van toepassing).

# Technische Notities

Twee architectuur-/requirementkeuzes zijn door de productowner beslist (waren open vragen):

- **Trigger van het verlengmoment (stilzwijgende verlenging): LAZY berekenen â€” geen cron/scheduler,
  geen nieuwe infra.** De status en de eventuele verlenging worden afgeleid op het moment dat iemand
  het contract / het dashboard (`/stal`, `/eigenaar`) of de contract-detailpagina opent (paginabezoek
  of relevante actie). De "verlengd"-melding (`Message`) wordt aangemaakt zodra de lazy-berekening de
  verlenging voor het eerst detecteert, en moet **idempotent** zijn â€” bij herhaald paginabezoek wordt
  niet nogmaals verlengd en niet nogmaals een melding aangemaakt (bewaak dit via de append-only
  verleng-metadata in `Contract.config`).
- **Lengte van de nieuwe periode bij stilzwijgende verlenging: de oorspronkelijke minimumperiode/looptijd**
  uit het contract (`config.prijsLooptijd.looptijd.minimumperiode`, met de bijbehorende `einddatum` als
  startpunt), **niet** telkens +1 maand.

# Acceptatiecriteria

- [ ] **Als** een actief stallingscontract stilzwijgende verlenging heeft (`verlenging === 'STILZWIJGEND'`),
      **wanneer** iemand het contract, het dashboard (`/stal`, `/eigenaar`) of de contract-detailpagina
      opent en de lazy-berekening vaststelt dat het verlengmoment bereikt is, **dan** krijgt het contract
      status `VERLENGD` met een nieuwe einddatum die **Ã©Ã©n oorspronkelijke minimumperiode/looptijd verder**
      ligt, en ontvangen zowel de stal als de eigenaar een melding via een `Message`.
- [ ] **Als** een stilzwijgend contract al door de lazy-berekening verlengd is, **wanneer** dezelfde of een
      andere gebruiker de pagina opnieuw opent (zonder dat een nieuw verlengmoment is bereikt), **dan** wordt
      het contract **niet** nogmaals verlengd en wordt **geen** dubbele "verlengd"-melding aangemaakt
      (idempotent, bewaakt via de append-only verleng-metadata in `config`).
- [ ] **Als** een contract expliciete verlenging heeft (`verlenging === 'EXPLICIET'`), **wanneer** slechts
      Ã©Ã©n van beide partijen heeft bevestigd, **dan** blijft de status `ACTIEF` (geen verlenging).
- [ ] **Als** een contract expliciete verlenging heeft, **wanneer** beide partijen hebben bevestigd,
      **dan** krijgt het contract status `VERLENGD` met een nieuwe einddatum die **Ã©Ã©n oorspronkelijke
      minimumperiode/looptijd verder** ligt, en ontvangen beide partijen een melding.
- [ ] **Als** een gebruiker een verlengactie probeert vanuit een status waar dat niet mag (bv. CONCEPT,
      AANGEBODEN, AFGEWEZEN), **dan** wordt de actie server-side geweigerd via de statusmachine-helper,
      ongeacht de client.
- [ ] **Als** de eigenaar de bevestig-actie aanroept op een contract waarvan hij niet de gekoppelde
      `counterpartyUserId` is, **dan** wordt de actie geweigerd; idem voor verlengacties door iemand
      zonder geldige stalrol.
- [ ] **Als** een contract `verlenging === 'GEEN'` heeft, **dan** is er geen verlengactie beschikbaar en
      treedt er geen automatische verlenging op.
- [ ] Elke verlenging (stilzwijgend of expliciet) wordt append-only vastgelegd in `Contract.config`
      (geen schemawijziging), in lijn met de bestaande statushistorie.
