---
issue: 64
title: "[Lease 05] Communicatie: interesse tonen & in-app contact"
status: "Done"
labels: ["lease"]
url: "https://github.com/MiniMaxi-user/velaro/issues/64"
archivedAt: 2026-06-19
---

# #64 — [Lease 05] Communicatie: interesse tonen & in-app contact

Onderdeel van epic #59. Gereviewd met de huidige app-context en de visie uit `velaro-leasemodule.md`.

**Doel:** een geÃ¯nteresseerde leaser komt laagdrempelig in contact met de aanbieder â€” dÃ© pijn die Marktplaats/Facebook niet oplossen.

## UI & plaatsing
- **Start:** `btn-primary` **"Interesse tonen"** op de listingdetail (`/lease/[listingId]`) opent een compacte composer (paneel/modal in `panel`-stijl) met een korte begeleidende boodschap. Verzenden maakt een 1-op-1 gespreksthread tussen geÃ¯nteresseerde en aanbieder, met de listing als context-kop.
- **Tweepane gesprekkenoverzicht `/berichten`:** links een gesprekkenlijst (avatar/initialen, naam, laatste bericht, ongelezen-stip), rechts de actieve thread met een context-header ("Over: {paardnaam} â€” {leasetype}") en een berichtenstroom + invoerveld onderaan. Hergebruik de visuele taal van `BerichtenPanel`/`BerichtItem`.
- **Topbar:** ongelezen lease-gesprekken tellen mee in de bestaande **`NotificationBell`**; klik leidt naar `/berichten`. Voeg "Berichten" toe aan het topbar/user-menu of als bel-dropdown-item.
- Datamodel: Ã³f voortbouwen op `Message`/`MessageRead` (1-op-1 i.p.v. stal/paard-broadcast) Ã³f een lichte `LeaseInquiry`-thread â€” kies en motiveer in de PR; sluit aan op het bestaande gelezen/ongelezen-patroon.

## UX-richtlijnen
- Eerste contact moet in â‰¤2 kliks kunnen (knop â†’ typen â†’ versturen).
- Thread toont altijd wÃ¡Ã¡r het over gaat (listing-context), zodat een aanbieder met meerdere paarden niet de draad kwijtraakt.
- Duidelijke ongelezen-indicatie op bel Ã©n in de lijst.

## Acceptatie
- Aanbieder ontvangt interesse en kan reageren; beide partijen zien dezelfde thread.
- Ongelezen-teller werkt in de topbar; toegang strikt tot de twee partijen.

**Afhankelijkheden:** Lease 04 + bestaande berichten-infra. **Size:** L
