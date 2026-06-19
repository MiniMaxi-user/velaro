---
issue: 86
title: "[STAL-13] Contract-dashboard per partij"
status: "Done"
labels: ["contract", "stalling"]
url: "https://github.com/MiniMaxi-user/velaro/issues/86"
archivedAt: 2026-06-19
---

# #86 — [STAL-13] Contract-dashboard per partij

**Epic:** [EPIC] Beheer & dashboard (#93)
**Hangt af van:** STAL-09 / #82 (accepteren-afwijzen, actieve contracten bestaan) â€” **klaar (Done)**

# User Story

Als **staleigenaar/stalmedewerker (OWNER/STAFF)** wil ik Ã©Ã©n overzicht van alle stallingscontracten van mijn stal met status, ingangs-/einddatum en de eerstvolgende openstaande actie, zodat ik in Ã©Ã©n oogopslag grip houd op lopende afspraken.

Als **paardeigenaar** wil ik een overzicht van de contract(en) van mijn eigen paard(en) met dezelfde kerninfo, zodat ik weet wat de status is en of er iets van mij verwacht wordt.

# Context

Journey D/S3 (overzicht). De volledige contract-levenscyclus bestaat nu: concept â†’ aanbieden â†’ accepteren/afwijzen â†’ versionering (STAL-01 t/m STAL-12, allemaal Done/In review). Daardoor staan er contracten in uiteenlopende statussen verspreid over paarden. Vandaag is een contract alleen zichtbaar op het profiel van Ã©Ã©n specifiek paard (`ContractenPanel`) en ziet de eigenaar op `/eigenaar` uitsluitend een *aangeboden* contract â€” er is nog geen overkoepelend overzicht per partij.

Deze story levert dat overzicht plus lichte signalering van openstaande acties. Het is een lees-/overzichtsstory: een fundament voor de beheeracties die in STAL-14 en STAL-15 volgen.

Bestaande bouwstenen om te hergebruiken (niet opnieuw bouwen):
- Statuslabels en -badges: `CONTRACT_STATUS_LABELS` / `CONTRACT_STATUS_BADGE` in `src/features/contracten/contractHelpers.ts`.
- Contract-query per paard: `getContractsForHorse` in `src/features/contracten/queries.ts`.
- Versiegroepering (huidige versie per groep): `groepeerVersies` / `leesVersieGroepId` (STAL-11).
- Looptijd/einddatum en overige config zitten in `Contract.config` (STAL-05); `Contract.startDate` is de ingangsdatum.
- Stal-dashboard: `src/app/(app)/stal/page.tsx`. Eigenaar-weergave: `src/app/(app)/eigenaar/page.tsx`.

# Scope

**Binnen scope**
- **Stal-overzicht (OWNER/STAFF):** een contracten-overzicht over alle paarden van de actieve stal, met per (huidige versie van een) contract: paard, wederpartij (paardeigenaar), type, status, ingangsdatum, einddatum (indien af te leiden uit `config`-looptijd) en de eerstvolgende openstaande actie.
- **Eigenaar-overzicht:** een contract-sectie in de paardeigenaar-weergave (`/eigenaar`) die per eigen paard de contract(en) met dezelfde kerninfo toont. De eigenaar ziet uitsluitend contracten waarvan hij de wederpartij is.
- **Signalering openstaande acties** via badges, met hergebruik van de bestaande `badge`-stijlen en statuslabels. "Openstaande actie" is in deze story beperkt tot situaties die nu al bestaan, bijvoorbeeld: status `AANGEBODEN` (stal: wacht op eigenaar / eigenaar: te beoordelen) en status `CONCEPT` (stal: nog niet aangeboden). Bij een af te leiden einddatum die binnenkort verloopt mag een neutrale "verloopt binnenkort"-indicatie worden getoond.
- Per contractgroep wordt alleen de **huidige versie** in het overzicht getoond (vervangen versies niet, conform STAL-11).
- Autorisatie: OWNER/STAFF zien alleen contracten van hun actieve stal; de eigenaar ziet alleen contracten van zijn eigen paard(en). Hergebruik de bestaande autorisatie-helpers; geen nieuwe rechtenmodellen.

**Buiten scope**
- De beheeracties zelf: verlengen (STAL-14) en opzeggen/opschorten/prijsverlaging/retentierecht (STAL-15). Hier wordt alleen gesignaleerd, niet gehandeld.
- Wijzigen van contractstatus of -inhoud vanuit het overzicht.
- Nieuwe statusovergangen, schemawijzigingen of nieuwe meldingsmechanismen.
- Lease-contracten (`family = LEASE`); deze story betreft de stalling-familie.
- "Alle stallen"-aggregatie als aparte eis â€” volg het bestaande patroon van de actieve-stal-context; als het zonder meerwerk meekomt is dat meegenomen, maar het is geen acceptatiecriterium.

# Acceptatiecriteria

- [ ] Als er stallingscontracten in diverse statussen bestaan, wanneer een OWNER/STAFF het stal-contractoverzicht opent, dan ziet hij alle contracten van zijn actieve stal met per regel: paard, wederpartij, status, ingangsdatum en (indien afleidbaar) einddatum.
- [ ] Als een contract status `AANGEBODEN` of `CONCEPT` heeft, wanneer het overzicht wordt getoond, dan toont een badge de eerstvolgende openstaande actie voor de betreffende rol.
- [ ] Als een paardeigenaar zijn weergave opent, wanneer hij contracten heeft, dan ziet hij uitsluitend de contract(en) van zijn eigen paard(en) met status, ingangsdatum en (indien afleidbaar) einddatum.
- [ ] Als een paardeigenaar contracten van een ander paard/eigenaar zou kunnen opvragen, wanneer hij het overzicht opent, dan worden die niet getoond (server-side afgedwongen, niet alleen UI).
- [ ] Als van een contract meerdere versies bestaan, wanneer het overzicht wordt getoond, dan verschijnt alleen de huidige versie als overzichtsregel.
- [ ] Als er geen contracten zijn, wanneer het overzicht wordt geopend, dan toont een nette lege staat (geen lege tabel/fout).
- [ ] Statuslabels en badges hergebruiken de bestaande `CONTRACT_STATUS_LABELS` / `CONTRACT_STATUS_BADGE`; er worden geen nieuwe kleuren of labels geÃ¯ntroduceerd.

# Technische notities

- Geen schemawijziging nodig: alle benodigde gegevens zitten in `Contract` (status, startDate, currentVersion, config met looptijd) en in de relaties (horse, counterparty).
- Voor het stal-overzicht is een stal-brede query nodig (`Contract` filteren op `stableId` van de actieve stal); voor de eigenaar een query op `counterpartyUserId = user.id`. Plaats deze bij de bestaande queries in `src/features/contracten/queries.ts`.
- Einddatum: leid af uit `startDate` + looptijd uit `config` (STAL-05) waar mogelijk; toon "â€”" wanneer niet afleidbaar. Geen nieuwe looptijd-logica bedenken â€” gebruik wat STAL-05 heeft vastgelegd.
- Plaatsing van het stal-overzicht (eigen route onder `stal/` versus paneel op het dashboard) is een implementatiekeuze voor de builder; houd het consistent met de bestaande sidebar/dashboard-patronen.
- Geen implementatieontwerp vastleggen dat verder gaat dan bovenstaande kaders.

# Open vragen

Geen blokkerende vragen. De afbakening van "eerstvolgende actie" is bewust beperkt tot bestaande statussen (AANGEBODEN/CONCEPT + optionele "verloopt binnenkort"); rijkere acties komen met STAL-14/15.
