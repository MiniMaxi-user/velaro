---
issue: 62
title: "[Lease 03] Marktplaats: lease-aanbod beheren (CRUD listing)"
status: "Done"
labels: ["lease"]
url: "https://github.com/MiniMaxi-user/velaro/issues/62"
archivedAt: 2026-06-19
---

# #62 — [Lease 03] Marktplaats: lease-aanbod beheren (CRUD listing)

Onderdeel van epic #59. Gereviewd met de huidige app-context en de visie uit `velaro-leasemodule.md`.

**Doel:** eigenaar/stal kan een lease-**aanbod** (`LeaseListing`) aanmaken, bewerken, (de)activeren en verwijderen, vanaf het paardprofiel.

## UI & plaatsing
- **Nieuwe tab "Lease"** in `PaardDetailTabs` (na *Eigenaren*), alleen voor stalleden (`canEdit`). De 70/30-layout blijft; de tab vult de linker 70%-kolom.
- **Leeg (geen listing):** `empty-state` met titel "Nog geen lease-aanbod" + korte uitleg + knop `btn-primary` **"+ Plaats lease-aanbod"**.
- **Met listing:** een `panel` "Lease-aanbod" met `panel-header` (titel + `badge` status: groen `badge-success` "Actief" / grijs `badge-neutral` "Inactief"). In `panel-body` een `detail-fields`-grid: Leasetype (badge), Prijs p/m, Dagen/week, Regio, Discipline, "Mag verplaatst worden" (ja/nee), Exclusief/gedeeld. Onderaan acties: `btn-secondary` **"Bewerken"** + een toggle **"Actief/Inactief"** + `btn-ghost` "Verwijderen".
- **Formulier-subroutes**, exact volgens het bestaande nieuw/bewerken-patroon van gezondheid (`paarden/[id]/vaccinaties/nieuw`): `paarden/[id]/lease/nieuw` en `paarden/[id]/lease/bewerken`. Gebruik `form-group`, `form-row`, `label`, `input`, `SubmitButton`. Leasetype als select met de labels uit `leaseHelpers.ts`; prijs als number; "movable"/"exclusive" als checkbox.

## UX-richtlijnen
- Aanbod beheer je altÃ­jd vanaf het paard zelf â€” consistent met hoe gezondheid/voederschema werken; geen apart los beheerscherm.
- EÃ©n paard = max. Ã©Ã©n actief aanbod tegelijk (toon waarschuwing bij tweede). Inactief zetten i.p.v. verwijderen aanmoedigen (behoud historie).

## Acceptatie
- CRUD via server actions, validatie op verplichte velden (leasetype, prijs).
- Listing zichtbaar in de Lease-tab; (de)activeren werkt; `isActive` bepaalt publieke zichtbaarheid (Lease 04).

**Afhankelijkheden:** Lease 01. **Size:** M
