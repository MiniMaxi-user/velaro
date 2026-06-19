---
issue: 80
title: "[STAL-07] Entings- & gezondheidsplicht gekoppeld aan de gezondheidsregistratie"
status: "Done"
labels: ["contract", "stalling", "tested"]
url: "https://github.com/MiniMaxi-user/velaro/issues/80"
archivedAt: 2026-06-19
---

# #80 — [STAL-07] Entings- & gezondheidsplicht gekoppeld aan de gezondheidsregistratie

**Epic:** Contractinhoud: opties & voorwaarden (#90)
**Hangt af van:** STAL-01 (contract-datamodel + concept), STAL-04 (dienstpakket-blok als referentiepatroon)
**Sluit aan op bestaande gezondheidsregistratie:** modellen `Vaccination`, `Deworming`, `HoefsmitBezoek` (zie `prisma/schema.prisma`)

# User Story

Als **staleigenaar (OWNER) of stalmedewerker (STAFF)**
wil ik de **entings- en gezondheidsplicht** (vaccinatie, ontworming, hoefsmid, dierenarts-drempel) op het concept-stallingscontract vastleggen en de afgesproken plicht laten afzetten tegen de bestaande gezondheidsregistratie van het paard,
zodat naleving van de gezondheidsafspraken in Ã©Ã©n oogopslag zichtbaar en bewaakbaar is.

# Context

STAL-07 voegt het optieblok **"Entings-/gezondheidsplicht"** (Â§3.3) toe aan het stallingscontract. Dit is het zesde config-blok op het bestaande `Contract`-model en volgt exact het patroon van STAL-03/04/05/06: de afspraken worden als JSON onder `Contract.config` bewaard (nieuwe sleutel `gezondheidsplicht`), getoond/bewerkt via `ContractForm`, opgeslagen via `updateStallingContract` met OWNER/STAFF + CONCEPT-autorisatie. Geen schema-migratie nodig; bestaande config-sleutels blijven behouden.

De toegevoegde waarde van deze story t.o.v. de eerdere blokken is de **koppeling met echte paarddata**: de contract-weergave zet de afgesproken plicht (bv. vaccinatie-interval) af tegen de laatst geregistreerde `Vaccination` / `Deworming` / `HoefsmitBezoek` van het paard en toont per onderdeel een statusindicatie (up-to-date / verloopt binnenkort / verlopen / geen registratie).

# Scope

## Binnen scope
- Config-blok `gezondheidsplicht` met:
  - **Vaccinatieplicht**: aan/uit, welke vaccinaties verplicht (influenza, tetanus â€” checkbox-set), interval in maanden.
  - **Ontworming / mestonderzoek**: aan/uit, beleid als vrije tekst, interval in maanden.
  - **Hoefsmid**: aan/uit, interval in weken.
  - **Dierenarts-drempel**: bedrag (â‚¬) waarboven voorafgaande toestemming van de eigenaar vereist is, plus vlag "meldingsplicht aan eigenaar".
- Het blok tonen in `ContractForm` (sectie "Entings- & gezondheidsplicht"), achter dezelfde conditionele prop-aanpak als de bestaande blokken.
- Server-side lezen + valideren in `actions.ts` (`leesGezondheidsplichtForm`), opslaan onder `config.gezondheidsplicht`, met OWNER/STAFF + CONCEPT-autorisatie (hergebruik `getEditableConceptContract`).
- Statusindicatie in de contract-weergave (`ContractenPanel` / detail) die per actief plicht-onderdeel de laatst geregistreerde gezondheidsgebeurtenis ophaalt en vergelijkt met het afgesproken interval, met statuslabel + badge.
- Nederlandstalige labels en badge-varianten conform bestaand patroon (`contractHelpers.ts` / bestaande `.badge-*` klassen).

## Buiten scope
- Automatische meldingen/herinneringen bij dreigende of verstreken plicht â€” die lopen via de bestaande gezondheidsherinneringen; de koppeling wordt benoemd in STAL-14 (Â§7).
- Wijzigen van de gezondheidsregistratie-modellen of het registreren van nieuwe gezondheidsgebeurtenissen vanuit het contract (alleen-lezen koppeling).
- Facturatie of doorbelasting van gezondheidskosten.
- Blokkeren van een statusovergang (aanbieden/activeren) op basis van niet-naleving â€” STAL-08 e.v.

# Acceptatiecriteria

- [ ] **Gegeven** een CONCEPT-stallingscontract, **wanneer** OWNER of STAFF het blok "Entings- & gezondheidsplicht" invult en opslaat, **dan** worden de afspraken bewaard onder `config.gezondheidsplicht` en getoond op het contract.
- [ ] **Gegeven** een paardeigenaar of niet-stallid, **wanneer** deze probeert het blok te bewerken, **dan** wordt dit server-side geweigerd (geen toegang).
- [ ] **Gegeven** een contract dat niet de status CONCEPT heeft, **wanneer** opslaan wordt geprobeerd, **dan** wordt dit geweigerd ("Alleen een concept-contract kan worden bewerkt").
- [ ] **Gegeven** een actief plicht-onderdeel met een interval, **wanneer** het paard een bijbehorende registratie heeft, **dan** toont de contract-weergave per onderdeel of de registratie aan de plicht voldoet (up-to-date / verloopt binnenkort / verlopen).
- [ ] **Gegeven** een actief plicht-onderdeel waarvoor het paard gÃ©Ã©n registratie heeft, **dan** toont de weergave "geen registratie".
- [ ] **Gegeven** de dierenarts-drempel, **wanneer** een negatief bedrag of ongeldige invoer wordt ingevoerd, **dan** wordt opslaan server-side geweigerd.
- [ ] Lege/uitgeschakelde plicht-onderdelen worden genormaliseerd opgeslagen (vlag uit -> bijbehorende detailvelden null), conform het bestaande blok-patroon.

# Technische notities

- Volg het bestaande blok-patroon: nieuwe module `src/features/contracten/gezondheidsplicht.ts` met het config-type, `LEGE_GEZONDHEIDSPLICHT`, labels en opties. Lezen/valideren in `actions.ts` analoog aan `leesDienstpakketForm` / `leesPrijsLooptijdForm`; mergen in `nieuweConfig` zonder bestaande sleutels te overschrijven.
- De statusvergelijking is afgeleide leeslogica: haal de meest recente `Vaccination` / `Deworming` / `HoefsmitBezoek` per paard op (bestaande velden `date` / `nextDate`) en vergelijk met het afgesproken interval. Plaats deze logica in `queries.ts` of een helper, niet in de UI.
- Geen implementatieontwerp van de exacte drempelwaarden voor "verloopt binnenkort"; kies een redelijke, herbruikbare grens in de helper (consistent voor de drie onderdelen).
- Geen schema-wijziging; alles via `Contract.config` (JSON).

# Open vragen

Geen.
