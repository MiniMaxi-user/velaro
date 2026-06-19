---
issue: 41
title: "VERBETERING: Statuskleur op volgende datum in GezondheidTabs"
status: "Done"
labels: []
url: "https://github.com/MiniMaxi-user/velaro/issues/41"
archivedAt: 2026-06-19
---

# #41 — VERBETERING: Statuskleur op volgende datum in GezondheidTabs

# Voorstel 13 - Statuskleur op "Volgende datum" in GezondheidTabs

Type: VERBETERING

---

## Wat de klant mist (als staleigenaar of medewerker)

Op het paardenprofiel toont het Gezondheid-paneel vier tabs: Vaccinaties,
Ontworming, Dierenarts en Hoefsmit. In elke tab staat een kolom "Volgende
datum" (nextDate). Die datum wordt altijd weergegeven in het amber-oranje
`.gezondheid-next`-kleur, ongeacht of de datum nog ver weg is, bijna
aanbreekt of al verstreken is.

Concreet: ik zie in de tabel van Storm:
- Vaccinatie Griep â€” volgende datum: 14 jan 2026 (al 5 maanden verlopen) â†’ oranje
- Ontworming â€” volgende datum: 15 aug 2026 (over 2 maanden) â†’ zelfde oranje
- Hoefsmit â€” volgende datum: 3 sep 2026 (ver weg) â†’ zelfde oranje

Alle drie zien er identiek urgent uit. Als staleigenaar weet ik niet in een
oogopslag welke datums daadwerkelijk aandacht vereisen. Ik moet elke datum
zelf mentaal vergelijken met de kalender.

Het dashboard-panel "Aankomende zorg" doet dit onderscheid wÃ©l goed (badge
"Verlopen" vs. badge met datum), maar zodra ik doorklik naar het profiel zelf
is dat onderscheid verdwenen.

---

## Waarom waardevol (businesswaarde)

Het paardenprofiel is het centrale object in Velaro. De gezondheidsregistratie
is een van de drie kern-features waarmee Velaro zich onderscheidt van een
Excel-spreadsheet.

Businessplan-aansluitingspunten:

- Gebruiksgemak is een van de vijf succesfactoren in het businessplan. Een
  statusindicator die altijd oranje is, geeft de gebruiker geen bruikbaar
  signaal â€” dat is het tegenovergestelde van gebruiksgemak.
- Pensionstallen (beachhead-doelgroep) beheren tientallen paarden tegelijk.
  Een staleigenaar die in Ã©Ã©n oogopslag ziet welke datums verlopen zijn, kan
  snel handelen en maakt minder fouten. Dit is een dagelijks voordeel.
- Consistentie met het dashboard-panel: het AankomendZorgPanel op /stal
  onderscheidt al "Verlopen" (amber badge) vs. "Aankomend" (neutrale badge).
  De gezondheidstabel op het profiel moet hetzelfde doen om de informatie
  coherent te laten zijn.
- Mobiele ervaring (succesfactor): kleurcodering werkt op elk schermformaat
  en vermindert de cognitieve belasting â€” de gebruiker hoeft geen mentale
  datum-vergelijking te maken.

---

## Wat gebouwd moet worden (technisch)

Scope: Ã©Ã©n component (GezondheidTabs.tsx) en Ã©Ã©n kleine CSS-uitbreiding.
Geen schema-wijziging, geen server action, geen nieuwe routes.

### 1. Helper-functie voor datumstatus

In `src/features/gezondheid/GezondheidTabs.tsx` (client component, dus
JavaScript-datumvergelijking is toegestaan), voeg boven de component toe:

    type DatumStatus = 'verlopen' | 'spoedig' | 'ok'

    function getDatumStatus(nextDate: Date | null): DatumStatus | null {
      if (!nextDate) return null
      const vandaag = new Date()
      vandaag.setHours(0, 0, 0, 0)
      const grens = new Date(vandaag)
      grens.setDate(grens.getDate() + 30)
      if (nextDate < vandaag) return 'verlopen'
      if (nextDate <= grens) return 'spoedig'
      return 'ok'
    }

Definitie van de drempelwaarden:
- verlopen: nextDate ligt vÃ³Ã³r vandaag
- spoedig: nextDate ligt binnen 30 dagen (consistent met het dashboard-panel
  dat ook 30 dagen als horizon gebruikt in getAankomendGezondheidActies)
- ok: nextDate ligt meer dan 30 dagen in de toekomst

### 2. Vervang `.gezondheid-next` door een statusbadge

Huidige code in alle drie tabs (vaccinaties, ontworming, hoefsmit), telkens:

    {v.nextDate
      ? <span className="gezondheid-next">{formatDatum(new Date(v.nextDate))}</span>
      : <span className="gezondheid-tabel__muted">â€”</span>}

Vervangen door (voorbeeld voor vaccinaties, analoog voor ontworming en hoefsmit):

    {v.nextDate
      ? (() => {
          const status = getDatumStatus(new Date(v.nextDate))
          return (
            <span className={`gezondheid-datum gezondheid-datum--${status}`}>
              {formatDatum(new Date(v.nextDate))}
            </span>
          )
        })()
      : <span className="gezondheid-tabel__muted">â€”</span>}

Of cleaner via een inline helper component bovenin het bestand:

    function DatumBadge({ date }: { date: Date | null }) {
      if (!date) return <span className="gezondheid-tabel__muted">â€”</span>
      const status = getDatumStatus(date)
      return (
        <span className={`gezondheid-datum gezondheid-datum--${status}`}>
          {formatDatum(date)}
        </span>
      )
    }

Gebruik dan overal: <DatumBadge date={v.nextDate ? new Date(v.nextDate) : null} />

### 3. CSS-klassen toevoegen in src/styles/globals.css

Vervang of breid `.gezondheid-next` uit (huidige regel ~1730):

    /* Volgende datum in gezondheidsoverzicht â€” statuskleur */
    .gezondheid-datum {
      font-size: 12px;
      font-weight: 500;
    }
    .gezondheid-datum--verlopen {
      color: var(--velaro-color-danger);
    }
    .gezondheid-datum--spoedig {
      color: var(--velaro-color-warning);
    }
    .gezondheid-datum--ok {
      color: var(--velaro-color-success);
    }

De bestaande `.gezondheid-next`-klasse kan worden verwijderd als er geen
andere verwijzingen naar bestaan (Grep bevestigt: uitsluitend in
GezondheidTabs.tsx en globals.css).

### Bestanden die wijzigen

- src/features/gezondheid/GezondheidTabs.tsx â€” getDatumStatus helper +
  DatumBadge component + drie plaatsen waar de datum wordt getoond
- src/styles/globals.css â€” drie .gezondheid-datum--* klassen toevoegen,
  .gezondheid-next verwijderen of houden als fallback

### Geen wijzigingen nodig in

- prisma/schema.prisma
- src/features/gezondheid/queries.ts
- AankomendZorgPanel.tsx
- Alle andere routes en componenten

---

## Inschatting omvang

Klein.

- Geen database-impact.
- EÃ©n component uitbreiden met een twee-regels helper.
- Drie identieke render-plaatsen aanpassen (vaccinaties, ontworming, hoefsmit).
- Twee CSS-klassen toevoegen.
- Totaal: circa 20-25 regels code wijzigen.

---

## Acceptatiecriteria

1. Op het paardenprofiel toont de kolom "Volgende datum" in de tabs
   Vaccinaties, Ontworming en Hoefsmit de datum in rood wanneer de datum
   verstreken is (nextDate < vandaag).
2. De datum verschijnt in amber/oranje wanneer nextDate binnen 30 dagen valt
   (0 t/m 29 dagen vanaf vandaag).
3. De datum verschijnt in groen wanneer nextDate meer dan 30 dagen weg is.
4. Wanneer geen nextDate is ingevuld, blijft het streepje (â€”) zichtbaar in
   de muted kleur.
5. De kleurlogica is consistent met het AankomendZorgPanel op het
   staldashboard, dat dezelfde 30-dagen horizon gebruikt.
6. Geen Prisma-migratie nodig.
7. De Dierenarts-tab is niet geraakt: VetVisit heeft geen nextDate-veld en
   toont deze kolom niet.
