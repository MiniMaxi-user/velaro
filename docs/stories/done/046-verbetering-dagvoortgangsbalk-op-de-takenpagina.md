---
issue: 46
title: "VERBETERING: Dagvoortgangsbalk op de takenpagina"
status: "Done"
labels: []
url: "https://github.com/MiniMaxi-user/velaro/issues/46"
archivedAt: 2026-06-19
---

# #46 — VERBETERING: Dagvoortgangsbalk op de takenpagina

# Voorstel 15 - Dagvoortgangsbalk op de takenpagina

Type: VERBETERING

---

## Wat de klant mist (als staleigenaar of medewerker)

Op /stal/taken zie ik boven de takenlijst de datumnavigatie en daarna twee
secties: "Openstaand â€” N" en "Gedaan â€” N". Ik weet dus hoeveel taken er open
staan en hoeveel er gedaan zijn, maar ik zie nergens hoe ver de dag als geheel
gevorderd is.

Op het staldashboard (/stal) staat een KPI-kaart "Taken afgerond" met
"X/Y" en een percentage zoals "75% voltooid". Zodra ik doorklik naar de
takenpagina, is dat samenvattende signaal volledig verdwenen. Ik moet mentaal
"Openstaand â€” 3" en "Gedaan â€” 9" optellen en delen om te beseffen dat ik op
75% zit.

Concreet scenario: het is 16:00 en een medewerker wil aan het einde van zijn
dienst controleren of alles gedaan is. Hij opent /stal/taken en ziet twee
secties. Hij moet zelf tellen. Een voortgangsbalk of percentage direct onder
de datumnavigatie geeft in een oogopslag: "9 van 12 taken gedaan â€” 75%".

---

## Waarom waardevol (businesswaarde)

Businessplan-aansluitingspunten:

- Gebruiksgemak is een van de vijf succesfactoren in het businessplan. Een
  voortgangsindicator is het verschil tussen een lijstje en een planningstool:
  de medewerker ziet direct of hij op schema ligt zonder zelf te tellen.
- Planning staat als MVP-onderdeel 2 in het businessplan. Planning impliceert
  inzicht in voortgang, niet alleen registratie van taken.
- Mobiele ervaring als succesfactor: een balk is op elk schermformaat direct
  leesbaar. Op mobiel, midden in de stal, is een balk sneller te lezen dan
  twee losse tellers.
- Consistentie met het dashboard: het staldashboard toont al een percentage
  op de KPI-kaart "Taken afgerond". De takenpagina zelf â€” het meest gebruikte
  scherm voor dagelijkse taakopvolging â€” zou hetzelfde signaal moeten geven.
  Nu verdwijnt het signaal juist op de pagina waar het het meest relevant is.

---

## Wat gebouwd moet worden (technisch)

Scope: server component logica aanpassen (bestaande data hergebruiken) plus
een nieuwe CSS-klasse. Geen nieuwe queries, geen schemawijziging, geen nieuwe
routes.

### 1. Voortgangsberekening in src/app/(app)/stal/taken/page.tsx

In de specifieke-stal-modus zijn tasks, openTasks en doneTasks al beschikbaar.
Voeg de volgende berekening toe direct voor de return-statement:

    const totaalTaken = tasks.length
    const gedaanTaken = doneTasks.length
    const voortgangPct = totaalTaken > 0
      ? Math.round((gedaanTaken / totaalTaken) * 100)
      : null

In de alle-stallen-modus zijn allTasks, open en done al beschikbaar. Voeg
analoog toe:

    const totaalTaken = allTasks.length
    const gedaanTaken = done.length
    const voortgangPct = totaalTaken > 0
      ? Math.round((gedaanTaken / totaalTaken) * 100)
      : null

### 2. Voortgangsbalk renderen in de JSX

Voeg de balk in direct na de .taken-nav-div en voor de TaakForm (specifieke
modus) of voor het lege-state-blok (beide modi). De balk is alleen zichtbaar
als totaalTaken > 0:

    {voortgangPct !== null && (
      <div className="taken-voortgang">
        <div className="taken-voortgang__balk">
          <div
            className="taken-voortgang__vulling"
            style={{ width: `${voortgangPct}%` }}
          />
        </div>
        <span className="taken-voortgang__label">
          {gedaanTaken}/{totaalTaken} gedaan
          {voortgangPct === 100
            ? ' â€” alles afgerond'
            : ` â€” ${voortgangPct}%`}
        </span>
      </div>
    )}

Wanneer voortgangPct === 100 toont het label "N/N gedaan â€” alles afgerond"
met een groene kleur (zie CSS hieronder), zodat de medewerker direct weet
dat zijn dienst compleet is.

### 3. CSS-klassen toevoegen in src/styles/globals.css

Voeg toe na de .taken-nav-blok (na regel ~1812):

    .taken-voortgang {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: var(--velaro-space-4);
    }

    .taken-voortgang__balk {
      flex: 1;
      height: 6px;
      background: var(--velaro-color-surf-2);
      border-radius: 9999px;
      overflow: hidden;
      border: 1px solid var(--velaro-color-border);
    }

    .taken-voortgang__vulling {
      height: 100%;
      background: var(--velaro-color-gold);
      border-radius: 9999px;
      transition: width 0.3s ease;
    }

    .taken-voortgang__vulling--compleet {
      background: var(--velaro-color-success);
    }

    .taken-voortgang__label {
      font-size: var(--velaro-text-sm);
      color: var(--velaro-color-muted);
      white-space: nowrap;
      min-width: 140px;
      text-align: right;
    }

De vulling kleurt goud tijdens de dag en groen zodra alle taken af zijn.
Voeg de --compleet modifier toe in de JSX wanneer voortgangPct === 100:

    className={`taken-voortgang__vulling${voortgangPct === 100 ? ' taken-voortgang__vulling--compleet' : ''}`}

### Bestanden die wijzigen

- src/app/(app)/stal/taken/page.tsx â€” voortgangsberekening toevoegen (3 regels
  per modus) en de balk-JSX renderen op twee plaatsen (specifieke stal en alle
  stallen, circa 12 regels per modus)
- src/styles/globals.css â€” vijf nieuwe CSS-klassen toevoegen (circa 25 regels)

### Geen wijzigingen nodig in

- prisma/schema.prisma
- src/features/taken/queries.ts (bestaande data volstaat)
- src/features/taken/TaakItem.tsx
- src/features/taken/TaakForm.tsx
- TerugkerendeTakenBeheer.tsx
- Alle andere routes en componenten

---

## Inschatting omvang

Klein.

- Geen database-impact (geen migratie).
- Bestaande task-arrays hergebruiken; geen nieuwe query.
- Twee plaatsen in page.tsx aanpassen (specifieke stal + alle stallen).
- Vijf CSS-klassen toevoegen.
- Totaal: circa 40-50 regels code wijzigen/toevoegen.

---

## Acceptatiecriteria

1. Op /stal/taken verschijnt direct onder de datumnavigatie een horizontale
   balk die de verhouding gedane taken / totaal taken visualiseert.
2. Naast de balk staat een tekst "X/Y gedaan â€” Z%" die het percentage weergeeft.
3. De balk is goud van kleur zolang er nog openstaande taken zijn.
4. Wanneer alle taken afgevinkt zijn (100%), kleurt de balk groen en verandert
   het label naar "N/N gedaan â€” alles afgerond".
5. Wanneer er geen taken zijn voor de geselecteerde dag (lege staat), is de
   balk niet zichtbaar. De lege-staat-melding blijft intact.
6. In de alle-stallen-modus werkt de balk identiek op basis van het totaal
   van alle stallen samen.
7. Geen Prisma-migratie nodig.
8. Na het afvinken van een taak (TaakItem-toggle) herlaadt de pagina
   (revalidatePath) en toont de balk de bijgewerkte voortgang.
