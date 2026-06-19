---
issue: 48
title: "VERBETERING: Urgentiesignalering op gezondheidstabs in paardenprofiel"
status: "Done"
labels: []
url: "https://github.com/MiniMaxi-user/velaro/issues/48"
archivedAt: 2026-06-19
---

# #48 — VERBETERING: Urgentiesignalering op gezondheidstabs in paardenprofiel

# Voorstel 17
Type: VERBETERING

---

## Wat de klant mist

Op het paardenprofiel (/paarden/[id]) staan vier tabbladen: Vaccinaties,
Ontworming, Dierenarts en Hoefsmit. In de kolom Volgende datum staat een
datum in lichtoranje (gezondheid-next). Die kleur is altijd gelijk, of de
datum nu volgende maand valt of zes maanden geleden al verlopen is.
Als ik het profiel van een paard open, zie ik geen enkel signaal dat
een vaccinatie al verlopen was. De datum staat er gewoon als tekst. Ik
moet zelf weten wanneer vandaag is en de datum vergelijken. Op een drukke
dag in de stal doe ik dat niet.

Op het staldashboard doet Velaro het al goed: het AankomendZorgPanel toont
een Verlopen-badge in amber. Maar zodra ik doorklik naar het paardenprofiel
verdwijnt dat signaal. Ik zie alleen een tabel met datumtekst in een kleur.

Concreet scenario: een medewerker controleert het profiel van een nieuw
pensionpaard. Het tabblad Vaccinaties staat open. De nextDate van de
griepvaccinatie is twee maanden geleden verlopen. De medewerker ziet een
datum in lichtoranje - dat lijkt gewoon een normale geplande datum. Hij
sluit het profiel zonder actie te ondernemen.

Een tweede scenario: een staleigenaar heeft een hoefsmitbezoek over drie
dagen staan. Nu ziet hij dat nergens op het profiel zelf; hij zou het
alleen zien als hij toevallig op de stalpagina kijkt naar
AankomendZorgPanel.

---

## Waarom waardevol (businesswaarde)

Businessplan-aansluitingspunten:

- Gebruiksgemak is een van de vijf succesfactoren in het businessplan.
  Een staleigenaar die in een oogopslag ziet welke actie dringend is,
  heeft minder kans dat hij Velaro afdoet als een handige lijst en
  terugvalt op Excel of WhatsApp-herinneringen.
- Centraal paardenprofiel is MVP-onderdeel 1. Het profiel is de kern van
  Velaro. Als het profiel niet toont wat urgent is, mist de kern van het
  product zijn functie als betrouwbare bron van waarheid.
- Gezondheidsregistratie is bouwvolgordestap 3 (CLAUDE.md) en al volledig
  gebouwd. Deze verbetering haalt meer waarde uit dat al gerealiseerde
  fundament zonder nieuw datamodel of nieuwe routes.
- Differentiatie: het AankomendZorgPanel op het dashboard is al een sterk
  punt ten opzichte van Stalmanager en EquineM. Die consistentie doortrekken
  naar het paardenprofiel maakt het verhaal compleet: verlopen acties zijn
  altijd zichtbaar, ongeacht waar de staleigenaar kijkt.

---
## Wat gebouwd moet worden (technisch)

Scope: een client component aanpassen (GezondheidTabs.tsx) en CSS-klassen
uitbreiden. Geen schema-wijziging, geen nieuwe queries, geen nieuwe routes.

### 1. Datumclassificatie-helper in GezondheidTabs.tsx

Voeg bovenin de component (buiten de functie) twee helpers toe:

    const BIJNA_VERLOPEN_DAGEN = 14

    function datumStatus(nextDate: Date | null) {
      if (!nextDate) return "leeg"
      const vandaag = new Date()
      vandaag.setHours(0, 0, 0, 0)
      const grens = new Date(vandaag)
      grens.setDate(grens.getDate() + BIJNA_VERLOPEN_DAGEN)
      if (nextDate < vandaag) return "verlopen"
      if (nextDate <= grens)  return "bijna"
      return "ok"
    }

    function datumCssKlasse(status: ReturnType<typeof datumStatus>): string {
      if (status === "verlopen") return "gezondheid-next gezondheid-next--verlopen"
      if (status === "bijna")    return "gezondheid-next gezondheid-next--bijna"
      if (status === "ok")       return "gezondheid-next gezondheid-next--ok"
      return ""
    }

### 2. Tabbladtellers uitbreiden met urgentie-indicator

Bereken per categorie het aantal urgente items in de component-body,
voor de tabs-array:

    const urgentVaccinaties = vaccinaties.filter(
      (v) => v.nextDate && ["verlopen","bijna"].includes(
        datumStatus(new Date(v.nextDate))
      )
    ).length
    const urgentOntworming = ontwormingen.filter(
      (o) => o.nextDate && ["verlopen","bijna"].includes(
        datumStatus(new Date(o.nextDate))
      )
    ).length
    const urgentHoefsmit = hoefsmitBezoeKen.filter(
      (h) => h.nextDate && ["verlopen","bijna"].includes(
        datumStatus(new Date(h.nextDate))
      )
    ).length

Pas de tabs-array aan zodat ook urgent beschikbaar is:

    const tabs = [
      { id: "vaccinaties", label: "Vaccinaties",
        count: vaccinaties.length,      urgent: urgentVaccinaties },
      { id: "ontworming",  label: "Ontworming",
        count: ontwormingen.length,     urgent: urgentOntworming },
      { id: "dierenarts",  label: "Dierenarts",
        count: bezzoeken.length,        urgent: 0 },
      { id: "hoefsmit",   label: "Hoefsmit",
        count: hoefsmitBezoeKen.length, urgent: urgentHoefsmit },
    ]

Voeg in de tab-knop-render toe na de bestaande count-badge:

    {tab.urgent > 0 && (
      <span className="gezondheid-tab-urgent">{tab.urgent}</span>
    )}

### 3. Datumcellen in de tabellen aanpassen

Vervang in de drie tabbladen met een nextDate-kolom (Vaccinaties, Ontworming,
Hoefsmit) de huidige datumrender.

Huidig patroon (identiek in alle drie):

    {v.nextDate
      ? <span className="gezondheid-next">{formatDatum(new Date(v.nextDate))}</span>
      : <span className="gezondheid-tabel__muted">---</span>}

Nieuw patroon (voorbeeld Vaccinaties, analoog voor Ontworming/Hoefsmit):

    {v.nextDate ? (() => {
      const st = datumStatus(new Date(v.nextDate!))
      return (
        <span className={datumCssKlasse(st)}>
          {st === "verlopen" ? "Verlopen - " : ""}{formatDatum(new Date(v.nextDate!))}
        </span>
      )
    })() : <span className="gezondheid-tabel__muted">---</span>}

Voor Dierenarts is er geen nextDate-kolom; dat tabblad is niet geraakt.

### 4. CSS-klassen uitbreiden in src/styles/globals.css

Voeg toe direct na de huidige .gezondheid-next-definitie (na regel ~1734):

    .gezondheid-next--verlopen {
      color: var(--velaro-color-danger);
      background: var(--velaro-color-danger-bg);
      border: 1px solid var(--velaro-color-danger-border);
      border-radius: var(--velaro-radius-sm);
      padding: 2px 6px;
      font-weight: 600;
    }

    .gezondheid-next--bijna {
      color: var(--velaro-color-warning);
      background: var(--velaro-color-warning-bg);
      border: 1px solid var(--velaro-color-warning-border);
      border-radius: var(--velaro-radius-sm);
      padding: 2px 6px;
      font-weight: 500;
    }

    .gezondheid-next--ok {
      color: var(--velaro-color-success);
      font-size: 12px;
      font-weight: 400;
    }

    .gezondheid-tab-urgent {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 16px;
      height: 16px;
      padding: 0 4px;
      background: var(--velaro-color-danger);
      color: #fff;
      border-radius: 100px;
      font-size: 10px;
      font-weight: 600;
      line-height: 1;
    }

De bestaande .gezondheid-next-klasse blijft als fallback staan; de
modifier-klassen overschrijven hem via de gecombineerde class-naam.

### Bestanden die wijzigen

- src/features/gezondheid/GezondheidTabs.tsx -- helper-functies toevoegen,
  tabs-array uitbreiden, urgentie-berekening, datumcellen aanpassen in drie
  tab-secties (circa 35 regels nieuw of gewijzigd)
- src/styles/globals.css -- vier nieuwe CSS-klassen toevoegen na de huidige
  .gezondheid-next-definitie (circa 28 regels)

### Geen wijzigingen nodig in

- prisma/schema.prisma
- src/features/gezondheid/queries.ts
- src/app/(app)/paarden/[id]/page.tsx (GezondheidTabs ontvangt al alle data)
- src/features/gezondheid/AankomendZorgPanel.tsx (staldashboard ongewijzigd)
- Alle andere routes en componenten

---

## Inschatting omvang

Klein.

- Geen database-impact (geen migratie).
- Geen nieuwe queries of routes.
- Een component aanpassen (GezondheidTabs.tsx), volledig clientside.
- Vier CSS-klassen toevoegen.
- Totaal: circa 63 regels nieuw of gewijzigd, in twee bestanden.

---

## Acceptatiecriteria

1. Op /paarden/[id] toont de Volgende datum-kolom in het tabblad Vaccinaties
   een rood gestileerde badge met tekst Verlopen - datum wanneer de nextDate
   voor vandaag valt.
2. Een nextDate die binnen 14 dagen valt (maar niet verlopen) toont een amber
   gestileerde badge met de datum.
3. Een nextDate die meer dan 14 dagen in de toekomst valt toont de datum in
   groen, neutraal van toon.
4. Hetzelfde onderscheid geldt voor de tabbladen Ontworming en Hoefsmit.
   Het tabblad Dierenarts is niet geraakt.
5. Als een tabblad verlopen of bijna-verlopen items heeft, verschijnt naast
   de bestaande grijze teller een rood bolletje met het aantal urgente items.
   De urgentie is zichtbaar zonder het tabblad te hoeven openen.
6. Als er geen nextDate ingevuld is, toont de cel een em-dash in muted
   kleur. Dat gedrag is ongewijzigd.
7. Geen Prisma-migratie nodig.
8. Het AankomendZorgPanel op het staldashboard is niet geraakt.
9. De paardeneigenaar (canEdit = false) ziet dezelfde datumklassen maar
   geen bewerk- of verwijderknoppen (bestaand gedrag ongewijzigd).
