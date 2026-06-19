---
issue: 61
title: "[Lease 02] Autorisatie: leaser-rol & toegang eigen geleased paard"
status: "Done"
labels: ["lease"]
url: "https://github.com/MiniMaxi-user/velaro/issues/61"
archivedAt: 2026-06-19
---

# #61 — [Lease 02] Autorisatie: leaser-rol & toegang eigen geleased paard

Onderdeel van epic #59. Gereviewd met de huidige app-context en de visie uit `velaro-leasemodule.md`.

**Doel:** een leaser (gekoppeld via een actieve `Lease`) krijgt â€” net als een paardeneigenaar â€” **lees**toegang tot het profiel van zijn/haar geleasede paard.

## Scope (autorisatie)
- `canViewHorse(userId, horseId)` in `src/lib/auth/authorization.ts` wordt ook `true` bij een **actieve** `Lease` (status `ACTIEF`).
- Nieuwe helper `getLeaseForHorse(userId, horseId)` zodat de UI weet of iemand leaser is.
- Leaser krijgt **geen** `canEdit` (geen stalbeheer); valt in de bestaande `canEdit === false`-tak van de paard-detailpagina.

## UI & plaatsing
- **Leaser-dashboard:** leaser zonder stallidmaatschap volgt `EIGENAAR_LINKS` (`NavLinks.tsx`) en landt op `/eigenaar`. Onder *"Mijn paarden"* verschijnen Ã³Ã³k geleasede paarden, met een goud **`badge badge-gold` "Lease"** naast de reeds bestaande kaarten, zodat onderscheid eigen vs. geleased meteen zichtbaar is. Bovenaan de sectie een subkop "In lease" als de gebruiker zowel eigen als geleasede paarden heeft.
- **Paard-detailpagina** (`paarden/[id]/page.tsx`): leaser krijgt de bestaande read-only weergave (`detail-layout`, geen tabstrip). In de `detail-header` `detail-meta` komt een extra `badge badge-gold` **"In lease â€” {leaseType-label}"**. Zichtbaar voor de leaser: Algemeen, Gezondheid, Voederschema, Berichten. **Niet** zichtbaar: Eigenaren-paneel, verwijder/bewerk-acties.
- Geen toegang tot `/stal`, `/paarden` (lijst van de hele stal) of andere paarden â€” alleen het eigen geleasede paard via directe link/dashboard.

## UX-richtlijnen
- EÃ©n heldere visuele code: goud = lease. Consistent op kaart Ã©n detail.
- Leaser mag nooit "lege" beheerknoppen zien die toch niets doen â€” server-side afschermen, niet alleen verbergen.

## Acceptatie
- Ingelogde leaser ziet uitsluitend het/de geleasede paard(en); geen stalbeheer.
- Lease-badge zichtbaar op dashboard-kaart Ã©n detail-header.
- Niet-leasers zien niets extra's; autorisatie afgedwongen op de server.

**Afhankelijkheden:** Lease 01. **Size:** M
