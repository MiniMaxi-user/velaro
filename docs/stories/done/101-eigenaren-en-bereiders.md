---
issue: 101
title: "Eigenaren en bereiders"
status: "Done"
labels: []
url: "https://github.com/MiniMaxi-user/velaro/issues/101"
archivedAt: 2026-06-19
---

# #101 — Eigenaren en bereiders

# User Story

Als **staleigenaar of stalmedewerker**
wil ik op de tab *Eigenaar & bereider* van een paard een duidelijke en consistente manier om personen te koppelen en te ontkoppelen
zodat ik snel de juiste persoon aan dit paard kan toevoegen of van dit paard kan loskoppelen, zonder verwarring tussen "ontkoppelen" en "verwijderen".

# Context

De tab *Eigenaar & bereider* op het paard-detailscherm (`PaardDetailTabs` â†’ `PersonenBeheer`) toont gekoppelde personen en biedt nu een toevoeg-formulier (e-mailadres + rol-checkboxes) en Ã©Ã©n actieknop per rij. Die actieknop heet "Ontkoppelen" maar wordt visueel als prullenbak (delete) getoond, terwijl er geen aparte "verwijderen"-actie bestaat. Dit zorgt voor onduidelijkheid: gebruikers verwachten onderscheid tussen het *ontkoppelen* van een persoon van dit paard en het *verwijderen* van de persoon zelf.

Daarnaast staat boven het grid een bruine sectiekop "Eigenaren & bereiders" die de tab-titel "Eigenaar & bereider" dubbelop herhaalt, en is het toevoegen van personen niet intuÃ¯tief (geen zoek-/selectie-ervaring binnen de stalcontext).

**De twee eerder blokkerende productbeslissingen zijn genomen:**

1. **Geen account-verwijdering.** Er komt gÃ©Ã©n actie die een account (of Supabase-auth-user) verwijdert. Er bestaat maar Ã©Ã©n destructieve actie: de persoon **ontkoppelen** van dit paard (het huidige `removeHorsePerson`-gedrag). Het account blijft bestaan en blijft gekoppeld aan eventuele andere paarden/stallen. De verwarrende "verwijderen"-terminologie en de bijbehorende bevestigingspopup vervallen; overal wordt consequent "ontkoppelen" gebruikt.
2. **Bron van de zoek-dropdown = alle stalleden van de stal waartoe dit paard behoort.** De dropdown toont stalleden van de stal van dit paard, met autocomplete-gedrag identiek aan de globale topbar-zoekbalk.

Deze story betreft uitsluitend een UX-/interactieverbetering van het bestaande personenbeheer op de eigenaar/bereider-tab. Bestaande server actions (`addHorsePerson`, `removeHorsePerson`, `toggleHorsePersonRole`, `createAndLinkPerson`) en het datamodel (`HorsePerson`) zijn het uitgangspunt.

# Scope

**Binnen scope**

- Verbeteren van de UX op de tab *Eigenaar & bereider* (component `PersonenBeheer`, `src/features/paarden/PersonenBeheer.tsx`).
- De per-rij-actie heet en gedraagt zich consequent als **"Ontkoppelen"** (huidige `removeHorsePerson`-gedrag): alleen de koppeling tussen persoon en dit paard wordt verwijderd. De "verwijderen"-terminologie en de bijbehorende bevestigingspopup worden verwijderd.
- Boven het grid een knop **"Toevoegen"** met een `+`-icoon, die een toevoeg-flow opent.
- In de toevoeg-flow een **zoek-dropdown** die stalleden toont van de stal waartoe dit paard behoort, met autocomplete-gedrag identiek aan de globale topbar-zoekbalk (`TopbarSearch`): resultaten verschijnen pas vanaf 2 ingetypte tekens, gezocht wordt op voornaam, achternaam Ã©n e-mailadres, resultaten worden getoond als "voornaam achternaam + e-mailadres", en na keuze toont het invoerveld alleen het e-mailadres.
- In de toevoeg-flow kan worden aangevinkt of de koppeling een eigenaar- en/of bereiderrol betreft (consistent met bestaande validatie: minstens Ã©Ã©n rol verplicht).
- Een **nieuwe query** in `src/features/paarden/queries.ts` die de stalleden oplevert van de stal waartoe een gegeven paard behoort (bron voor de zoek-dropdown). Deze query bestaat nog niet en moet worden toegevoegd.
- De link/tekst "Maak een account aan" wordt aangepast naar: *"Klik hier om een nieuw account toe te voegen."*
- De dubbele bruine sectiekop "Eigenaren & bereiders" boven het grid verwijderen (de tab-titel dekt dit al).

**Buiten scope**

- Account-/Supabase-auth-user-verwijdering in welke vorm dan ook. Er komt expliciet gÃ©Ã©n delete-actie en gÃ©Ã©n cascade over andere paarden/stallen.
- Wijzigingen aan het datamodel / Prisma-schema (`HorsePerson` blijft ongewijzigd).
- Wijzigingen aan de eigenaar-weergave (`PersonenInfo`) buiten consistentie met bovenstaande.
- Functionaliteit op andere tabs of schermen.
- Het uitbreiden van rollen voorbij eigenaar/bereider.

# Acceptatiecriteria

- [ ] De bruine sectiekop "Eigenaren & bereiders" boven het grid is verwijderd; de tab-titel "Eigenaar & bereider" blijft de enige kop.
- [ ] Boven het grid staat een knop **"Toevoegen"** met een `+`-icoon.
- [ ] **Wanneer** ik op "Toevoegen" klik, **dan** opent een toevoeg-flow met een zoek-dropdown.
- [ ] **Wanneer** ik in de zoek-dropdown minder dan 2 tekens heb getypt, **dan** worden er geen resultaten getoond (gelijk aan de globale topbar-zoekbalk).
- [ ] **Wanneer** ik 2 of meer tekens typ, **dan** worden stalleden van de stal waartoe dit paard behoort getoond die matchen op voornaam, achternaam of e-mailadres.
- [ ] Elk resultaat in de dropdown wordt getoond als "voornaam achternaam + e-mailadres".
- [ ] **Wanneer** ik een persoon uit de dropdown kies, **dan** toont het invoerveld alleen het e-mailadres van die persoon.
- [ ] In de toevoeg-flow kan ik aanvinken of de gekoppelde persoon eigenaar en/of bereider is; minstens Ã©Ã©n rol is verplicht (consistent met bestaande validatie).
- [ ] **Wanneer** ik de toevoeg-flow bevestig, **dan** wordt de gekozen persoon met de aangevinkte rol(len) aan dit paard gekoppeld.
- [ ] Elke rij in het grid heeft Ã©Ã©n actie: **"Ontkoppelen"**. Er is geen aparte delete-/verwijder-knop meer.
- [ ] **Wanneer** ik op "Ontkoppelen" klik, **dan** wordt de persoon van dit paard ontkoppeld (de `HorsePerson`-koppeling verdwijnt) zonder dat de persoon, het account of koppelingen aan andere paarden/stallen worden verwijderd.
- [ ] Er is nergens nog "verwijderen"-terminologie of een "verwijderen"-bevestigingspopup voor personen op deze tab.
- [ ] De tekst "Maak een account aan" is vervangen door: *"Klik hier om een nieuw account toe te voegen."*
- [ ] In `src/features/paarden/queries.ts` bestaat een nieuwe query die de stalleden oplevert van de stal waartoe een gegeven paard behoort, en de zoek-dropdown gebruikt deze als bron.
- [ ] De UI volgt het bestaande design system (cream/navy, goud-accenten, bestaande knop- en badge-klassen); er worden geen nieuwe kleuren/fonts geÃ¯ntroduceerd.
- [ ] Toegang blijft beperkt tot OWNER/STAFF van de stal (bestaande autorisatie blijft gehandhaafd).
