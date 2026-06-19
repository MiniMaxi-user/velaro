---
issue: 96
title: "Redesign Bereider & Eigenaar: account-gekoppelde rollen met badges"
status: "Done"
labels: ["tested"]
url: "https://github.com/MiniMaxi-user/velaro/issues/96"
archivedAt: 2026-06-19
---

# #96 — Redesign Bereider & Eigenaar: account-gekoppelde rollen met badges

# User Story

Als **staleigenaar / stalmedewerker (OWNER/STAFF)**
wil ik **eigenaren en bereiders van een paard beheren als account-gekoppelde personen, waarbij ik per persoon met aan/uit-klikbare badges aangeef of die eigenaar en/of bereider is, en alles in een gecombineerd overzicht zie**
zodat **zowel eigenaren als bereiders kunnen inloggen, een persoon beide rollen kan vervullen, en ik niet meer tussen twee losse lijsten en twee verschillende soorten records hoef te schakelen**.

# Context

Dit is de **voorloper op #73**. De ontwerpvraag die #73 blokkeerde is door product (Martijn) beantwoord; daardoor verschuift de oplossing van "alleen UI-lijsten samenvoegen" naar een echte herontwerp-story die het datamodel en de autorisatie raakt.

**Genomen ontwerpbeslissingen (uitgangspunt, niet meer ter discussie):**
- Zowel eigenaar als bereider moeten kunnen **inloggen** -> beide rollen zijn voortaan **account-gekoppeld** (gekoppeld aan een Velaro-`User`).
- Een account kan **tegelijk eigenaar en bereider** van hetzelfde paard zijn.
- Rollen worden toegekend via **aan/uit-klikbare vinkjes/badges** (eigenaar / bereider).
- Een paard mag **meerdere eigenaren en meerdere bereiders** hebben.
- Het tabje **"Eigenaar & bereider"** wordt **een gecombineerde lijst** met de benodigde informatie per persoon.
- Bereider en Eigenaar krijgen dezelfde rechten. Dus ook hetzelfde overzicht als ze inloggen. 

**Huidige situatie in de codebase (waarom dit niet triviaal is):**
- `HorseOwner` (prisma) is **account-gekoppeld** (`userId` -> `User`) en stuurt **autorisatie** aan: een paardeigenaar mag zijn/haar eigen paard inzien (`isHorseOwner`, `canViewHorse` in `src/lib/auth/authorization.ts`).
- `HorseRider` (prisma) is **accountloos** -- vrije velden naam/geboortedatum/telefoon/e-mail/notities, met een afgeleide "Minderjarig"-aanduiding. Een bereider kan dus vandaag niet inloggen.
- UI: twee losse panels in de tab "Eigenaar & bereider":
  - `src/features/paarden/EigenaarBeheer.tsx` (gevoed door `horse.owners`)
  - `src/features/paarden/BereiderBeheer.tsx` (gevoed door `horse.riders`)
  - samengevoegd getoond in `src/app/(app)/paarden/[id]/page.tsx` (regio rond regel 220-238).
- Server actions in `src/features/paarden/actions.ts`: `addHorseOwner`, `removeHorseOwner`, `createAndLinkEigenaar`, `addHorseRider`, `updateHorseRider`, `updateRiderPhone`, `removeHorseRider`.
- De paardeigenaar-weergave (`canEdit === false`) gebruikt `src/features/paarden/BereiderInfo.tsx` (tab "Eigenaar & bereider" voor de eigenaar-rol).

De kern van deze story: bereider-toegang account-koppelen (zodat een bereider kan inloggen) en eigenaar+bereider als **rollen op een persoon-koppeling** modelleren, beheerd via aan/uit-badges, getoond in een lijst.

# Scope

**Binnen scope:**
- **Datamodel**: eigenaar- en bereider-toegang modelleren als account-gekoppelde rollen op een koppeling tussen `Horse` en `User` (zie Datamodel-impact). De accountloze `HorseRider` vervalt als toegangsdrager.
- **Autorisatie**: zowel eigenaar als bereider krijgt leestoegang tot het gekoppelde paardprofiel (vergelijkbaar met de huidige eigenaar-weergave). `canViewHorse` en `isHorseOwner`/equivalent uitbreiden zodat ook een bereider toegang heeft.
- **UI -- beheer (OWNER/STAFF)**: een gecombineerd overzicht in de tab "Eigenaar & bereider" dat per persoon naam/e-mail toont met twee aan/uit-klikbare rol-badges (eigenaar / bereider). Een persoon koppelen via e-mailadres/account; rollen aan/uit zetten; persoon ontkoppelen.
- **UI -- paardeigenaar/bereider-weergave**: `BereiderInfo` consistent maken met het nieuwe model (personen met rollen i.p.v. twee gescheiden blokken).
- **Account aanmaken**: een persoon zonder account kan (zoals nu voor eigenaren via `createAndLinkEigenaar`) een account krijgen en daarna een of beide rollen.
- **Migratie**: bestaande `HorseOwner`-rijen behouden hun eigenaar-rol. Voor bestaande `HorseRider`-rijen: zie open vraag 1 (datamigratie-strategie).
- Styling volgt het bestaande design system (panels/tabellen/`badge`-klassen, geen nieuwe tokens).

**Buiten scope:**
- Wijzigingen aan stalrollen (`StableMember`/`StableRole`) of platform-admin.
- Nieuwe schrijfrechten voor bereiders bovenop de bestaande eigenaar-leesrechten (een bereider krijgt dezelfde beperkte toegang als de huidige paardeigenaar, tenzij open vraag 3 anders beslist).
- De accountloze "Minderjarig"-bereider blijven ondersteunen -- vervalt bewust omdat een bereider voortaan moet kunnen inloggen (zie open vraag 2).
- Lease-module / contracten-koppeling (`Contract.counterpartyUserId`) herontwerpen.
- Datamigratie is niet nodig. 

# Acceptatiecriteria

- [ ] **Given** een paard met minstens een eigenaar en een bereider **When** een OWNER/STAFF de tab "Eigenaar & bereider" opent **Then** ziet die **een gecombineerd overzicht** met een regel per persoon, waarin per persoon zichtbaar is of die **eigenaar**, **bereider**, of **beide** is.
- [ ] **Given** het gecombineerde overzicht **When** een OWNER/STAFF een persoon koppelt via e-mailadres/account **Then** verschijnt die persoon in het overzicht en kan er per rol (eigenaar/bereider) een **aan/uit-badge** worden aangezet.
- [ ] **Given** een gekoppelde persoon **When** de OWNER/STAFF een rol-badge aan- of uitklikt **Then** wordt die rol toegevoegd of verwijderd, en blijft de persoon gekoppeld zolang die nog minstens een rol heeft; bij het uitzetten van de **laatste** rol wordt de persoon ontkoppeld (of conform open vraag 4).
- [ ] **Given** een persoon die zowel eigenaar als bereider is **Then** wordt die als **een regel met twee actieve rol-badges** getoond (niet als twee regels).
- [ ] **Given** een account dat als **bereider** aan een paard gekoppeld is **When** die persoon inlogt en het paardprofiel opent **Then** krijgt die **leestoegang** tot dat paardprofiel (vergelijkbaar met de paardeigenaar-weergave).
- [ ] **Given** een paard zonder gekoppelde personen **Then** toont het overzicht een nette lege staat.
- [ ] **Given** bestaande data voor de migratie **Then** behouden bestaande eigenaren hun eigenaar-rol en gaat geen eigenaar-koppeling verloren (bereider-datamigratie conform open vraag 1).
- [ ] De autorisatie is consistent: `canViewHorse` geeft toegang aan stalleden, eigenaren en bereiders van het paard; niemand anders.
- [ ] Styling volgt het bestaande design system (geen nieuwe kleuren/tokens; bestaande `badge`-, `panel`- en `gezondheid-tabel`-klassen hergebruiken).
- [ ] Een eigenaar/bereider dient altijd of eigenaar of bereider te zijn. Het is niet mogelijk om een account zonder een van de 2 vinkjes op te slaan.

# Technische notities

Geen implementatieontwerp, alleen de aanknopingspunten die de impact afbakenen:

- **Datamodel**: het accountloze `HorseRider` kan niet langer de toegangsdrager voor bereiders zijn (een bereider moet kunnen inloggen). Logische richting: een account-gekoppelde person-koppeling tussen `Horse` en `User` met twee rol-vlaggen. Zie Datamodel-impact hieronder; definitieve modelnaam/vorm in de bouwfase.
- **Autorisatie**: `src/lib/auth/authorization.ts` -- `canViewHorse` en de eigenaar-check (`isHorseOwner`) moeten bereiders meenemen. `updateRiderPhone` (nu eigenaar-pad) heroverwegen in het nieuwe model.
- **Actions**: `src/features/paarden/actions.ts` -- de owner-/rider-acties consolideren tot koppel/ontkoppel + rol-toggle acties. Hergebruik het bestaande account-aanmaak-pad (`createAndLinkEigenaar`, admin-client).
- **Queries**: `getHorse` (`src/features/paarden/queries.ts`) include aanpassen aan het nieuwe model.
- **Routes**: `src/app/(app)/paarden/[id]/eigenaren/nieuw`, `.../bereiders/nieuw`, `.../bereiders/[riderId]/bewerken` herzien/consolideren.

# Datamodel-impact

> Concreet en expliciet, zodat de bouwstory dit kan uitvoeren. Definitieve naamgeving en exacte velden vallen in de bouwfase, maar de richting ligt vast.

1. **Bereider wordt account-gekoppeld.** Het huidige accountloze `HorseRider` (vrije velden, geen `userId`) kan een bereider die kan inloggen niet representeren en vervalt daarom als toegangsmodel.

2. **Een person-koppeling met rolvlaggen.** Voorgestelde richting: een model dat een `User` aan een `Horse` koppelt met twee booleans, bijv.:
   - `HorsePerson { id, horseId, userId, isOwner: Boolean, isRider: Boolean, createdAt }`
   - `@@unique([horseId, userId])` (een rij per persoon per paard; rollen als vlaggen).
   - App-invariant: minstens een rol actief, anders bestaat de koppeling niet.
   Dit vervangt `HorseOwner` als toegangsdrager. Of `HorseOwner` hernoemd/uitgebreid wordt of een nieuw model komt, is een bouwkeuze; functioneel is het bovenstaande.

3. **Relaties die meeveranderen:**
   - `Horse.owners` (`HorseOwner[]`) en `Horse.riders` (`HorseRider[]`) -> vervangen door een relatie (bijv. `Horse.people`).
   - `User.horseOwnerships` (`HorseOwner[]`) -> meeveranderen naar de nieuwe koppeling.
   - `Contract.counterpartyUserId` verwijst naar een `User` die via de eigenaar-koppeling aan het paard hangt -- moet blijven werken (eigenaar-rol filteren op `isOwner = true`). **Buiten scope om te herontwerpen, wel niet breken.**

4. **Vervallen velden:** `HorseRider.name/dateOfBirth/phone/email/notes` en de afgeleide "Minderjarig"-aanduiding vervallen als bereider account-gekoppeld wordt (naam/e-mail komen dan van `User`). Zie open vraag 2 (verlies van telefoon/minderjarig-info).

5. **Migratie:** bestaande `HorseOwner`-rijen -> person-koppeling met `isOwner = true`. Bestaande `HorseRider`-rijen kunnen niet automatisch een account krijgen -> datamigratie-strategie nodig (open vraag 1).

6. **Schemawijziging toegestaan zonder vooraf overleg** (project-memory: "Schemawijzigingen toegestaan"); migratie via `npx prisma migrate` conform CLAUDE.md.
