---
issue: 68
title: "[Lease 09] Gedeelde beschikbaarheidskalender (deellease)"
status: "Done"
labels: ["lease"]
url: "https://github.com/MiniMaxi-user/velaro/issues/68"
archivedAt: 2026-06-19
---

# #68 — [Lease 09] Gedeelde beschikbaarheidskalender (deellease)

Onderdeel van epic #59. Gereviewd met de huidige app-context en de visie uit `velaro-leasemodule.md`.

**Doel:** bij deellease/gedeeld gebruik voorkomen dat partijen tegelijk willen rijden â€” wie rijdt welke dag.

## UI & plaatsing
- **Paneel "Beschikbaarheid"** in de **Lease-tab** (zichtbaar voor eigenaar Ã©n leaser van het paard).
- **Weekrooster:** een grid van **dagen (maâ€“zo) Ã— dagdelen (ochtend/middag/avond)**; cellen tonen geclaimde blokken, gekleurd **per persoon** met een legenda eronder. Standaard weergave = huidige week, met week-vooruit/terug-navigatie (zelfde patroon als de taken-datumnavigatie).
- **Claimen:** klik op een vrije cel â†’ bevestigen â†’ de cel kleurt met de naam. Afgeleid van het weekschema uit het contract (dagen/week, exclusief vs. gedeeld) zodat een leaser niet mÃ©Ã©r dagdelen kan claimen dan afgesproken.
- **Conflictpreventie:** een al-geclaimde cel is niet opnieuw claimbaar; poging toont een korte melding ("Dit dagdeel is al bezet").
- Eigenaar ziet alle claims van het paard in Ã©Ã©n overzicht.

## UX-richtlijnen
- Kleurcodering + legenda maken in Ã©Ã©n blik duidelijk wie wanneer rijdt.
- Conflict wordt vÃ³Ã³raf voorkomen, niet achteraf gemeld.
- Mobiel: rooster horizontaal scrollbaar, niet ingedikt tot onleesbaar.

## Acceptatie
- Leaser ziet en claimt beschikbare dagdelen binnen de contractlimiet; dubbele claims worden voorkomen.
- Eigenaar houdt overzicht over alle claims.

**Afhankelijkheden:** Lease 02, Lease 06. **Size:** L
