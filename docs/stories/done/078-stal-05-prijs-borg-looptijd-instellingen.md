---
issue: 78
title: "[STAL-05] Prijs, borg & looptijd-instellingen"
status: "Done"
labels: ["contract", "stalling", "tested"]
url: "https://github.com/MiniMaxi-user/velaro/issues/78"
archivedAt: 2026-06-19
---

# #78 — [STAL-05] Prijs, borg & looptijd-instellingen

**Epic:** #90 Contractinhoud: opties & voorwaarden
**Hangt af van:** #74 STAL-01 (datamodel + concept-contract â€” gereed), #76 STAL-03 (sluit aan op het bewerkscherm)

# User Story

Als **staleigenaar (OWNER)** of **stalmedewerker (STAFF)**
wil ik op een concept-stallingscontract de pensionprijs, borg en looptijd-voorwaarden vastleggen,
zodat de financiÃ«le en contractuele kern van de overeenkomst klopt voordat ik het aanbied.

# Context

Vijfde verticale slice van de contracten-module (Â§3.2 looptijd + prijs/borg uit Â§3.3),
opgeslagen als **data** op het contract â€” nog gÃ©Ã©n facturatie/innen. De prijs- en
looptijd-gegevens zijn nodig om later te kunnen aanbieden (#81 STAL-08, dat hierop valideert)
en voor beheer (#87 STAL-14 verlengen, #88 STAL-15 opzeggen).

Het datamodel-fundament bestaat al (STAL-01): het `Contract.config` JSON-veld is bewust
toegevoegd zodat opties zoals prijs/borg/looptijd erin opgeslagen worden **zonder nieuwe migratie**.
Deze story slaat de prijs/borg/looptijd-gegevens op in een blok binnen `config` (bv. `config.prijsLooptijd`).
De bestaande server-actions in `src/features/contracten/actions.ts` (met autorisatie via
`getEditableConceptContract` + `getStableRole`) en het patroon van `ContractForm.tsx` worden hergebruikt/uitgebreid.

# Scope

**Binnen scope:**
- Uitbreiden van het contract-config-blok (in `Contract.config`) met:
  - **Pensionprijs:** bedrag + vlag incl./excl. btw + btw-percentage (instelbaar) + frequentie (vast: per maand).
  - **Borg:** aan/uit + bedrag (bedrag verplicht als aan).
  - **Looptijd:** aard (bepaalde tijd / onbepaalde tijd); einddatum (bij bepaalde tijd); minimumperiode; opzegtermijn (waarde + eenheid, default 1 maand, schriftelijk); verlenging (stilzwijgend per maand/periode | expliciet | geen); proefperiode (aan/uit + duur); indexering (aan/uit + grondslag + moment).
  - Ingangsdatum (`startDate`) komt uit STAL-01 en wordt hier niet opnieuw ingevoerd.
- Sectie **"Prijs & looptijd"** toevoegen aan het contract-bewerkscherm, in lijn met `ContractForm.tsx` en de bestaande `form-card`/`form-grid`/`form-group`-klassen.
- Server-side validatie bij opslaan (zie acceptatiecriteria).
- Uitbreiden/aanvullen van de update-action in `src/features/contracten/actions.ts`; autorisatie OWNER/STAFF, uitsluitend bij status CONCEPT (hergebruik `getEditableConceptContract`).
- De opgeslagen waarden tonen op het contract (bewerkscherm en/of detail in `ContractenPanel.tsx`).

**Buiten scope:**
- Innen/facturatie (latere bouwstap 6).
- Verzekerings- & aansprakelijkheidsblok (#79 STAL-06).
- Huisvesting/voer/weidegang (#76 STAL-03, #77 STAL-04).
- Statusovergangen / aanbieden (#81 STAL-08) en PDF-rendering (#85 STAL-12).
- Het daadwerkelijk uitvoeren van verlenging/opzegging/indexering (#87/#88) â€” hier alleen de instellingen vastleggen.

# Acceptatiecriteria

- [ ] **Opslaan basis:** Als een contract status CONCEPT heeft en een OWNER/STAFF van de stal de sectie "Prijs & looptijd" invult en opslaat, dan worden pensionprijs, borg en looptijd-velden bewaard in `Contract.config` en bij heropenen van het bewerkscherm weer getoond.
- [ ] **Default opzegtermijn:** Bij aard = onbepaalde tijd is de opzegtermijn standaard 1 kalendermaand (schriftelijk).
- [ ] **Validatie bepaalde tijd:** Opslaan van aard = bepaalde tijd zÃ³nder einddatum wordt geweigerd met een duidelijke foutmelding (server-side afgedwongen).
- [ ] **Validatie opzegtermijn:** Bij onbepaalde tijd met een opzegtermijn korter dan 1 kalendermaand toont het scherm een waarschuwing.
- [ ] **Validatie borg:** Als borg = aan, dan is een borgbedrag verplicht; ontbreekt het, dan wordt opslaan geweigerd.
- [ ] **Validatie prijs:** De pensionprijs is een niet-negatief bedrag; de btw-vlag (incl./excl.) en het btw-percentage worden meegeslagen.
- [ ] **Autorisatie:** Een paardeneigenaar (niet OWNER/STAFF) die de update-action of het bewerkscherm rechtstreeks aanroept, wordt server-side geweigerd; er wordt niets opgeslagen.
- [ ] **Alleen CONCEPT:** Bewerken van prijs/looptijd is alleen mogelijk zolang het contract status CONCEPT heeft.
- [ ] **Build:** `npx prisma generate` (indien gewijzigd) en `npx tsc --noEmit` slagen.

# Open vragen

- Btw-percentage: vast op Ã©Ã©n tarief of instelbaar? **Voorstel (overgenomen, niet blokkerend):** vlag incl./excl. btw + Ã©Ã©n instelbaar btw-percentage per contract. Builder mag dit voorstel volgen; alleen escaleren als dit tijdens de bouw onhaalbaar blijkt.
