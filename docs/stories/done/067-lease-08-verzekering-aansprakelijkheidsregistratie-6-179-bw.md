---
issue: 67
title: "[Lease 08] Verzekering- & aansprakelijkheidsregistratie (6:179 BW)"
status: "Done"
labels: ["lease"]
url: "https://github.com/MiniMaxi-user/velaro/issues/67"
archivedAt: 2026-06-19
---

# #67 — [Lease 08] Verzekering- & aansprakelijkheidsregistratie (6:179 BW)

Onderdeel van epic #59. Gereviewd met de huidige app-context en de visie uit `velaro-leasemodule.md`.

**Doel:** onderscheidend vertrouwens-/veiligheidskenmerk â€” aansprakelijkheid (art. 6:179 BW) en verzekering expliciet vastleggen per lease.

## UI & plaatsing
- **Paneel "Verzekering & aansprakelijkheid"** in de **Lease-tab** / lease-detailpagina.
- **Kernvraag prominent:** een verplichte ja/nee-keuze **"Is de leaser meeverzekerd op de WA/AVP-polis van de eigenaar?"** als opvallende keuzeknoppen bovenaan het paneel.
- **6:179 BW-checklist:** een korte lijst met afvinkbare punten (risico-acceptatie, meeverzekering, dekking ongevallen ruiter) â€” kort en begrijpelijk, met een infotekst die naar het marktonderzoek verwijst (LG MÃ¼nchen I).
- **Polis-uploads:** rijen om polissen toe te voegen (WA/AVP, ongevallen ruiter, ziektekosten-/cascoverzekering paard) â€” bestandsnaam + type + uploaddatum.
- **Waarschuwing:** als "meeverzekerd" = nee of leeg, toon een rode `badge-warning`-banner; de `Lease` kan dan **niet** op status `ACTIEF` worden gezet zonder expliciete risicobevestiging (checkbox "Ik begrijp het risico").

## UX-richtlijnen
- Dit is een trust-feature: rustig maar duidelijk, niet bangmakerig. De waarschuwing is een gate, geen blokkade-zonder-uitweg.
- Polissen zichtbaar voor beide betrokken partijen, niet voor derden.

## Acceptatie
- Lease kan niet "actief" worden zonder beantwoorde meeverzekerd-vraag (of expliciete risicobevestiging).
- Checklist + polis-uploads aanwezig; waarschuwing verschijnt correct.

**Afhankelijkheden:** Lease 06. **Size:** M
