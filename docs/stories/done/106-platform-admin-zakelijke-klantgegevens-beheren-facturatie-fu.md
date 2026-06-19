---
issue: 106
title: "Platform-admin: zakelijke klantgegevens beheren (facturatie-fundament) + admin-afbakening staldetails"
status: "Done"
labels: []
url: "https://github.com/MiniMaxi-user/velaro/issues/106"
archivedAt: 2026-06-19
---

# #106 — Platform-admin: zakelijke klantgegevens beheren (facturatie-fundament) + admin-afbakening staldetails

# User Story

**Als** platform-admin
**wil ik** de zakelijke gegevens van mijn klanten (eigenaar-accounts) kunnen inzien en bewerken
**zodat** ik deze gegevens later kan gebruiken voor facturatie, en zodat ik daarbij niet ongewenst in de operationele staldetails van die klanten kan kijken.

# Context

De platform-admin beheert vandaag eigenaar-accounts via **Admin â†’ Eigenaren**
(`src/app/(app)/admin/eigenaren/page.tsx`, met twee tabs: staleigenaren en
paardeneigenaren, in `EigenaarAccountsTabs.tsx`). Een account aanmaken kan al
(`EigenaarNieuwForm.tsx` â†’ `createOwnerAccount` in `src/features/admin/actions.ts`),
en het stallenquotum is al beheerbaar (`QuotumForm` â†’ `updateStableQuota`).

Wat vandaag **ontbreekt**:
- Het `User`-model (`prisma/schema.prisma`) heeft alleen `email`, `name`,
  `isPlatformAdmin`, `maxStables`. Er zijn **geen zakelijke/facturatie-gegevens**
  (adres, KvK, btw, factuuradres) op het eigenaar-account. Die zijn nodig als basis
  voor de latere facturatie (bouwvolgorde stap 6 in `CLAUDE.md`).
- Er is **geen detail-/bewerkscherm** voor een eigenaar-account; de admin kan een
  account nu alleen in een lijst zien en het quotum aanpassen.

Daarnaast signaleert de PO een **ongewenste toegang**: in de tab Paardeneigenaren
linkt elke paardnaam naar `/paarden/{id}` (zie `EigenaarAccountsTabs.tsx` r.254).
Dat is het volledige operationele paardprofiel binnen de stalcontext (taken,
contracten, gezondheid, berichten). De admin hoort die staldetails **niet** te kunnen
inzien â€” alleen klant-/accountgegevens. (Technisch blokkeert `canViewHorse` in
`src/lib/auth/authorization.ts` een admin nu al, maar de link in de admin-UI suggereert
ten onrechte dat het mag; zie open vraag 1.)

Deze story legt het **fundament voor facturatie** (de klantgegevens) en scherpt de
**afbakening van admin-rechten** aan. Het bouwt de facturatie-engine zelf nog niet.

# Scope

## In scope
- **Datamodel**: zakelijke/facturatie-gegevens op het eigenaar-account (`User`),
  allemaal optioneel/nullable zodat bestaande accounts geldig blijven:
  - bedrijfs-/factuurnaam, adres, postcode, plaats, land
  - KvK-nummer, btw-nummer
  - keuze "afwijkend factuuradres" (boolean); pas bij aangevinkt worden de
    afwijkende factuuradresvelden getoond/ingevuld (factuuradres, -postcode, -plaats, -land)
  - Prisma-migratie + `prisma generate`.
- **Detail-/bewerkscherm** voor een eigenaar-account onder `/admin/eigenaren`
  (bv. `/admin/eigenaren/[id]`): de admin kan de bovenstaande gegevens inzien en
  bewerken. Server-action met platform-admin-autorisatie (zoals bestaande
  `requirePlatformAdmin`).
- **Afwijkend factuuradres**: de afwijkende-factuuradresvelden zijn pas zichtbaar/
  bewerkbaar wanneer "afwijkend factuuradres" is aangevinkt; staat dit uit, dan geldt
  het hoofdadres als factuuradres.
- **Admin-afbakening**: vanuit de admin-omgeving kan de platform-admin **niet** de
  operationele staldetails van een paard/stal openen. De misleidende link naar
  `/paarden/{id}` in de Paardeneigenaren-tab wordt aangepast conform open vraag 1.

## Out of scope
- De facturatie-engine zelf (facturen genereren/versturen, regels, btw-berekening) â€”
  dat is bouwvolgorde stap 6, eigen traject.
- Wijzigen van het bestaande quotum-beheer (`QuotumForm`/`updateStableQuota`).
- Het stal-factuuradres op `Stable` (`invoiceAddress` e.d. bestaan al en blijven
  ongemoeid); deze story gaat over gegevens op het **eigenaar-account**.
- Toevoegen/uitbreiden van velden buiten de hierboven genoemde set.
- Aanpassen van de autorisatie van het paardprofiel voor stalleden/paardeigenaren.

# Acceptatiecriteria

- [ ] Het `User`-model heeft optionele velden voor zakelijke/facturatie-gegevens:
  factuur-/bedrijfsnaam, adres, postcode, plaats, land, KvK-nummer, btw-nummer,
  een boolean "afwijkend factuuradres", en de afwijkende-factuuradresvelden
  (factuuradres, -postcode, -plaats, -land). Migratie draait zonder dataverlies;
  bestaande accounts blijven geldig.
- [ ] Vanuit **Admin â†’ Eigenaren** kan de admin een eigenaar-account openen en de
  zakelijke gegevens **inzien en bewerken** via een eigen detail-/bewerkscherm.
- [ ] Alleen een platform-admin heeft toegang tot dit scherm en de bijbehorende
  server-action (niet-admin â†’ geblokkeerd, conform bestaand `requirePlatformAdmin`).
- [ ] De velden van het **afwijkend factuuradres** zijn pas zichtbaar/in te vullen
  nadat de optie "afwijkend factuuradres" is aangevinkt; staat de optie uit, dan
  geldt het hoofdadres als factuuradres.
- [ ] Na opslaan zijn de gewijzigde gegevens gepersisteerd en bij heropenen zichtbaar.
- [ ] De admin kan vanuit de admin-omgeving **niet** de operationele staldetails
  (het paardprofiel `/paarden/{id}` met taken/contracten/gezondheid) van een klant
  openen; de huidige link in de Paardeneigenaren-tab is aangepast conform open vraag 1.
- [ ] Styling volgt het bestaande design system (tokens/`form-*`/`data-grid`/`badge`
  uit `src/styles/globals.css`); UI-teksten in het Nederlands. Geen nieuwe kleuren.

# Technische notities

- Velden op `User` zetten (Ã©Ã©n account = Ã©Ã©n klant), conform de bestaande conventie
  van platte adresvelden op `Stable` (`invoiceAddress`/`invoicePostalCode`/`invoiceCity`).
  Geen apart facturatie-/klantmodel introduceren in deze story (geen over-engineering).
- Schemawijzigingen mogen zonder vooraf overleg (project-memory); `npx prisma migrate`
  + `npx prisma generate` in `C:\Claude\velaro`.
- Hergebruik het bestaande patroon: server-action met `requirePlatformAdmin`,
  `revalidatePath('/admin/eigenaren')`, en `SubmitButton`/`form-*`-componenten.
- Dit scherm betreft het **staleigenaar**-account (de klant die je factureert).
  Of paardeneigenaar-accounts dezelfde velden/scherm krijgen: zie open vraag 2.

# Open vragen

1. **Admin-afbakening â€” gewenste UX.** De link in de Paardeneigenaren-tab gaat nu naar
   `/paarden/{id}` (operationeel paardprofiel). Wat wil de PO daarvoor in de plaats?
   (a) de link verwijderen (alleen de paardnaam als tekst tonen), (b) linken naar een
   admin-only, beperkt paard-/klant-detail zonder operationele staldetails, of
   (c) linken naar het nieuwe eigenaar-detailscherm. Welke optie heeft de voorkeur?
2. **Welke accounts krijgen facturatiegegevens?** Geldt het inzien/bewerken van
   zakelijke gegevens alleen voor **staleigenaar-accounts** (de te factureren klant),
   of ook voor **paardeneigenaar-accounts**? De story gaat er nu vanuit: primair
   staleigenaren. Klopt die aanname?
