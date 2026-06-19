---
issue: 69
title: "[Lease 10] Mijlpaal-/notificatiemotor (opzeg/verleng/proef + herinneringen)"
status: "Done"
labels: ["lease"]
url: "https://github.com/MiniMaxi-user/velaro/issues/69"
archivedAt: 2026-06-19
---

# #69 — [Lease 10] Mijlpaal-/notificatiemotor (opzeg/verleng/proef + herinneringen)

Onderdeel van epic #59. Gereviewd met de huidige app-context en de visie uit `velaro-leasemodule.md`.

**Doel:** automatische alerts rond de lease-levenscyclus â€” voor retentie en om deadlines niet te missen.

## UI & plaatsing
- **Topbar `NotificationBell`:** lease-mijlpalen verschijnen in de bestaande bel-dropdown, naast berichten â€” elk item met een type-icoon en korte tekst: *einde proefperiode*, *einddatum/minimumduur nadert*, *opzegtermijn-deadline*, *stilzwijgende verlenging*, en paardgebonden herinneringen (vaccinatie/hoefsmit) voor de leaser. Klik â†’ relevante pagina (lease/paard).
- **Dashboard-paneel "Aandachtspunten":** op het leaser- Ã©n eigenaar-dashboard een paneel in de geest van het bestaande `AankomendZorgPanel` met de eerstvolgende lease-mijlpalen (datum + actie), gesorteerd op urgentie. Verstreken/urgente items in `badge-warning`.
- **Gelezen-status:** items markeerbaar als gelezen volgens het bestaande `MessageRead`-patroon; de bel-teller daalt mee.
- Mijlpalen worden afgeleid uit `Lease`-velden (`trialEndsAt`, `endDate`, `noticePeriodDays`, `minimumTermMonths`) â€” server-side berekend, geen `localStorage`.

## UX-richtlijnen
- Tijdig en niet-spammerig: Ã©Ã©n melding per mijlpaal, gegroepeerd.
- Urgentie zichtbaar via kleur; afgehandelde items verdwijnen netjes.

## Acceptatie
- Relevante partij krijgt tijdig een melding per mijlpaal, in bel Ã©n dashboardpaneel.
- Meldingen zijn markeerbaar als gelezen; teller klopt.

**Afhankelijkheden:** Lease 06. **Size:** M
