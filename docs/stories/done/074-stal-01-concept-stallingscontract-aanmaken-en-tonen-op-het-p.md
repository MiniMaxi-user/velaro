---
issue: 74
title: "[STAL-01] Concept-stallingscontract aanmaken en tonen op het paardprofiel"
status: "Done"
labels: ["contract", "stalling"]
url: "https://github.com/MiniMaxi-user/velaro/issues/74"
archivedAt: 2026-06-19
---

# #74 — [STAL-01] Concept-stallingscontract aanmaken en tonen op het paardprofiel

**Epic:** #89 Contract-fundament & concept-contract
**Hangt af van:** â€” (fundament; blokkeert alle overige STAL-stories)

## User story
Als **staleigenaar (OWNER)** of **stalmedewerker (STAFF)** wil ik op een paardprofiel een nieuw stallingscontract (full pension) als concept kunnen aanmaken, zodat ik de overeenkomst met de paardeigenaar in Velaro kan opbouwen voordat ik die aanbied.

## Context & scope
Eerste verticale slice + datamodel-fundament voor de hele contracten-module. Levert een werkend concept-contract op dat zichtbaar is op het paardprofiel. Alleen de stalling-familie, type full pension, met minimale velden (wederpartij + ingangsdatum). Opties, prijs, looptijd en verzekering volgen in latere stories.

**Buiten scope:**
- Bewerken/verwijderen van het concept (STAL-02, #75).
- Opties invullen, prijs/looptijd, verzekering, aanbieden, PDF, lease-familie (latere STAL-stories).
- Statusovergangen voorbij CONCEPT (alleen CONCEPT wordt in deze story aangemaakt).

## Gedeeld datamodel (fundament â€” door alle STAL-stories gebruikt)
Nieuwe Prisma-modellen in `prisma/schema.prisma`:
- `Contract`:
  - `id`
  - `horseId` â†’ `Horse`
  - `stableId` â†’ `Stable`
  - `family` (enum `ContractFamily { STALLING, LEASE }`)
  - `type` (string; v1 = `"FULL_PENSION"`)
  - `counterpartyUserId` â†’ `User`, nullable (de paardeigenaar als wederpartij; nullable tot gekozen)
  - `status` (enum `ContractStatus`)
  - `currentVersion` Int default 1
  - ingangsdatum (`startDate` DateTime, nullable)
  - ruimte voor config-velden/JSON die latere stories uitbreiden
  - `createdAt` / `updatedAt`
- `ContractStatus` enum: `CONCEPT, AANGEBODEN, GEACCEPTEERD, ACTIEF, OPGESCHORT, OPZEGGING_LOOPT, VERLENGD, BEEINDIGD, VERLOPEN, GEANNULEERD, AFGEWEZEN, VERVANGEN`.
- `ContractFamily` enum: `STALLING, LEASE`.
- Relatie op `Horse`: `contracts Contract[]`.
- Migratie draaien + `npx prisma generate`.

> Dit datamodel is het fundament voor #75 (STAL-02) en alle latere STAL-stories. De wederpartij verwijst naar een `User` die via `HorseOwner` aan het paard gekoppeld is.

## Functionele inhoud
- Nieuwe feature-map `src/features/contracten/` (`queries.ts`, `actions.ts`, componenten) â€” spiegel de bestaande feature-opbouw (zoals `src/features/paarden/`, `src/features/gezondheid/`).
- **Contracten-tab op het paardprofiel:** voeg een tab "Contracten" toe aan `PaardDetailTabs` (`src/features/paarden/PaardDetailTabs.tsx`) in `src/app/(app)/paarden/[id]/page.tsx`. Alleen zichtbaar voor OWNER/STAFF (het `canEdit`-pad). Bevat een knop "Nieuw stallingscontract" en een lijst van bestaande contracten met status-badge.
- **Aanmaak-route** `src/app/(app)/paarden/[id]/contracten/nieuw/page.tsx`:
  - Toont een formulier met: wederpartij (paardeigenaar) en ingangsdatum.
  - De wederpartij-keuze wordt gevuld uit `horse.owners` (`HorseOwner` â†’ `User`).
  - Bij submit wordt een `Contract` aangemaakt met `family=STALLING`, `type=FULL_PENSION`, `status=CONCEPT`, gekoppeld aan paard + gekozen eigenaar.
- **Server action** `createStallingContract` in `src/features/contracten/actions.ts` met autorisatie: alleen OWNER/STAFF van de stal van het paard (hergebruik `getStableRole` uit `src/lib/auth/authorization.ts`). Server-side afgedwongen.
- Na aanmaken verschijnt het contract in de Contracten-tab met badge "Concept".

## User journey
1. OWNER/STAFF opent een paardprofiel â†’ tab "Contracten".
2. Klikt "Nieuw stallingscontract" â†’ komt op `/paarden/[id]/contracten/nieuw`.
3. Kiest de wederpartij (gekoppelde eigenaar) + ingangsdatum, bevestigt.
4. Wordt teruggeleid naar de Contracten-tab; het nieuwe concept staat in de lijst met badge "Concept".

## Acceptatiecriteria
- [ ] Migratie draait schoon; `npx prisma generate` en `npx tsc --noEmit` slagen.
- [ ] Given een OWNER/STAFF op een paardprofiel, When hij "Nieuw stallingscontract" kiest en een gekoppelde eigenaar + ingangsdatum invult en bevestigt, Then bestaat er een `Contract` met `family=STALLING`, `type=FULL_PENSION`, `status=CONCEPT`, `currentVersion=1`, gekoppeld aan paard + gekozen eigenaar (`counterpartyUserId`).
- [ ] Given het zojuist aangemaakte concept, When de OWNER/STAFF de Contracten-tab opent, Then verschijnt het contract in de lijst met badge "Concept".
- [ ] Given een paardeneigenaar (niet OWNER/STAFF), When hij het paardprofiel opent, Then ziet hij de Contracten-tab/knop "Nieuw stallingscontract" niet.
- [ ] Given een paardeneigenaar die de aanmaak-action of -route rechtstreeks aanroept, When de server de autorisatie controleert, Then wordt de actie geweigerd (server-side afgedwongen, geen contract aangemaakt).
- [ ] Meerdere concepten toestaan, max. Ã©Ã©n ACTIEF
- [ ] Gewenst gedrag wanneer er gÃ©Ã©n eigenaar gekoppeld is: popup tonen wanneer contract toevoegen geklikt wordt met de melding: "Koppel eerst een eigenaar". Proces stopt.
- [ ] Bij het kiezen van de eigenaar in het contract is het mogelijk om uit de lijst met eigenaren te kiezen welke op het paard zijn vastgelegd.

## Oplevert (testbaar)
Een staleigenaar/stalmedewerker kan een full-pension concept-contract aanmaken en ziet het op het paardprofiel. Einde-tot-einde testbaar zonder verdere stories.
