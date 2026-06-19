---
issue: 99
title: "Pagina opbouw contract bewerk pagina."
status: "Done"
labels: []
url: "https://github.com/MiniMaxi-user/velaro/issues/99"
archivedAt: 2026-06-19
---

# #99 — Pagina opbouw contract bewerk pagina.

# User Story

**Als** staleigenaar (OWNER)
**wil ik** de contract-bewerkpagina invullen via een overzichtelijke stappen-indeling met een stepper rechts en live voortgang,
**zodat** ik snel zie welke velden verplicht zijn, hoeveel ik per blok al heb ingevuld en wanneer het contract klaar is om aan te bieden, zonder eindeloos te scrollen of te raden of ik niets ben vergeten.

# Context

De huidige contract-bewerkpagina (bewerken/page.tsx met ContractForm) is een lange lijst van secties. De eigenaar moet veel scrollen, ziet niet in een oogopslag welke velden verplicht zijn en weet niet of een blok volledig is ingevuld.

Deze story betreft uitsluitend een herstructurering van de presentatie/UX van de bestaande bewerkpagina voor de staleigenaar. De onderliggende velden, het datamodel, de server-actie (updateStallingContract), de aanbied-validatie (ontbrekendeAanbiedVelden / magAangebodenWorden) en de PDF-generatie bestaan al en blijven functioneel ongewijzigd.

Designreferentie (stepper-patroon, niet de inhoud): de stepper.html uit het designsystem. Een lokale kopie staat in recovered_stepper.html in de projectroot. De stepper.html toont een ander domein (Paard aanmelden); alleen het layout-/interactiepatroon wordt overgenomen, niet de inhoud.

De bestaande logische blokken die als stappen ingedeeld worden:
1. Basisgegevens (type, wederpartij/eigenaar, ingangsdatum)
2. Huisvesting en verzorging
3. Dienstpakket (Voer en verzorging, Weidegang, Faciliteiten)
4. Prijs en looptijd (Prijs en borg, Looptijd)
5. Verzekering en aansprakelijkheid
6. Entings- en gezondheidsplicht (vaccinatie, ontworming/mestonderzoek, hoefverzorging, dierenarts-drempel)
7. Berijder (optioneel blok)
8. Bijlagen en extra diensten

# Scope

## Binnen scope
- Herindeling van de bewerkpagina in logische stappen/blokken met een stepper rechts (sticky), conform het patroon uit recovered_stepper.html.
- Elk blok links heeft een nummer; de stepper rechts toont per stap een percentage-voortgang (groene balk die volloopt tijdens het invullen).
- Per blok/stap: zodra alle verplichte velden zijn ingevuld kleurt het nummer links groen, toont de stap rechts een groene icon met een V, en verandert de badge rechts van Bezig naar Compleet.
- Live validatie: bij elke veldwijziging direct herberekenen van voortgang en status (geen submit nodig).
- Verplichte velden krijgen een rode asterisk conform design. Welke velden verplicht zijn volgt uit de bestaande aanbied-validatie (ontbrekendeAanbiedVelden per blok).
- Bestaande checkboxes ombouwen naar switches/toggles (zie .toggle-switch in design).
- Bovenaan een blauwe overall progress bar: deze telt alleen volledig ingevulde (100%) blokken mee, niet de losse percentages per blok (dus X van N blokken compleet, niet het gemiddelde percentage).
- Onder de stappen: de bestaande Aanbieden-knop (bestaande logica/server-actie en bestaande aanbied-validatie blijft leidend; bij aanbieden wordt server-side gevalideerd).
- Daaronder een Preview PDF-knop, die pas indrukbaar is wanneer alles volledig is ingevuld; daarvoor grayed out/disabled.
- Pagina blijft uitsluitend bewerkbaar bij status CONCEPT (bestaande blokkering behouden).

## Buiten scope
- De contract-/aanmeldpagina voor de paardeneigenaar (eigenaarsweergave), expliciet niet aanpassen.
- Wijzigingen aan het datamodel, Prisma-schema, server-acties of de aanbied-validatieregels zelf.
- Wijzigingen aan de PDF-inhoud/-generatie (alleen het aanroepen/koppelen van de bestaande preview).
- De aanmaakpagina (/contracten/nieuw), tenzij hergebruik van het herbouwde ContractForm dit vanzelf meeneemt; dat is geen apart acceptatiecriterium.
- Nieuwe velden of nieuwe requirements toevoegen.

# Acceptatiecriteria

- [ ] Als een eigenaar een concept-contract opent ter bewerking, dan wordt de pagina getoond als blokken/stappen met links de invulvelden en rechts een sticky stepper, conform het patroon uit recovered_stepper.html.
- [ ] Als de pagina laadt, dan toont elk blok links een nummer en toont de stepper rechts per stap een naam en een voortgangsbalk met percentage.
- [ ] Wanneer de eigenaar een veld wijzigt, dan wordt de voortgang van het betreffende blok en de overall voortgang direct (zonder submit) herberekend.
- [ ] Wanneer alle verplichte velden van een blok zijn ingevuld, dan kleurt het bloknummer links groen, toont de stap rechts een groene V-icon en verandert de badge van Bezig naar Compleet.
- [ ] Wanneer nog niet alle verplichte velden van een blok zijn ingevuld maar er al iets is ingevuld, dan toont het blok de status Bezig; bij niets ingevuld de status Nog te doen.
- [ ] Dan krijgt elk verplicht veld een zichtbare rode asterisk conform design; de set verplichte velden komt overeen met de bestaande aanbied-validatie per blok.
- [ ] Dan zijn alle voormalige checkboxes weergegeven als switches/toggles conform design, met behoud van dezelfde form-veldnamen en -waarden (server-actie blijft werken).
- [ ] Dan staat bovenaan een blauwe overall progress bar die uitsluitend reageert op volledig (100%) ingevulde blokken (telling van complete blokken), niet op de losse percentages per blok.
- [ ] Wanneer de eigenaar op Aanbieden klikt, dan wordt de bestaande aanbied-logica met server-side validatie uitgevoerd (bestaand gedrag, ongewijzigd).
- [ ] Wanneer nog niet alles volledig is ingevuld, dan is de Preview PDF-knop disabled/grayed out; wanneer alles volledig is ingevuld, dan is de Preview PDF-knop indrukbaar.
- [ ] Als het contract een andere status dan CONCEPT heeft, dan blijft de bestaande blokkering (niet bewerkbaar) van kracht.
- [ ] De styling gebruikt uitsluitend bestaande designtokens/CSS-conventies uit globals.css (geen nieuwe kleuren/fonts verzinnen); UI-teksten in het Nederlands.

# Technische Notities

- Bestaande bouwstenen om te hergebruiken (niet herontwerpen):
  - src/features/contracten/ContractForm.tsx (huidige veld-/sectiestructuur).
  - src/features/contracten/aanbiedValidatie.ts: ontbrekendeAanbiedVelden levert per blok de ontbrekende verplichte velden; dit is de bron van waarheid voor welke velden verplicht zijn en voor blok-compleetheid.
  - Bestaande server-actie updateStallingContract en de aanbied-actie (actions.ts), plus PDF-bouwstenen (pdf.ts, pdfData.ts, ContractPdfDocument.tsx).
- De recovered_stepper.html in de projectroot bevat een werkende referentie-implementatie van de stepper-interactie (per-veld voortgang, scrollspy, badges, totaal). Gebruik dit als interactiereferentie; de toggles gebruiken de class .toggle-switch.
- Geen localStorage-afhankelijke kernlogica; voortgangsberekening is client-side UI-state, persistentie loopt via de bestaande server-actie.

# Open vragen

1. Basis voor 100% / blok compleet en het inschakelen van Preview PDF: moet de compleetheid (en daarmee de groene V, de blauwe progress bar en de Preview-knop) gebaseerd zijn op uitsluitend de verplichte velden (zoals ontbrekendeAanbiedVelden definieert) of op alle velden van een blok? De designreferentie telt alle zichtbare velden mee, maar de aanbied-validatie kijkt alleen naar verplichte velden. Aanname zonder antwoord: verplichte velden (consistent met aanbieden). Graag bevestigen.
2. Optionele blokken (Berijder, en blokken zonder verplichte velden): hoe tellen blokken zonder verplichte velden mee in de stepper en in de blauwe progress bar, gelden die direct als Compleet/100% of krijgen ze een neutrale/optionele status? Aanname zonder antwoord: blokken zonder verplichte velden gelden als Compleet (geen blokkade voor aanbieden).
