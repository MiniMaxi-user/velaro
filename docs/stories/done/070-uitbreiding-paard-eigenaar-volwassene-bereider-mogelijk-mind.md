---
issue: 70
title: "UITBREIDING: Paard eigenaar (volwassene) + bereider (mogelijk minderjarig) beheren"
status: "Done"
labels: []
url: "https://github.com/MiniMaxi-user/velaro/issues/70"
archivedAt: 2026-06-19
---

# #70 — UITBREIDING: Paard eigenaar (volwassene) + bereider (mogelijk minderjarig) beheren

Type: UITBREIDING

# Paard: eigenaar (volwassene) + bereider (mogelijk minderjarig) beheren

## Wat dit oplevert / businessdoel
Een paard heeft in de praktijk een **eigenaar** (volwassene, met account) en daarnaast
Ã©Ã©n of meer **bereiders** â€” de persoon/personen die het paard rijden. Een bereider is
vaak een **minderjarige** en heeft dus gÃ©Ã©n eigen Velaro-account. Vandaag kent het
model alleen `HorseOwner` (account-gebonden eigenaar). We breiden het centrale
paardprofiel uit zodat de stal eigenaar Ã©n bereider(s) kan vastleggen en beheren, en
de paardeigenaar het telefoonnummer van een bereider actueel kan houden.

Sluit aan op de MVP-kern "centraal paardprofiel + eigenaarscommunicatie": volledige,
betrouwbare contactgegevens rond elk paard, zonder elke bereider een account te geven.

## Datamodel (Prisma â€” schemawijziging toegestaan)
Nieuw model, gÃ©Ã©n accountkoppeling (een bereider kan minderjarig zijn en heeft geen login):

```prisma
model HorseRider {
  id          String    @id @default(uuid()) @db.Uuid
  horseId     String    @db.Uuid
  name        String
  dateOfBirth DateTime? // optioneel; bepaalt of "Minderjarig" getoond wordt
  phone       String?
  email       String?
  notes       String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  horse Horse @relation(fields: [horseId], references: [id], onDelete: Cascade)

  @@index([horseId])
}
```

Voeg aan `Horse` toe: `riders HorseRider[]`.
Draai migratie + `npx prisma generate` (Prisma CLI leest `.env`).

> "Minderjarig" wordt **afgeleid** uit `dateOfBirth` (< 18 jaar op vandaag), niet
> apart opgeslagen. Geen geboortedatum â†’ geen badge.

## Autorisatie (server-side afdwingen)
Voeg in `src/lib/auth/authorization.ts` een helper `isHorseOwner(userId, horseId)` toe
(bestaat er een `HorseOwner`-rij voor dit paard?).

- **Bereider volledig beheren** (toevoegen, alle velden wijzigen, verwijderen):
  alleen staf/eigenaar van de stal â†’ `getStableRole(user.id, horse.stableId) !== null`.
- **Telefoonnummer bereider wijzigen**: Ã³Ã³k de paardeigenaar (`isHorseOwner`), maar
  **uitsluitend het veld `phone`**. De action die de eigenaar gebruikt mag geen enkel
  ander veld muteren.

## Server actions (`src/features/paarden/actions.ts`)
Spiegel het patroon van `addHorseOwner`/`removeHorseOwner` (rolcontrole vooraf,
`revalidatePath('/paarden/${horseId}')`, `{ error }`-returns):
- `addHorseRider(horseId, formData)` â€” staf only; valideert `name` verplicht.
- `updateHorseRider(horseId, riderId, formData)` â€” staf only; werkt alle velden bij.
- `updateRiderPhone(horseId, riderId, formData)` â€” staf **of** paardeigenaar; schrijft
  **alleen** `phone`. Controleer eigenaarschap met `isHorseOwner`.
- `removeHorseRider(horseId, riderId)` â€” staf only.

## Queries (`src/features/paarden/queries.ts`)
- `getHorse`: include `riders: { orderBy: { createdAt: 'asc' } }` (naast bestaande `owners`).

## UI â€” staf/eigenaar (detailscherm, tab)
- Hernoem de tab-label in `src/features/paarden/PaardDetailTabs.tsx` van "Eigenaren"
  naar **"Eigenaar & bereider"** (tab-id `eigenaren` ongewijzigd laten i.v.m. deeplinks).
- Nieuw component `src/features/paarden/BereiderBeheer.tsx` (client), gestyled als
  `EigenaarBeheer` (`gezondheid-sectie`, `gezondheid-tabel`):
  - Sectietitel "Bereiders".
  - Tabel: naam (+ badge **Minderjarig** wanneer afgeleid), telefoon, e-mail, leeftijd/notitie;
    per rij Bewerken + Verwijderen.
  - Toevoegen via route `/paarden/[id]/bereiders/nieuw` (formulier: naam, geboortedatum,
    telefoon, e-mail, notitie). Bewerken via `/paarden/[id]/bereiders/[riderId]/bewerken`.
- In `src/app/(app)/paarden/[id]/page.tsx` rendert de `eigenaren`-tab nu twee secties:
  bestaande `EigenaarBeheer` (Eigenaren) **plus** `BereiderBeheer` (Bereiders).

## UI â€” paardeigenaar (zijn eigen paardpagina)
In de `canEdit === false`-tak van `src/app/(app)/paarden/[id]/page.tsx`:
- Nieuw component `src/features/paarden/BereiderInfo.tsx` (client) dat eigenaar(s) en
  bereider(s) **read-only** toont (naam, "Minderjarig"-badge, e-mail), met per bereider
  Ã©Ã©n **inline bewerkbaar telefoonnummer** (klein formuliertje â†’ `updateRiderPhone`).
- Geen toevoeg-/verwijder-acties en geen andere bewerkbare velden in deze weergave.

## Nieuwe route-bestanden
- `src/app/(app)/paarden/[id]/bereiders/nieuw/page.tsx`
- `src/app/(app)/paarden/[id]/bereiders/[riderId]/bewerken/page.tsx`
(Spiegel de bestaande `paarden/[id]/eigenaren/...`-routes qua opbouw en autorisatie.)

## Acceptatiecriteria
1. Migratie draait schoon; `npx prisma generate` en `npx tsc --noEmit` slagen.
2. Staf/eigenaar kan in de tab "Eigenaar & bereider" **meerdere** bereiders toevoegen,
   alle velden bewerken en verwijderen.
3. Bij `dateOfBirth` < 18 jaar verschijnt een **Minderjarig**-badge; zonder geboortedatum niet.
4. Bestaande eigenaren-functionaliteit blijft ongewijzigd werken (geen regressie).
5. De paardeigenaar ziet op zijn paardpagina eigenaar(s) + bereider(s) en kan **uitsluitend**
   het telefoonnummer van een bereider wijzigen; al het andere is read-only.
6. Server-side afgedwongen: een niet-staf gebruiker kan via `updateRiderPhone` allÃ©Ã©n
   `phone` muteren; `addHorseRider`/`updateHorseRider`/`removeHorseRider` weigeren voor niet-staf.

## Buiten scope
Bereider-login/eigen account, koppeling bereider aan taken/agenda/lease, notificaties,
en weergave van bereiders op het `/eigenaar`-dashboardoverzicht (alleen de paardpagina).
