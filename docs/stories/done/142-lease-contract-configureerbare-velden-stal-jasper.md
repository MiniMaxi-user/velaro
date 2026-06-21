---
issue: 142
title: "Lease-contract: configureerbare velden uit het Stal Jasper-leasecontract"
status: "Done"
labels: []
url: "https://github.com/MiniMaxi-user/velaro/issues/142"
archivedAt: 2026-06-21
---

# #142 — Lease-contract: configureerbare velden uit het Stal Jasper-leasecontract

## Waarom

Op basis van een echt manege-leasecontract (Stal Jasper) zijn enkele afspraken die per
stal/contract verschillen nog niet vast te leggen op het leasecontract. Nu de
eigenaar-kant is opgelost (#139) konden deze configureerbare velden erbij. Dit betreft
bewust alleen de **per-contract instelbare** velden; algemene voorwaarden/stalreglement
als gegenereerde tekst is een aparte (grotere) story, en betaalwijze valt onder
facturatie.

## Wat is gebouwd

Toegevoegd aan de lease-contractinhoud (`config.lease`, `leaseContract.ts`) en de
bestaande lease-stepper (`LeaseContractStepperForm.tsx`), met parsing in
`leesLeaseContractForm` (`actions.ts`):

- **Max. gewicht ruiter (kg)** — `maxGewichtRuiterKg`, in de stap *Gebruiksrecht &
  disciplines* (Stal Jasper: 70 kg). Het half-jaarlijkse weegmoment zelf is
  reglement-tekst, geen veld.
- **Beperkingen / aandachtspunten paard** — `beperkingen`, eigen tekstveld in dezelfde
  stap (bv. "niet springen, wel balkjes, barebackpad").
- **Opzegtermijn-eenheid** — `looptijd.opzegtermijnEenheid` (`DAGEN` | `KALENDERMAANDEN`,
  default `DAGEN`) + `OPZEGTERMIJN_EENHEID_LABELS`, naast de bestaande opzegtermijn-waarde,
  zodat "per kalendermaand" kan.
- **Doorbetaling bij blessure (dagen)** — `doorbetalingBijBlessureDagen`, subblok
  *Blessure* in de stap *Looptijd / proefperiode / opzegging* (Stal Jasper: 14 dagen).

Alle velden worden defensief gelezen (`leesLeaseContractConfig`), niet-negatief geparsed
en lopen terug de stepper in (round-trip geverifieerd).

## Acceptatiecriteria

- [x] De vier velden zijn in te vullen in de lease-stepper en worden op `config.lease`
  opgeslagen.
- [x] Lege waarden zijn toegestaan; getallen zijn niet-negatief.
- [x] De opzegtermijn kent een eenheid (dagen/kalendermaanden); bestaande concepten
  blijven werken (default DAGEN, opslagsleutel `opzegtermijnDagen` behouden).
- [x] Volledige testsuite groen (25/25), lint schoon.

## Niet in scope

- Weergave van deze velden in de contract-PDF / web-samenvatting → valt onder #140
  (lease-PDF-inhoud).
- Algemene voorwaarden / stalreglement als gegenereerde tekst (aparte story).
- Manege-/ruiterbond-clausules en verplichte-les-administratie; betaalwijze/incasso
  (facturatie).
