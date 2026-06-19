---
issue: 100
title: "Paardenprofiel uitbreiden"
status: "Done"
labels: []
url: "https://github.com/MiniMaxi-user/velaro/issues/100"
archivedAt: 2026-06-19
---

# #100 — Paardenprofiel uitbreiden

# User Story

**Als** staleigenaar of stalmedewerker
**wil ik** op het paardenprofiel binnen het bestaande Gezondheidsdomein ook **gewichts- en lichaamsmetingen** kunnen registreren
**zodat** ik de conditie en lichamelijke ontwikkeling van een paard over tijd kan volgen op dezelfde centrale plek als de overige gezondheidsgegevens.

# Context

Het paardenprofiel is het centrale object van Velaro. De detailpagina
(`src/app/(app)/paarden/[id]/page.tsx`) toont onder de tab **Gezondheid**
een sub-tabstructuur (`src/features/gezondheid/GezondheidTabs.tsx`) met op dit moment:

- **Vaccinaties** (model `Vaccination`)
- **Ontworming** (model `Deworming`)
- **Dierenarts** (model `VetVisit`)
- **Hoefsmit** (model `HoefsmitBezoek`)

Elke registratie volgt exact hetzelfde CRUD-patroon: een lijst (tabel) onder de
sub-tab, een `nieuw`-route en een `[recordId]/bewerken`-route onder
`src/app/(app)/paarden/[id]/<type>/`, met een form-component in
`src/features/gezondheid/` en server-acties in `actions.ts`/`queries.ts`.

**Productbeslissing (door eigenaar genomen, 2026-06-14):** het bestaande
**Gezondheidsdomein** wordt uitgebreid â€” er komt geen nieuw domein (Training,
Wedstrijden o.i.d.) in deze story. De story voegt **Ã©Ã©n** nieuw gezondheids-
registratietype toe, volgens precies hetzelfde patroon als de bestaande typen.

Hiermee vervalt de eerdere blokkade (`needs-human`): de domeinkeuze staat vast en
het detailniveau is via een onderbouwde werkaanname afgebakend (zie Open vragen).

# Scope

**Binnen scope**
- EÃ©n nieuw gezondheids-registratietype toevoegen als extra sub-tab onder **Gezondheid**:
  **Gewicht & metingen** (zie werkaanname voor de velden).
- Lijstweergave (tabel) van de registraties onder de nieuwe sub-tab, in lijn met de
  bestaande gezondheidstabellen, inclusief tellerbadge zoals de andere sub-tabs.
- `nieuw`-route en `[recordId]/bewerken`-route onder
  `src/app/(app)/paarden/[id]/metingen/`, plus verwijderen via dezelfde
  `DeleteGezondheidButton`-aanpak.
- Form-component in `src/features/gezondheid/` en uitbreiding van `actions.ts`
  (create/update/delete) en `queries.ts` (ophalen per paard).
- Nieuw Prisma-model (additief) met migratie.
- Respecteren van bestaande autorisatie: OWNER/STAFF mogen aanmaken/bewerken/
  verwijderen; paardeneigenaar ziet de registraties in leesweergave (geen
  bewerkknoppen, conform `canEdit`).

**Buiten scope**
- Nieuwe domeinen zoals Training, Wedstrijden/prestaties, documenten/bijlagen of
  verzekering â€” die vallen buiten deze story.
- Grafieken/trendvisualisatie van het gewichtsverloop (alleen tabel/lijst in deze story).
- Externe integraties (KNHS, FEI, wearables), AI-modules, open API.
- Wijzigingen aan andere tabs of aan de lease-module.
- Herinneringen/"volgende datum"-logica voor metingen (metingen kennen geen vervaldatum).

# Acceptatiecriteria

- **Als** een OWNER/STAFF een paardprofiel opent en naar de tab **Gezondheid** gaat,
  **dan** is er een extra sub-tab **Gewicht & metingen** zichtbaar, naast Vaccinaties,
  Ontworming, Dierenarts en Hoefsmit, met een teller van het aantal registraties.
- **Wanneer** een OWNER/STAFF onder die sub-tab op **+ Toevoegen** klikt en het formulier
  invult en opslaat, **dan** wordt de meting persistent bewaard en na herladen in de
  lijst getoond (nieuwste of op datum gesorteerd, consistent met de andere tabellen).
- **Wanneer** een OWNER/STAFF een bestaande meting bewerkt of verwijdert,
  **dan** wordt de wijziging persistent doorgevoerd en correct getoond.
- **Als** een paardeneigenaar zijn eigen paard opent, **dan** ziet hij de sub-tab
  **Gewicht & metingen** in leesweergave zonder Toevoegen-/Bewerk-/Verwijderknoppen
  (conform de bestaande `canEdit`-werking).
- **Als** er nog geen metingen zijn, **dan** toont de sub-tab een lege-staat-melding
  in dezelfde stijl als de andere gezondheidstabs ("Nog geen metingen geregistreerd.").
- De uitbreiding gebruikt de bestaande UI-patronen (panel/sub-tab/tabel) en design
  tokens; er worden geen nieuwe kleuren of fonts geÃ¯ntroduceerd.
- De datamodelwijziging staat in `prisma/schema.prisma` met een migratie en is
  **additief**: bestaande modellen worden niet ontwricht.

# Open vragen

**Werkaanname (mandaat eigenaar â€” niet blokkerend; mag naar Ready):**
Het toegevoegde gezondheids-registratietype is **"Gewicht & metingen"**. Dit is een
logisch, laag-risico type dat nog ontbreekt, vaak gevolgd wordt bij pensionpaarden
(conditie/BCS), en exact in het bestaande CRUD-patroon past. Gekozen Prisma-model
(werknaam `BodyMeasurement` / sub-tab "Gewicht & metingen") met velden:

- `date` (DateTime, verplicht) â€” datum van de meting.
- `weightKg` (Decimal/Float, optioneel) â€” gewicht in kilogram.
- `heightCm` (Int, optioneel) â€” stokmaat/schofthoogte in cm.
- `bodyConditionScore` (Decimal/Float, optioneel) â€” BCS-score (bv. schaal 1â€“9).
- `measuredBy` (String, optioneel) â€” uitvoerder (wie heeft gemeten).
- `notes` (String, optioneel) â€” vrije notities.
- standaard `id`, `horseId` (relatie naar `Horse`, `onDelete: Cascade`), `createdAt`.

Geen `nextDate`/vervaldatum (anders dan vaccinatie/ontworming/hoefsmit), omdat een
meting geen herhaalvervaldatum kent. Minimaal vereist bij invoer: `date` plus ten
minste Ã©Ã©n meetwaarde (`weightKg`, `heightCm` of `bodyConditionScore`).

Mocht de eigenaar later een ander type/andere velden prefereren, dan is dat een
kleine aanpassing op deze werkaanname; de structuur (sub-tab + CRUD) blijft gelijk.
