---
issue: 98
title: "Als staleigenaar wil ik een eigen logo kunnen uploaden."
status: "Done"
labels: []
url: "https://github.com/MiniMaxi-user/velaro/issues/98"
archivedAt: 2026-06-19
---

# #98 — Als staleigenaar wil ik een eigen logo kunnen uploaden.

# User Story

**Als** staleigenaar (`OWNER`)
**wil ik** in een instellingenscherm een eigen stallogo kunnen uploaden, vervangen en verwijderen
**zodat** mijn huisstijl op de contract-PDF verschijnt in plaats van het standaard Velaro-logo.

# Context

De contract-PDF (STAL-12, #85) gebruikt nu een vast Velaro-logo (`public/velaro_logo.png`, geregistreerd in `src/features/contracten/ContractPdfDocument.tsx`). Pensionstallen willen hun eigen logo op de contracten die zij naar paardeneigenaren sturen. Daarvoor moet een staleigenaar zelf een logo kunnen beheren.

Tegelijk ontbreekt er nog een centrale plek voor stal-instellingen. Deze story introduceert daarom een **Instellingen**-onderdeel binnen de actieve stal, met als eerste (en voorlopig enige) instelling het uploaden van het logo. Toekomstige instellingen kunnen later in hetzelfde menu landen.

Het logo hoort bij de **stal** (`Stable`), niet bij de gebruiker â€” een staleigenaar met meerdere stallen kan per stal een ander logo hebben.

# Scope

**Binnen scope**
- Nieuw instellingen-onderdeel binnen de actieve stal (route onder `src/app/(app)/stal/â€¦`, bijv. `stal/instellingen`), zichtbaar/bereikbaar voor `OWNER` van de actieve stal.
- Logo uploaden, tonen (preview van het huidige logo), vervangen en verwijderen.
- Validatie bij upload:
  - **Bestandstype:** alleen afbeeldingen â€” PNG, JPG/JPEG en SVG.
  - **Maximale bestandsgrootte:** 2 MB.
  - **Minimale afmetingen:** 200 x 200 px.
  - **Maximale afmetingen:** 2000 x 2000 px.
- Adviestekst in de UI: "Gebruik bij voorkeur een PNG met transparante achtergrond."
- Opslag van het logo in Supabase Storage (privÃ© bucket, conform de bestaande aanpak in `src/features/contracten/pdf.ts`), met een verwijzing op het `Stable`-model (nieuw veld, bv. `logoPath`).
- De contract-PDF gebruikt het stallogo van de betreffende stal als dat aanwezig is; valt anders terug op het bestaande Velaro-logo. Aanpassing in `src/features/contracten/ContractPdfDocument.tsx` (en de aanroepende `pdf.ts`/`pdfData`-laag).

**Buiten scope**
- Automatisch transparant maken van een geuploade afbeelding (background removal). Onze stack bevat geen image-processing daarvoor; we adviseren transparante PNG i.p.v. die automatisch te genereren. Zie open vraag.
- Logo tonen elders in de applicatie (bijv. in de app-navigatie of e-mails) â€” dit blijft het Velaro-logo.
- Bijsnijden/croppen of bewerken van het logo in de UI.
- Instellingen anders dan het logo (het menu wordt voorbereid, maar alleen het logo wordt nu gebouwd).
- Rechten voor `STAFF` of paardeneigenaar op de instellingen.

# Acceptatiecriteria

1. **Als** een ingelogde `OWNER` van de actieve stal, **wanneer** ik naar het instellingenscherm navigeer, **dan** zie ik een sectie "Stallogo" met (indien aanwezig) een preview van het huidige logo en een upload-mogelijkheid.
2. **Als** een `STAFF`-lid of paardeneigenaar, **wanneer** ik de instellingenpagina probeer te openen, **dan** krijg ik geen toegang (redirect/forbidden), conform de bestaande autorisatie-helpers.
3. **Wanneer** ik een geldig bestand upload (PNG/JPG/JPEG/SVG, â‰¤ 2 MB, tussen 200x200 en 2000x2000 px), **dan** wordt het logo opgeslagen in Supabase Storage, gekoppeld aan deze stal, en zie ik direct de bijgewerkte preview.
4. **Wanneer** ik een bestand upload dat niet aan een validatieregel voldoet (verkeerd type, te groot, te klein/groot in afmetingen), **dan** wordt het niet opgeslagen en zie ik een duidelijke Nederlandstalige foutmelding die aangeeft welke regel is overtreden.
5. **Wanneer** ik een nieuw logo upload terwijl er al Ã©Ã©n bestaat, **dan** vervangt het nieuwe logo het oude (het oude bestand blijft niet rondslingeren in storage).
6. **Wanneer** ik op "Logo verwijderen" klik, **dan** wordt het stallogo verwijderd en valt de contract-PDF terug op het standaard Velaro-logo.
7. **Wanneer** een contract-PDF wordt gegenereerd voor een stal met een eigen logo, **dan** staat dat stallogo in de kop van de PDF op de plek waar nu het Velaro-logo staat.
8. **Wanneer** een contract-PDF wordt gegenereerd voor een stal zonder eigen logo, **dan** gebruikt de PDF het bestaande Velaro-logo (gedrag ongewijzigd).
9. Het instellingenscherm sluit aan op het bestaande design system (kaart-gebaseerd, bestaande form-/button-klassen uit `src/styles/globals.css`); er worden geen nieuwe kleuren/fonts geÃ¯ntroduceerd.

# Technische notities

- **Datamodel:** voeg een veld toe aan `Stable` (bijv. `logoPath String?`) dat verwijst naar het storage-pad. Schemawijziging is toegestaan zonder vooraf overleg (memory: schemawijzigingen-toegestaan). Migratie via `npx prisma migrate`.
- **Opslag:** privÃ© Supabase Storage-bucket (bv. `stable-logos`), idempotente bucket-provisioning analoog aan `ensureContractPdfBucket` in `src/features/contracten/pdf.ts`. Pad bijvoorbeeld `${stableId}/logo-<timestamp>.<ext>`.
- **PDF:** `ContractPdfDocument.tsx` gebruikt nu een vast `LOGO_PATH`. Maak de logo-bron parametriseerbaar: bij aanwezig stallogo de bytes/url van het stallogo doorgeven, anders fallback op `public/velaro_logo.png`. Let op dat `@react-pdf/renderer` server-side de afbeelding moet kunnen lezen (buffer of signed URL), conform de bestaande PDF-aanpak.
- **Validatie afmetingen:** bestandstype/-grootte zijn server-side eenvoudig te checken; pixel-afmetingen vereisen het uitlezen van de afbeeldingsheader. Houd dit binnen de bestaande stack (geen zware nieuwe dependency zonder overleg) â€” desnoods client-side afmeting-check vÃ³Ã³r upload met server-side type/grootte-validatie als harde grens.
- **Navigatie:** instellingen-link toevoegen aan de stal-navigatie (`NavLinks`/`AppNav`), alleen zichtbaar voor `OWNER`.
- Geen `localStorage` voor kernstaat; het logo-pad hoort in de DB.

# Open vragen

1. **Automatisch transparant maken:** de oorspronkelijke aanvraag vroeg of het systeem een logo automatisch transparant kan maken. Dit zit niet in de huidige stack en is in deze story buiten scope gehouden (we adviseren een transparante PNG). Akkoord dat dit als losse, latere story wordt opgepakt indien gewenst?
