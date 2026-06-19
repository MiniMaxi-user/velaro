---
issue: 73
title: "Eigenaar & bereider: gecombineerd overzicht op het paardprofiel"
status: "Done"
labels: ["refine"]
url: "https://github.com/MiniMaxi-user/velaro/issues/73"
archivedAt: 2026-06-19
---

# #73 — Eigenaar & bereider: gecombineerd overzicht op het paardprofiel

# User Story

Als **staleigenaar / stalmedewerker (OWNER/STAFF)**
wil ik **de eigenaren en bereiders van een paard in Ã©Ã©n samenhangend overzicht beheren in plaats van in twee losse lijsten**
zodat **ik in Ã©Ã©n oogopslag zie wie bij een paard hoort en niet tussen twee aparte blokken hoef te schakelen**.

# Context

Op het paardprofiel staat de tab **"Eigenaar & bereider"**. Daarin worden op dit
moment twee volledig losse panels getoond:

- **Eigenaren** â€” beheerd via `EigenaarBeheer` (`src/features/paarden/EigenaarBeheer.tsx`),
  gevoed door `horse.owners` (model `HorseOwner`).
- **Bereiders** â€” beheerd via `BereiderBeheer` (`src/features/paarden/BereiderBeheer.tsx`),
  gevoed door `horse.riders` (model `HorseRider`).

Zie `src/app/(app)/paarden/[id]/page.tsx` (rond regel 220-238).

De wens uit het oorspronkelijke backlog-item: deze twee lijsten samenvoegen tot Ã©Ã©n
geheel, omdat eigenaar en bereider conceptueel "personen bij een paard" zijn en
"eigenaar of bereider" eerder een **kenmerk/rol** van zo'n persoon is dan twee losse
entiteiten.

**Belangrijk onderscheid in het huidige datamodel (reden waarom dit niet triviaal is):**

- `HorseOwner` is **gekoppeld aan een Velaro-`User`-account** en bepaalt
  **autorisatie**: of een paardeneigenaar zijn/haar eigen paard mag inzien. Dit is
  kernlogica (zie CLAUDE.md: autorisatie bouwen we zelf, niet uitbesteden).
- `HorseRider` heeft **bewust gÃ©Ã©n account** (kan minderjarig zijn) en bestaat uit
  vrije velden (naam, geboortedatum, telefoon, e-mail, notities).

Het samenvoegen van de twee **lijsten in de UI** is laag-risico. Het samenvoegen van
het **datamodel** raakt autorisatie en is een ontwerpbeslissing die niet eenduidig
uit het backlog-item volgt â€” daarom als open vraag opgenomen (zie onder).

# Scope

**Binnen scope:**
- De tab "Eigenaar & bereider" toont eigenaren en bereiders in **Ã©Ã©n gecombineerd
  overzicht** (Ã©Ã©n sectie/lijst) in plaats van twee gescheiden panels, met een
  duidelijke aanduiding per regel of iemand **eigenaar** en/of **bereider** is.
- Toevoegen/koppelen, bewerken en ontkoppelen/verwijderen van eigenaren en bereiders
  blijft volledig werken (bestaande acties hergebruiken).
- De bestaande eigenaar-only-weergave (`BereiderInfo`, voor de paardeneigenaar-rol)
  blijft consistent en correct.
- Geen wijziging aan autorisatiegedrag: een eigenaar blijft account-gekoppeld, een
  bereider blijft accountloos.

**Buiten scope:**
- Het samenvoegen van de Prisma-modellen `HorseOwner` en `HorseRider` tot Ã©Ã©n model
  (afhankelijk van de open vraag hieronder â€” pas oppakken na expliciete beslissing).
- Wijzigingen aan de autorisatie-/eigenaarstoegangslogica.
- Nieuwe velden of nieuwe rollen die niet al in het datamodel bestaan.

# Acceptatiecriteria

- [ ] **Given** een paard met minstens Ã©Ã©n eigenaar en Ã©Ã©n bereider
      **When** een OWNER/STAFF de tab "Eigenaar & bereider" opent
      **Then** ziet die Ã©Ã©n gecombineerd overzicht waarin per persoon zichtbaar is of
      het om een **eigenaar**, een **bereider**, of beide gaat.
- [ ] **Given** het gecombineerde overzicht
      **When** een OWNER/STAFF een eigenaar koppelt (via e-mail/account) of een
      bereider toevoegt
      **Then** verschijnt de nieuwe persoon direct in het overzicht met de juiste
      rol-aanduiding.
- [ ] **Given** een gekoppelde eigenaar of bereider
      **When** de OWNER/STAFF deze bewerkt of ontkoppelt/verwijdert
      **Then** werkt dit zoals voorheen en is het resultaat zichtbaar in het
      gecombineerde overzicht.
- [ ] **Given** een paard zonder eigenaren en zonder bereiders
      **Then** toont het overzicht een nette lege staat.
- [ ] De autorisatie blijft ongewijzigd: een eigenaar blijft een account-gekoppelde
      `HorseOwner`, een bereider blijft een accountloze `HorseRider`.
- [ ] Geen Prisma-schemawijziging in deze story (zie open vraag).
- [ ] Styling volgt het bestaande design system (panels/tabellen, geen nieuwe tokens).

# Open vragen

1. **Datamodel samenvoegen of niet?** Het oorspronkelijke item oppert om eigenaar en
   bereider in Ã©Ã©n datamodel te zetten met "eigenaar/bereider" als kenmerk. Dit raakt
   autorisatie (`HorseOwner` is account-gekoppeld, `HorseRider` niet en kan minderjarig
   zijn). Mogelijke richtingen:
   - **(a)** Alleen de UI-lijsten samenvoegen, datamodel ongewijzigd laten *(huidige
     scope van deze story)*.
   - **(b)** Datamodel daadwerkelijk samenvoegen tot Ã©Ã©n "Person/HorsePerson"-model met
     rolvlaggen en optionele accountkoppeling â€” grotere wijziging, raakt autorisatie en
     vereist migratie. Dan eerst een aparte fundament-story.
   Beslissing nodig van product/architect vÃ³Ã³rdat richting (b) opgepakt wordt. > Antwoord: Dit is al in #94 opgelost.
2. Mag Ã©Ã©n persoon tegelijk **eigenaar Ã©n bereider** van hetzelfde paard zijn, en zo ja:
   moet dat als Ã©Ã©n regel met twee rollen getoond worden of als twee aparte regels? > Antwoord: Als 1 regel met 2 rollen
