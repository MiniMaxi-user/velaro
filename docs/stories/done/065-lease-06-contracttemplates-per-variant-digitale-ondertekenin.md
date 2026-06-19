---
issue: 65
title: "[Lease 06] Contracttemplates per variant + digitale ondertekening"
status: "Done"
labels: ["lease"]
url: "https://github.com/MiniMaxi-user/velaro/issues/65"
archivedAt: 2026-06-19
---

# #65 — [Lease 06] Contracttemplates per variant + digitale ondertekening

Onderdeel van epic #59. Gereviewd met de huidige app-context en de visie uit `velaro-leasemodule.md`.

**Doel:** kant-en-klare, aankruisbare contracttemplates per leasevariant met digitale ondertekening. Start met **deellease + full lease** (grootste volume).

## UI & plaatsing
- **Start:** vanuit de **Lease-tab** op de paard-detailpagina (of vanuit een geaccepteerde interesse) een `btn-primary` **"Contract opstellen"** â†’ route `/lease/[leaseId]/contract`.
- **Tweekoloms editor** (zelfde geest als de 70/30-detaillayout): **links** een gesectioneerd formulier/wizard volgens de FNRS-artikelstructuur (zie marktonderzoek Â§4) â€” partijen, paard, duur/proeftijd, gebruiksrecht (dagen/week), disciplines, kostenverdeling, leasevergoeding, aansprakelijkheid, verzekering, opzegging, eerste recht van koop, minderjarigheid; **rechts** een **live documentpreview** die meegroeit terwijl je invult. Aankruisbare opties als checkboxes/selects.
- Bovenaan een opvallende **disclaimer-banner** (`badge-warning`-stijl): "Geen juridisch advies â€” laat contracten juridisch toetsen vÃ³Ã³r gebruik."
- **Ondertekenen:** onderaan handtekeningblokken per partij + `btn-primary` **"Onderteken"**; na ondertekening wordt het document read-only met een `badge` status (grijs "Concept" â†’ groen `badge-success` "Ondertekend") en vastgelegd op de `Lease` (datum + ondertekenaars). Voor minderjarige leaser: extra medeondertekenblok ouder/voogd.
- Het ondertekende contract blijft inzichtelijk als read-only documentweergave vanuit de Lease-tab.

## UX-richtlijnen
- Wizard met voortgangsindicatie; gebruiker ziet door de live preview direct wat het contract wordt.
- Defaults invullen vanuit de `Lease`/listing (paard, leasetype, prijs, dagen) zodat invullen minimaal is.
- Onomkeerbaarheid van ondertekenen duidelijk bevestigen.

## Acceptatie
- Een lease kan met ingevuld template worden vastgelegd en digitaal ondertekend; status zichtbaar.
- Minimaal deellease + full lease templates beschikbaar; disclaimer prominent.

**Afhankelijkheden:** Lease 01 (Lease), Lease 02. **Size:** XL
