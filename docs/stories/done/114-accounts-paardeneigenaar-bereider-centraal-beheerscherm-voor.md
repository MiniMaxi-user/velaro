---
issue: 114
title: "Accounts paardeneigenaar & bereider: centraal beheerscherm voor staleigenaar"
status: "Done"
labels: ["tested"]
url: "https://github.com/MiniMaxi-user/velaro/issues/114"
archivedAt: 2026-06-19
---

# #114 — Accounts paardeneigenaar & bereider: centraal beheerscherm voor staleigenaar

# User Story

**Als** staleigenaar (OWNER)
**wil ik** een centraal scherm waarop ik alle externe accounts (paardeneigenaren en bereiders) van mijn stal(len) zie en veilig kan verwijderen, met een duidelijke verwijzing naar het Team-scherm voor mijn stalmedewerkers,
**zodat** ik in een overzicht weet wie toegang heeft tot welk paard en accounts kan opruimen zonder data of koppelingen onbedoeld te breken, zonder dat medewerkerbeheer op twee plekken versnipperd raakt.

# Context

Accountbeheer voor de aan een stal gekoppelde personen is vandaag versnipperd:

- **Externe accounts (paardeneigenaren en bereiders)** zijn `User`-rijen die via `HorsePerson` (`isOwner` / `isRider`) aan een paard gekoppeld zijn. Een staleigenaar (OWNER) heeft hier geen overzicht van. Het enige eigenaaroverzicht staat op platform-admin-niveau (`/admin/eigenaren`, alleen voor `isPlatformAdmin`) en toont **bereiders helemaal niet**.
- Externe accounts koppelen/ontkoppelen gebeurt verspreid op elk paardprofiel (tab "Eigenaar en bereider"). Er is geen plek waar je alle externe personen over alle paarden heen ziet.
- Er bestaat geen functie om een extern account te verwijderen, en geen validatie die uitlegt waarom dat niet kan.

## Duplicatie-analyse en gekozen UX-afbakening

De comment vraagt om "ook alle accounts van medewerkers tonen" plus "verwijderen mogelijk maken". Dat lijkt dubbelop, en dat is het ook deels:

- **Stalmedewerkers** (OWNER/STAFF) zijn `StableMember`-rijen. Daarvoor bestaat al een volwaardig **Team-/ledenscherm** (`/stal/leden`): tonen, uitnodigen (`addMember`), rol wijzigen (`updateMemberRole`) en **verwijderen** (`removeMember`, met "minimaal een OWNER"- en "niet jezelf"-bescherming). Stalmedewerkerbeheer is daar dus al compleet.
- **Externe accounts** (paardeneigenaren/bereiders) hebben juist geen eigen beheerscherm op stal-niveau.

Een nieuw "Accounts"-scherm dat ook medewerkers toont en beheert, dupliceert het Team-scherm en geeft twee plekken die stalmedewerkers tonen: een versnipperde user journey.

**Beslissing (afbakening):**

1. **Team-/ledenscherm** (`/stal/leden`) blijft de enige plek voor **interne stalmedewerkers** (`StableMember`: OWNER/STAFF): uitnodigen, rollen, verwijderen.
2. **Nieuw "Accounts"-scherm** (`/stal/accounts`) is uitsluitend voor **externe accounts**: paardeneigenaren en bereiders (`HorsePerson`), met overzicht, zoeken/filteren en veilig verwijderen.
3. De comment-eis "toon ook medewerkers" wordt **niet** ingevuld door medewerkerbeheer te dupliceren, maar door:
   - op het Accounts-scherm een **rustige verwijzing/knop naar het Team-scherm** te tonen ("Stalmedewerkers beheer je op het Team-scherm"), zodat de OWNER vanuit een instap beide accounttypes vindt;
   - en de onderliggende wens achter de comment, **accounts kunnen verwijderen**, ook voor medewerkers in te vullen op de plek waar medewerkers al staan: het Team-scherm heeft al een `removeMember`-verwijderactie. Die wordt in deze story geborgd, en de blokkade-melding wordt zichtbaar gemaakt in de UI (zie acceptatiecriteria).

Zo ontstaat een samenhangend mentaal model: **Team = interne medewerkers, Accounts = externe eigenaren/bereiders**, met onderlinge kruisverwijzing in plaats van duplicatie.

# Scope

In scope:

- Een nieuw scherm **"Accounts"** voor de ingelogde **staleigenaar (OWNER)**, bereikbaar via een menu-item in de linker-sidebar. Het toont externe accounts (`HorsePerson`) gekoppeld aan paarden op de stal(len) waarvan de gebruiker OWNER is.
- Per account tonen: naam plus e-mailadres; rol(len) (eigenaar en/of bereider uit `isOwner`/`isRider`); de stal(len) (via gekoppeld paard, `Horse.stable`); het paard/de paarden waaraan het account gekoppeld is.
- Zoeken/filteren op naam, e-mail, stal en paard (zelfde patroon als `EigenaarAccountsTabs`).
- **Verwijderen van een extern account** vanaf dit scherm, met **server-side haalbaarheidscheck vooraf**: is het account nog ergens in gebruik (gekoppeld aan een paard via `HorsePerson`, of wederpartij van een contract via `Contract.counterpartyUserId`, of lid van een stal via `StableMember`), dan is verwijderen geblokkeerd en toont de UI concreet **waar** en **waarom**.
- Een duidelijke **verwijzing naar het Team-scherm** (`/stal/leden`) op het Accounts-scherm voor het beheren van stalmedewerkers: geen duplicatie van medewerker-CRUD op dit scherm.
- **Borging op het bestaande Team-scherm**: de bestaande `removeMember`-blokkades (laatste OWNER van de stal, of zichzelf) worden als melding zichtbaar gemaakt in de UI, zodat de OWNER ook daar begrijpt waarom verwijderen geblokkeerd is.
- Borgen (regressietest, geen gedragswijziging): ontkoppelen op het paardprofiel verwijdert het account NIET: alleen de `HorsePerson`-koppeling verdwijnt; de `User` (en Supabase-auth-user) blijft bestaan. Huidig gedrag in `removeHorsePerson` / `toggleHorsePersonRole` voldoet hier al aan.

Niet in scope (bewust):

- Het platform-admin-scherm `/admin/eigenaren` blijft ongemoeid (platform-niveau: klanten/quota). Het nieuwe scherm is stal-niveau voor de OWNER.
- **Medewerker-CRUD (uitnodigen, rollen, verwijderen) wordt NIET naar het Accounts-scherm gekopieerd**: dat blijft op het Team-scherm.
- Externe accounts aanmaken vanaf dit scherm (blijft via paardprofiel `/paarden/[id]/personen/nieuw` en admin).
- Een formeel retentie-/AVG-beleid voor verwijderde auth-users (bestaand patroon volgen: bij definitief verwijderen worden zowel de `User`-rij als de Supabase-auth-user verwijderd, maar uitsluitend wanneer het account nergens meer in gebruik is).

# Acceptatiecriteria

1. **Als** ik ingelogd ben als staleigenaar (OWNER), **dan** zie ik in de linker-sidebar een menu-item "Accounts" dat naar `/stal/accounts` leidt; voor STAFF en voor paardeneigenaar/bereider is dit item niet zichtbaar.
2. **Wanneer** ik het Accounts-scherm open, **dan** zie ik per gekoppeld extern account: naam, e-mailadres, rol(len) (eigenaar/bereider), de stal(len) en het paard/de paarden waaraan het account gekoppeld is.
3. **Wanneer** een account aan meerdere paarden of stallen gekoppeld is, **dan** worden die gegroepeerd op een regel per account getoond (geen dubbele accountregels).
4. **Wanneer** ik zoek op naam, e-mail, stal of paard, **dan** filtert de lijst direct op die term.
5. **Wanneer** ik een extern account probeer te verwijderen dat nog in gebruik is, **dan** wordt verwijderen geblokkeerd en toont de UI concreet waar en waarom. De volgende gevallen blokkeren verwijderen, elk met een eigen melding:
   - Gekoppeld aan minstens een paard via `HorsePerson`, bijv. "Nog gekoppeld als eigenaar/bereider aan: {paardnaam} ({stalnaam}). Ontkoppel dit account eerst op het paardprofiel."
   - Wederpartij van minstens een contract (`Contract.counterpartyUserId`), bijv. "Dit account is wederpartij van een contract ({stalnaam}). Beeindig of ontkoppel het contract eerst."
   - Lid van minstens een stal via `StableMember`, bijv. "Dit account is ook stalmedewerker. Beheer dit via het Team-scherm."
6. **Wanneer** een extern account nergens meer in gebruik is en ik bevestig de verwijdering, **dan** worden zowel de `User`-rij als de bijbehorende Supabase-auth-user verwijderd en verdwijnt het account uit het overzicht.
7. **Wanneer** een eigenaar of bereider op een paardprofiel wordt ontkoppeld, **dan** blijft het account bestaan (alleen de `HorsePerson`-koppeling verdwijnt), aantoonbaar via dit accountoverzicht.
8. **Wanneer** ik het Accounts-scherm open, **dan** zie ik een duidelijke verwijzing/knop "Stalmedewerkers beheer je op het Team-scherm" die naar `/stal/leden` leidt; medewerker-CRUD wordt niet op het Accounts-scherm aangeboden.
9. **Wanneer** ik op het Team-scherm (`/stal/leden`) een medewerker probeer te verwijderen die niet verwijderd kan worden (laatste OWNER van de stal, of mijzelf), **dan** krijg ik een melding die uitlegt waarom dat niet kan (de bestaande `removeMember`-checks worden zichtbaar gemaakt in de UI in plaats van een stille error-string).
10. De verwijderactie is **server-side afgedwongen**: alleen een OWNER van de betrokken stal(len) kan een extern account verwijderen; de in-gebruik-validatie draait op de server, niet alleen in de UI.
11. `npx tsc --noEmit` slaagt; bestaande accountbeheer-functionaliteit (paardprofiel-koppeling, admin-eigenaren, Team-scherm) blijft zonder regressie werken.

# Relevante bestanden / technische notities

**Geen schemawijziging nodig.** Het datamodel dekt deze story volledig: `User`, `HorsePerson` (`isOwner`/`isRider`), `StableMember` en `Contract.counterpartyUserId` zijn aanwezig.

> Let op: `Contract.counterpartyUserId` heeft `onDelete: SetNull`, dus de database blokkeert het verwijderen niet automatisch. De in-gebruik-check op contracten moet **expliciet in de server-action** gebeuren (een bestaand contract met dit account als wederpartij telt als "in gebruik" en blokkeert verwijderen).

- Sidebar-navigatie: `src/components/Sidebar.tsx` plus `src/components/SidebarClient.tsx`. `isOwner` is al beschikbaar; voeg het "Accounts"-item toe in de hoofdnavigatie (naast/onder "Team"), uitsluitend voor de OWNER van de actieve stal.
- Nieuw scherm: `src/app/(app)/stal/accounts/page.tsx` (stal-context, consistent met `/stal/leden` en `/stal/contracten`).
- Nieuwe feature: `src/features/stal/accounts/` (of uitbreiden van `src/features/stal/`) met query plus client-component.
- Patroon hergebruiken: `src/features/admin/EigenaarAccountsTabs.tsx` (zoeken/tabel) en `src/features/admin/queries.ts` (`getHorseOwnerAccounts`) als blauwdruk, maar gefilterd op de stallen van de ingelogde OWNER in plaats van platform-breed, en **inclusief bereiders** (`isRider`), niet alleen eigenaren.
- Nieuwe query, bijv. `getStableExternalAccounts(ownerUserId)`: alle `HorsePerson` (isOwner OR isRider) waar `horse.stable` een stal is waarin de gebruiker OWNER is; gegroepeerd per `User`.
- Verwijder-action: nieuw, in `src/features/stal/accounts/actions.ts`. Volg het autorisatiepatroon van `src/features/stal/actions.ts` (`getOwnerContext`) en de auth-user-verwijdering uit `src/features/admin/actions.ts` / `src/features/paarden/actions.ts` (`createAdminClient().auth.admin.deleteUser`). Eerst de in-gebruik-check (HorsePerson / Contract.counterpartyUserId / StableMember), pas daarna `prisma.user.delete` plus `auth.admin.deleteUser`.
- Bestaand koppel-/ontkoppelgedrag: `src/features/paarden/actions.ts` (`removeHorsePerson`, `toggleHorsePersonRole`, `createAndLinkPerson`): niet wijzigen, alleen borgen.
- Team-scherm melding: `src/features/stal/actions.ts` (`removeMember`) levert al `{ error }`-strings terug bij geblokkeerde verwijdering; `src/features/stal/LidVerwijderenButton.tsx` moet die melding aan de gebruiker tonen (acceptatiecriterium 9).
- Autorisatie-helpers: `src/lib/auth/authorization.ts` (`getStableRole`, `getMemberships`).

# Open vragen

(geen blokkerende open vragen: de afbakening Team vs. Accounts is in deze story beslist. Mocht bij implementatie blijken dat het definitief verwijderen van de Supabase-auth-user beleidsmatig/AVG-gevoelig is, escaleren naar mens; functioneel volgt deze story het bestaande verwijderpatroon.)
