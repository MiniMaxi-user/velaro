---
issue: 139
title: "Datamodel: expliciet eigendom (stal/particulier) op het paard"
status: "Done"
labels: []
url: "https://github.com/MiniMaxi-user/velaro/issues/139"
archivedAt: 2026-06-21
---

# #139 — Datamodel: expliciet eigendom (stal/particulier) op het paard

## Waarom

Een paard kan in werkelijkheid van de **stal zelf** zijn (manege-/les-/stalpaard) of
van een **particuliere eigenaar**. Het datamodel leidde "wie is eigenaar" tot nu toe
impliciet af uit `Horse.relatietype` (fragiel, en het vermengt "soort paard" met
"eigendom"). Daardoor kon o.a. een leasecontract niet worden opgesteld voor een
stal-eigen paard: de poort eiste hard een gekoppelde `HorsePerson`-eigenaar
(zie #138). Bovendien was de lease-counterparty verwarrend: in het formulier
gelabeld als "eigenaar" en gevalideerd op `isOwner`, maar bij activatie gebruikt als
**leaser**.

## Wat is gebouwd

- **Schema + migratie** (`20260621201201_horse_eigendom`): nieuw `enum HorseEigendom
  { STAL PARTICULIER }` en `Horse.eigendom` (default `PARTICULIER`), losgekoppeld van
  `relatietype` (dat blijft beschrijvend "soort paard"). Backfill: `STAL` voor
  `STALPAARD`/`LESPAARD` zonder gekoppelde eigenaar; al het overige `PARTICULIER`.
- **`heeftEigenaar({ eigendom, people })`** (`paardHelpers.ts`) als bron van waarheid
  voor de contract-poort (STAL → altijd een eigenaar; PARTICULIER → vereist
  `HorsePerson.isOwner`). Toegepast op de contract-dropdown, de nieuw-contract-gate en
  de `createLeaseContract`-poort.
- **Lease-counterparty ontward**: de wederpartij van een leasecontract is nu expliciet
  de **leaser** (niet de eigenaar). Validatie eist geen `isOwner` meer; de leaser moet
  bij het paard of de stal horen (gekoppelde persoon óf stallid). Leaser-keuzelijst =
  stalleden + gekoppelde personen. Label/hint in de stepper aangepast.
- **UI op de Eigenaar/bereider-tab** (`PersonenBeheer`): keuze **Deze stal /
  Particuliere eigenaar** (`setHorseEigendom`). Bij STAL wordt de stal als eigenaar
  getoond en het eigenaar-koppelen verborgen (bereider blijft mogelijk).
- **PDF** (`pdf.ts`): eigenaar-kant familie-bewust (stalling → counterparty; lease → de
  stal of de particuliere eigenaar).

## Acceptatiecriteria

- [x] Een paard kan expliciet op `STAL` of `PARTICULIER` eigendom worden gezet op de
  Eigenaar/bereider-tab; de keuze wordt server-side opgeslagen.
- [x] Bij `STAL`-eigendom kan een leasecontract worden opgesteld zonder gekoppelde
  eigenaar-User; bij `PARTICULIER` blijft een gekoppelde eigenaar vereist.
- [x] De lease-counterparty is de leaser; bestaande lease-contracten blijven geldig.
- [x] De contract-PDF toont de juiste eigenaar-kant per familie.
- [x] Unit-tests dekken `heeftEigenaar` (STAL/PARTICULIER × wel/geen eigenaar);
  volledige suite groen (25/25), lint schoon.

## Niet in scope (vervolg — zie #140)

- Lease-PDF-inhoud (eigen lease-secties i.p.v. de stalling-secties).
- Een volledig externe leaser zónder account/koppeling.
