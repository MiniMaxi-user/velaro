---
issue: 4
title: "Voorstel 5 - Taken: direct naar datum springen"
status: "Done"
labels: []
url: "https://github.com/MiniMaxi-user/velaro/issues/4"
archivedAt: 2026-06-19
---

# #4 — Voorstel 5 - Taken: direct naar datum springen

# Voorstel 5 - Taken: direct naar datum springen

Type: VERBETERING

---

## Wat de klant mist

Op de takenpagina (/stal/taken) navigeer je uitsluitend via twee pijlknoppen: een dag
terug of een dag vooruit. Om van maandag naar vrijdag te gaan zijn vier klikken nodig.
Om een taak van volgende week terug te vinden zijn zeven klikken nodig. Er is geen
manier om direct een datum in te typen of te kiezen.

In de praktijk:
- Een medewerker wil controleren wat er voor komend weekend gepland staat. Hij moet
  per dag klikken, kan de datum niet in een keer invoeren.
- Een staleigenaar wil een taak plannen voor een specifieke datum over twee weken en
  navigeert noodgedwongen minutenlang door de interface.
- Een verkeerde datum in het URL-veld handmatig aanpassen werkt, maar dat is geen
  gebruiksvriendelijke oplossing.

---

## Waarom waardevol voor de doelgroep (pensionstallen)

Pensionstallen plannen taken cyclisch: hoefsmid elke zes weken, ontworming elk kwartaal,
trainingsschema per week. Medewerkers willen snel de juiste dag openen zonder telwerk.
De datumnavigatie is de primaire interactie op de drukst bezochte pagina van de app.
Elke extra klik vermindert de adoptie op de werkvloer.

Businessplan-aansluiting:
- "Gebruiksgemak" is een van de vijf genoemde succesfactoren in het businessplan.
- "Mobiele ervaring" staat eveneens als succesfactor: op mobiel is dag-voor-dag klikken
  extra omslachtig; een native datuminvoer (<input type="date">) is op mobiel optimaal
  omdat het het OS-datumpicker activeert.
- Bouwvolgorde stap 4 (taken/planning) is gebouwd; dit maakt die stap daadwerkelijk
  volledig bruikbaar in dagelijks gebruik.

---

## Wat gebouwd moet worden

Scope: uitbreiding van de bestaande takenpagina-navigatie. Geen nieuwe routes, geen
nieuwe server actions, geen schemawijziging.

### 1. Datuminput toevoegen in src/app/(app)/stal/taken/page.tsx

Voeg tussen de bestaande pijlknoppen een `<input type="date">` toe die:
- defaultValue krijgt van `toDateParam(date)` (de huidige geselecteerde datum)
- bij `onChange` navigeert naar `/stal/taken?datum=<gekozen datum>`

Omdat de pagina een Server Component is, moet de input een Client Component zijn.
Maak een klein wrapper component `TaakDatumKiezer`:

Nieuw bestand: `src/features/taken/TaakDatumKiezer.tsx`

```tsx
'use client'

import { useRouter } from 'next/navigation'

export default function TaakDatumKiezer({ value }: { value: string }) {
  const router = useRouter()
  return (
    <input
      type="date"
      className="input taken-datumkiezer"
      value={value}
      onChange={(e) => {
        if (e.target.value) router.push(`/stal/taken?datum=${e.target.value}`)
      }}
    />
  )
}
```

### 2. Navigatiebalk aanpassen in de takenpagina

In de `taken-nav` div de huidige `<span className="taken-nav__dag">` vervangen door
een combinatie van de datumtekst (leesbaar) plus de nieuwe `TaakDatumKiezer`:

```tsx
import TaakDatumKiezer from '@/features/taken/TaakDatumKiezer'

// In de taken-nav div:
<div className="taken-nav__datum">
  <span className="taken-nav__dag">{formatDate(date)}</span>
  {isToday && <span className="leden-badge leden-badge--owner">vandaag</span>}
  <TaakDatumKiezer value={toDateParam(date)} />
</div>
```

### 3. CSS toevoegen in src/styles/globals.css

```css
.taken-datumkiezer {
  font-size: 0.8rem;
  padding: 4px 8px;
  width: auto;
  color: var(--velaro-color-muted);
  border-color: var(--velaro-color-border);
  margin-top: 4px;
}
```

---

## Acceptatiecriteria

1. Op de takenpagina staat in de datumnavigatie een datumveld. Bij het kiezen van een
   datum via het veld navigeert de pagina direct naar die datum zonder extra klikken.
2. Op mobiel activeert het datumveld het native OS-datumpicker.
3. De pijlknoppen voor dag terug en dag vooruit werken nog steeds.
4. Het "vandaag"-label verschijnt alleen als de geselecteerde datum gelijk is aan vandaag.
5. Geen nieuwe Prisma-migratie nodig.
6. Geen nieuwe API-routes of server actions nodig.
