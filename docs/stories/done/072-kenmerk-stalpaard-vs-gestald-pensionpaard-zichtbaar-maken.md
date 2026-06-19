---
issue: 72
title: "Kenmerk: stalpaard vs. gestald pensionpaard zichtbaar maken"
status: "Done"
labels: []
url: "https://github.com/MiniMaxi-user/velaro/issues/72"
archivedAt: 2026-06-19
---

# #72 — Kenmerk: stalpaard vs. gestald pensionpaard zichtbaar maken

**Als** staleigenaar (OWNER) of stalmedewerker (STAFF)
**wil ik** per paard kunnen aangeven en in Ã©Ã©n oogopslag zien of het paard eigendom is van de stal zelf of van een externe (paarden)eigenaar die het paard alleen stalt,
**zodat** ik pensionpaarden en stalpaarden snel uit elkaar kan houden in het overzicht en op het profiel.

## Context

Op een pensionstal staan twee soorten paarden door elkaar:

- **Pensionpaard** â€” eigendom van een externe paardeneigenaar; het paard wordt enkel gestald.
- **Stalpaard** â€” eigendom van de stal zelf.

Vandaag legt het datamodel externe eigenaren vast via de `HorseOwner`-koppeling (many-to-many tussen `Horse` en `User`). Er is nog **geen** expliciet kenmerk dat een paard als "eigendom van de stal" markeert, en er is geen visueel onderscheid in de UI.

Dit kenmerk moet als **icoon of badge** duidelijk zichtbaar zijn in het platform.

## Scope

- Een paard kan gemarkeerd worden als **eigendom van de stal** of als **gestald (externe eigenaar)**.
- Het kenmerk is zichtbaar als badge/icoon op:
  - de paardenlijst (`/paarden`, `src/app/(app)/paarden/page.tsx`) â€” per rij/kaart;
  - de paard-detailpagina (`/paarden/[id]`, `src/app/(app)/paarden/[id]/page.tsx`) â€” bij de kop/Eigenaren-paneel.
- Het kenmerk is in te stellen bij het aanmaken (`/paarden/nieuw`) en bewerken (`/paarden/[id]/bewerken`) van een paard.
- Badge-styling volgt het bestaande design system (tokens uit `src/styles/globals.css`); geen nieuwe kleuren.

## Buiten scope

- Facturatie/pension-tarieven koppelen aan dit kenmerk (komt in de facturatie-stap).
- Wijzigingen aan de bestaande `HorseOwner`-flow voor externe eigenaren (toevoegen/verwijderen van eigenaren blijft zoals het is).
- Filteren/sorteren van de paardenlijst op dit kenmerk (apart te refinen indien gewenst).
- Zichtbaarheid voor de paardeneigenaar-rol (eigenaar-weergave is stap 5, nog niet gebouwd).

## Acceptatiecriteria

- [ ] **Given** ik bewerk of maak een paard aan, **when** ik het formulier open, **then** kan ik kiezen of het paard *eigendom van de stal* of *gestald (externe eigenaar)* is.
- [ ] **Given** een paard is gemarkeerd als eigendom van de stal, **when** ik de paardenlijst (`/paarden`) bekijk, **then** zie ik bij dat paard een badge/icoon dat "Stalpaard" (of gelijkwaardig) aangeeft.
- [ ] **Given** een paard is een pensionpaard (externe eigenaar), **when** ik de paardenlijst bekijk, **then** is dat onderscheid visueel herkenbaar (badge/icoon of het ontbreken van de stalpaard-badge â€” zie open vraag).
- [ ] **Given** ik open de paard-detailpagina, **when** de pagina laadt, **then** is het kenmerk zichtbaar bij de kop of in het Eigenaren-paneel.
- [ ] De badge gebruikt bestaande design-tokens en is toegankelijk (tekstlabel of `aria-label`, niet alleen kleur).
- [ ] Bestaande paarden krijgen een duidelijke default na de wijziging (zie open vraag over default).

## Open vragen

- **Datamodel:** wordt dit een nieuw veld op `Horse` (bv. `ownedByStable: Boolean`), of wordt "eigendom van de stal" afgeleid uit het ontbreken van een `HorseOwner`-koppeling? Een paard zonder geregistreerde externe eigenaar is nu niet automatisch een stalpaard, dus een expliciet veld lijkt nodig â€” graag bevestigen. > Ja nieuw veld op Horse
- **Default:** welke waarde krijgen bestaande paarden bij de migratie (stalpaard of pensionpaard)? > Default ownedByStable = true
- **Wederzijdse uitsluiting:** kan een paard zowel een externe `HorseOwner` hebben als gemarkeerd zijn als eigendom van de stal, of sluiten die elkaar uit? > Nee het is of / of
- **Teksten/iconen:** gewenste badge-labels en iconen ("Stalpaard" vs. "Pension"/"Gestald")? > Stalpaard / Pension
- **Tonen we ook een expliciete badge voor pensionpaarden**, of alleen voor stalpaarden?  > Altijd een badge. Zorg dat kenemerk beter zichtbaar is dan de andere badges. Dus met een extra rondje erin of icon.
