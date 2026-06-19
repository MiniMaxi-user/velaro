---
issue: 63
title: "[Lease 04] Marktplaats: overzicht, filters & matching-score"
status: "Done"
labels: ["lease"]
url: "https://github.com/MiniMaxi-user/velaro/issues/63"
archivedAt: 2026-06-19
---

# #63 — [Lease 04] Marktplaats: overzicht, filters & matching-score

Onderdeel van epic #59. Gereviewd met de huidige app-context en de visie uit `velaro-leasemodule.md`.

**Doel:** een **marktplaats** met alle actieve lease-listings â€” over stallen heen (open-platform-visie) â€” met filters en een eenvoudige matching-score (zoals HorseDeal).

## UI & plaatsing
- **Nieuwe top-level route `/lease`**, bereikbaar via het nieuwe sidebar-item **"Lease"** (stalleden) / **"Marktplaats"** (leasers). `page-header` met `breadcrumb` (Dashboard â€º Lease-marktplaats) en `page-title` "Lease-marktplaats".
- **Filterbalk** bovenaan met de bestaande `filter-bar`-klasse: selects/chips voor Leasetype, Discipline, Niveau, Dagen/week, Regio, Prijsrange (minâ€“max) en een toggle "Mag verplaatst worden". Filters server-side via querystring (zoals taken-datumnavigatie).
- **Resultaten als kaart-grid** (responsive, hergebruik kaartstijl van paarden/kpi): per listing een kaart met paardfoto (of placeholder), paardnaam, `badge` leasetype, **prijs/maand** prominent, regio, en rechtsboven een goud `badge-gold` **match-score** ("92% match") wanneer de gebruiker filtervoorkeuren heeft ingevuld. Klik â†’ listingdetail.
- **`empty-state`** als geen enkele listing matcht ("Geen aanbod gevonden â€” pas je filters aan").
- Optioneel een `kpi-row` bovenaan: aantal actieve listings, gemiddelde prijs.
- **Listingdetail `/lease/[listingId]`:** hero met grote foto + `detail-header` (paardnaam, leasetype-badge, prijs), `detail-fields` met alle kenmerken, een (beperkt) blok "Over dit paard" (ras/leeftijd/discipline uit het profiel, gÃ©Ã©n privÃ©gegevens), en een prominente `btn-primary` **"Interesse tonen"** (â†’ Lease 05).

## Matching-score
- Geen ML: gewogen criteria-match (discipline, dagen/week, regio, prijs binnen budget, leasetype) â†’ percentage. Sorteer aflopend op score wanneer voorkeuren bekend zijn, anders op recentheid.

## UX-richtlijnen
- Kaarten moeten ademen: max. ~6 datapunten per kaart, prijs en leasetype direct leesbaar.
- Filters mogen het overzicht niet wegdrukken â€” horizontale `filter-bar`, inklapbaar op smal scherm.
- Score is een hint, geen harde sortering die relevant aanbod verbergt.

## Acceptatie
- Alleen `isActive` listings zichtbaar; filters werken server-side.
- Score-sortering aantoonbaar; lege staat afgehandeld; detailpagina toont "Interesse tonen".

**Afhankelijkheden:** Lease 03. **Size:** L
