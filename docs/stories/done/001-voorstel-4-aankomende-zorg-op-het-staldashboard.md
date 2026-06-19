---
issue: 1
title: "Voorstel 4 - Aankomende zorg op het staldashboard"
status: "Done"
labels: []
url: "https://github.com/MiniMaxi-user/velaro/issues/1"
archivedAt: 2026-06-19
---

# #1 — Voorstel 4 - Aankomende zorg op het staldashboard

# Voorstel 4 - Aankomende zorg op het staldashboard

Type: UITBREIDING

---

## Wat de klant mist

Het paardenprofiel slaat al een volgende datum op voor vaccinaties en ontworming
(de velden nextDate in Vaccination en Deworming). Die data worden nu alleen
getoond op het individuele paardenprofiel. Je moet per paard klikken om te zien
of er iets nadert.

Een staleigenaar met 20 paarden moet twintig profielpaginas bezoeken om te weten
of er deze week iets verlopen is. Dat doet niemand. Vaccinatie-deadlines worden
vergeten, wat leidt tot boetes (verplichte griepvaccinatie KNHS) of
gezondheidsrisicos voor de paarden.

Er is geen overzicht op stalniveau dat aankomende of verlopen gezondheidsacties
toont.

---

## Waarom waardevol voor de doelgroep (pensionstallen)

Pensionstallen hebben een zorgplicht voor alle paarden in pension. Eigenaren
verwachten dat de stal tijdig signaleert wanneer een vaccinatie of ontworming op
de planning staat. Als dat misgaat is de stal aansprakelijk.

Businessplan-aansluiting:
- Gezondheid staat als MVP-onderdeel benoemd in het businessplan.
- Gebruiksgemak is een van de vijf genoemde succesfactoren: waarde tonen zonder
  extra navigatie is de kern van gebruiksgemak.
- Het businessplan noemt concurrenten (Stalmanager, EquineM) die signalerings-
  functies bieden; zonder dit mist Velaro een basisfunctie die de markt verwacht.
- CLAUDE.md bouwvolgorde stap 3 (gezondheidsregistratie) is gebouwd; dit is de
  logische vervolgstap die de gezondheidsdata bruikbaar maakt op stalniveau.

---

## Wat gebouwd moet worden

Scope: een nieuwe query, een nieuwe server component, en een sectie op de
bestaande staldashboard-pagina. Geen schema-wijziging, geen nieuwe routes.

### 1. Query toevoegen in src/features/gezondheid/queries.ts

Nieuwe exportfunctie getAankomendGezondheidActies(stableId: string, dagenVooruit = 30):

- Haalt alle Vaccination-rijen op waarvan nextDate <= vandaag + 30 dagen
  EN horse.stableId == stableId, met include horse (id, name).
- Haalt alle Deworming-rijen op met dezelfde filter.
- Combineert de twee lijsten in een uniform type Actie:
    id, horseId, horseName, type (vaccinatie/ontworming), omschrijving,
    nextDate en isVerlopen (nextDate < vandaag 00:00).
- Sorteert op nextDate oplopend. Rijen zonder nextDate worden overgeslagen.

### 2. Server component src/features/gezondheid/AankomendZorgPanel.tsx

Props: acties (retourtype van de nieuwe query).

Rendert een div className="panel":
- Panel-header "Aankomende zorg". Als er verlopen items zijn, een rode
  badge naast de titel met het aantal verlopen items.
- Lege staat (acties.length === 0): tekst "Alle gezondheidsacties zijn
  bijgewerkt." in muted stijl, geen leeg blok.
- Per actie een rij met:
  - Datumbadge: verlopen items badge-warning met "Verlopen", aankomende
    items badge-neutral met de datum via formatDatum uit paardHelpers.
  - Paard-naam als Link naar /paarden/{horseId}.
  - Type-label: "Vaccinatie" of "Ontworming" plus de omschrijving.

### 3. Integratie in src/app/(app)/stal/page.tsx

Voeg getAankomendGezondheidActies toe aan de bestaande Promise.all:

    const [horses, role, takenVandaag, zorgActies] = await Promise.all([
      getHorsesForStable(stable.id),
      getStableRole(user.id, stable.id),
      getTaskCountsForDate(stable.id, today),
      getAankomendGezondheidActies(stable.id, 30),
    ])

Voeg AankomendZorgPanel toe na de quick-actions, voor de stalbewoners-tabel,
alleen zichtbaar voor OWNER en STAFF (role !== null).

### 4. Extra KPI-kaart (aanbevolen)

In de kpi-row: een kaart die het aantal verlopen acties toont wanneer dat groter
dan 0 is, anders het totaal aankomend binnen 30 dagen. Bij verlopen items kleurt
het icoontje met de warning-kleur om direct aandacht te trekken.

---

## Acceptatiecriteria

1. Een staleigenaar of medewerker ziet op /stal een paneel "Aankomende zorg"
   met alle vaccinaties en ontwormingen waarvan nextDate binnen 30 dagen valt
   of al verstreken is, gesorteerd van vroegst naar latest.
2. Verlopen acties (nextDate < vandaag) zijn visueel onderscheiden: badge-warning
   met tekst "Verlopen" in plaats van een datumbadge.
3. Elke actie-rij bevat een klikbare link naar het paardenprofiel.
4. Als er geen acties binnen 30 dagen zijn toont het paneel de lege staat
   "Alle gezondheidsacties zijn bijgewerkt." in plaats van een leeg blok.
5. Paardeneigenaren zonder stalbeheerrol (role === null) zien het paneel niet.
6. Geen nieuwe Prisma-migratie nodig: alle gebruikte velden (nextDate, horseId,
   type, product) bestaan al in de database.
7. De query filtert op stableId via de horse-relatie zodat acties van andere
   stallen nooit zichtbaar zijn.
