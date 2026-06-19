---
issue: 76
title: "[STAL-03] Huisvesting & dienstpakket-opties op het contract"
status: "Done"
labels: ["contract", "stalling", "tested"]
url: "https://github.com/MiniMaxi-user/velaro/issues/76"
archivedAt: 2026-06-19
---

# #76 — [STAL-03] Huisvesting & dienstpakket-opties op het contract

**Epic:** Contractinhoud: opties & voorwaarden
**Hangt af van:** STAL-01 (gedeeld datamodel)

## User story
Als **staleigenaar** wil ik de huisvesting en het dienstpakket (boxtype, uitmesten/opstrooien, toezicht) op het stallingscontract vastleggen, zodat duidelijk is wat de stal levert.

## Context & scope
Eerste optieblok uit Â§3.3 (stalling). Opties worden als data op het contract opgeslagen en later in de PDF gerenderd (STAL-12).
**Buiten scope:** voer/weidegang/faciliteiten (STAL-04), prijs (STAL-05).

## Functionele inhoud
- Uitbreiden contract-config (velden of JSON-blok `huisvesting`): boxtype (binnen/buiten/paddock/groep), stalplek/boxnummer (voorvullen uit `Horse.boxNumber`), uitmesten ja/nee, opstrooien + beddingtype, toezicht/verzorging.
- Sectie "Huisvesting & verzorging" in het contract-bewerkscherm.
- Server action breidt update uit; autorisatie OWNER/STAFF, alleen bij CONCEPT.

## Acceptatiecriteria
- [ ] Given een CONCEPT-contract, When OWNER/STAFF de huisvesting-opties invult en opslaat, Then worden ze op het contract bewaard en getoond.
- [ ] Boxnummer wordt voorgevuld uit het paardprofiel maar is overschrijfbaar.

## Oplevert (testbaar)
Het dienstpakket (huisvesting) is vastlegbaar en zichtbaar op het contract.

## Open vragen
Geen.
