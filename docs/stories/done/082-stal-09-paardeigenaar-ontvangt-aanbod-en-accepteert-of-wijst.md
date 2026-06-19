---
issue: 82
title: "[STAL-09] Paardeigenaar ontvangt aanbod en accepteert of wijst af"
status: "Done"
labels: ["contract", "stalling"]
url: "https://github.com/MiniMaxi-user/velaro/issues/82"
archivedAt: 2026-06-19
---

# #82 — [STAL-09] Paardeigenaar ontvangt aanbod en accepteert of wijst af

# User Story

Als **paardeigenaar** wil ik een door de stal aangeboden stallingscontract kunnen inzien en vervolgens accepteren of afwijzen, zodat de overeenkomst actief wordt of definitief vervalt.

# Context

Onderdeel van de contracten-module (stalling), epic **#91 â€” Aanbieden & accepteren**. Dit is de tweede helft van de aanbodâ†’besluit-lus: STAL-08 (#81) levert het aanbieden door de stal plus de statusmachine; deze story (STAL-09) levert het besluit van de eigenaar. Hiermee is journey S1 (stal biedt aan) + S2 (eigenaar beslist) end-to-end testbaar.

De eigenaar werkt in de bestaande paardeigenaar-weergave. Het datamodel (`Contract`, `ContractStatus`, `Message`) bestaat al; de leesbare weergave van de contractinhoud bestaat al (`ContractenPanel`). De melding naar de stal verloopt via het bestaande `Message`-mechanisme dat de meldingen-bel in de topbar voedt.

**Harde afhankelijkheid:** deze story kan pas gebouwd worden nadat **STAL-08 (#81)** is opgeleverd. STAL-08 introduceert de statusovergang CONCEPT â†’ AANGEBODEN, de statusmachine-helper en de melding aan de eigenaar. STAL-09 hangt aan de status AANGEBODEN en hergebruikt diezelfde statusmachine-helper voor de overgangen naar ACTIEF / AFGEWEZEN. Bouw deze story dus niet vÃ³Ã³r #81 done is.

# Scope

**Binnen scope**
- In de paardeigenaar-weergave een sectie "Contract" die een contract met status AANGEBODEN toont met de leesbare inhoud (hergebruik van de bestaande contract-weergavecomponent, alleen-lezen).
- Twee acties voor de eigenaar: contract accepteren en contract afwijzen.
- Server actions (bijv. `acceptContract` / `rejectContract` in `src/features/contracten/actions.ts`) met server-side autorisatie: uitsluitend de aan het contract gekoppelde eigenaar (`Contract.counterpartyUserId`) mag dit; staf/eigenaar van de stal mag het niet via deze acties.
- Statusovergangen via de statusmachine-helper uit STAL-08:
  - Accepteren: AANGEBODEN â†’ GEACCEPTEERD â†’ ACTIEF (v1 in Ã©Ã©n stap direct ACTIEF).
  - Afwijzen: AANGEBODEN â†’ AFGEWEZEN (geen tegenvoorstel).
- Bij elk besluit een melding naar de stal via een `Message` (zelfde patroon als `createMessage`), gekoppeld aan het paard/de stal, zodat de stal het via de meldingen-bel ziet.

**Buiten scope**
- Aanbieden door de stal en de statusmachine zelf (STAL-08 / #81).
- Minderjarige eigenaar + mede-akkoord gemachtigde (STAL-10 / #83).
- Contract-PDF en preview (STAL-12 / #85).
- Tegenvoorstel / onderhandeling door de eigenaar.
- Versionering (STAL-11 / #84).

# Acceptatiecriteria

- [ ] Als de eigenaar de paardeigenaar-weergave opent en er is een contract met status AANGEBODEN, dan ziet hij/zij een sectie "Contract" met de leesbare contractinhoud (alleen-lezen) en de acties "Accepteren" en "Afwijzen".
- [ ] Als er geen contract met status AANGEBODEN voor het paard is, dan worden de accepteer-/afwijs-acties niet getoond.
- [ ] Als de eigenaar een AANGEBODEN contract accepteert, dan krijgt het contract status ACTIEF en ontvangt de stal hierover een melding.
- [ ] Als de eigenaar een AANGEBODEN contract afwijst, dan krijgt het contract status AFGEWEZEN en ontvangt de stal hierover een melding.
- [ ] Een gebruiker die niet de gekoppelde eigenaar (`counterpartyUserId`) van het contract is, kan het contract niet accepteren of afwijzen; de server-action weigert dit (autorisatie wordt server-side afgedwongen, niet alleen in de UI).
- [ ] Accepteren of afwijzen is alleen mogelijk vanuit de status AANGEBODEN; vanuit elke andere status wordt de actie server-side geweigerd (afgedwongen via de statusmachine-helper).
- [ ] Na een besluit wordt de paardeigenaar-weergave bijgewerkt (revalidatie) zodat de actie niet opnieuw uitvoerbaar is.

# Technische notities

- Datamodel bestaat al: `Contract` (`status`, `counterpartyUserId`, `horseId`, `stableId`), enum `ContractStatus` met AANGEBODEN/GEACCEPTEERD/ACTIEF/AFGEWEZEN, en `Message` (`prisma/schema.prisma`). Geen schemawijziging verwacht.
- Server actions toevoegen in `src/features/contracten/actions.ts`, in lijn met het bestaande autorisatiepatroon (vergelijk `getAuthorizedStaff` / `getEditableConceptContract`); hier echter spiegelbeeldig: autoriseer op `counterpartyUserId == auth-user`.
- Hergebruik de statusmachine-helper die in STAL-08 (#81) wordt opgeleverd voor de overgangsvalidatie; dupliceer de toegestane overgangen niet.
- Leesbare weergave: hergebruik `src/features/contracten/ContractenPanel.tsx` (of de onderdelen daarvan) in alleen-lezen modus binnen de eigenaar-weergave.
- Eigenaar-ingang: `src/app/(app)/eigenaar/page.tsx` toont al per paard een paneel; voeg daar (of op de read-only paardpagina) de contract-sectie toe.
- Melding naar de stal via `prisma.message.create` met `stableId`/`horseId` gezet, conform het patroon in `src/features/berichten/actions.ts` (`createMessage`).

# Open vragen

Geen.
