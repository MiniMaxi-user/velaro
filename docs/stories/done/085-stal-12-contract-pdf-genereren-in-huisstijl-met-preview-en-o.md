---
issue: 85
title: "[STAL-12] Contract-PDF genereren in huisstijl, met preview en opslag"
status: "Done"
labels: ["contract", "stalling"]
url: "https://github.com/MiniMaxi-user/velaro/issues/85"
archivedAt: 2026-06-19
---

# #85 — [STAL-12] Contract-PDF genereren in huisstijl, met preview en opslag

**Epic:** PDF (#92)
**Hangt af van:** STAL-06 (#79, verplichte inhoud â€” klaar), STAL-08 (#81, aangeboden versie + statusmachine). Profiteert van STAL-03/04/05/07 (#76/#77/#78/#80) voor de overige optieblokken.
**Status refinement:** stack-keuzes vastgelegd (14-06-2026) â€” PDF via `@react-pdf/renderer`, opslag in Supabase Storage met een nieuw `ContractDocument`-model. Klaar voor bouw.

# User Story

Als **staleigenaar (OWNER/STAFF) en paardeigenaar**
wil ik een nette PDF van het stallingscontract kunnen genereren, vooraf inzien en opgeslagen terugzien
zodat beide partijen een leesbaar, vastgelegd document hebben van wat is afgesproken.

# Context

Dit sluit Journey S1 af met een echt document (Â§5: opstellen/genereren). Het `Contract`-datamodel bestaat al (`prisma/schema.prisma`): `status` (`ContractStatus`), `currentVersion`, `startDate`, `counterparty`, en een `config`-JSON-veld waarin de optieblokken van eerdere stories staan (`huisvesting`, `voer`, `weidegang`, `faciliteiten`, `prijsLooptijd`, `verzekeringAansprakelijkheid`, `gezondheidsplicht`). De server-actions staan in `src/features/contracten/actions.ts`; de label-/weergavehelpers per blok in `src/features/contracten/*.ts`.

De PDF rendert het contractobject + **alleen de aangezette/ingevulde opties** naar Ã©Ã©n document in Velaro-huisstijl (navy/goud, logo `public/velaro_logo.png`, fonts Cormorant Garamond + Inter). De huisstijl-tokens staan in `src/styles/globals.css`.

# Stack-beslissingen (vastgelegd â€” was: open vragen)

1. **PDF-generatie: `@react-pdf/renderer`.** Server-side, geen headless browser (werkt op Vercel serverless/Fluid Compute). Custom fonts (Cormorant Garamond + Inter) en logo via de eigen primitives; huisstijlkleuren navy/goud overnemen uit `src/styles/globals.css`. De PDF-layout is een eigen set componenten (niet de web-UI), maar hergebruikt per blok dezelfde labelteksten via de bestaande helpers.
2. **Opslag: Supabase Storage** (zit al in de stack) in een eigen bucket voor contract-PDF's, met **een nieuw `ContractDocument`-model** in `prisma/schema.prisma` (`contractId` + `version` + storage-pad/-key + `createdAt`). Eigenaar-inzage via een **signed URL**, met dezelfde leesrechten als de eigenaar-weergave van het paard (STAL-09, #82). Schemawijziging toegestaan (zie project-memory).

# Scope

**Binnen scope:**
- Server-side PDF-generatie in `src/features/contracten/` met `@react-pdf/renderer` die uit een contract + `config` Ã©Ã©n document opbouwt met vaste opmaak:
  - Kop met logo + titel "Stallingsovereenkomst", versienummer (`currentVersion`) en generatiedatum.
  - Partijenblok: stal (uit `Stable`) en paardeigenaar (`counterparty`), plus het paard.
  - Artikelen/secties uitsluitend voor de aangezette of ingevulde optieblokken; uitgeschakelde of lege blokken worden weggelaten (geen lege koppen).
  - Gereserveerde ruimte voor latere handtekeningen (alleen plaats reserveren, geen handtekeningfunctionaliteit).
- **Preview-PDF** vanuit het bewerkscherm (concept), zonder dat het contract van status verandert (preview wordt niet opgeslagen).
- **Opslag per versie:** bij aanbieden (STAL-08, `CONCEPT â†’ AANGEBODEN`) en bij elke nieuwe versie (STAL-11) wordt de gegenereerde PDF naar Supabase Storage geschreven en als `ContractDocument` (versie-gebonden) gekoppeld aan het contract, getoond op het paardprofiel (contracten-tab) en inzichtelijk voor de eigenaar in zijn weergave (sluit aan op STAL-09, #82).

**Buiten scope:**
- PDF inlezen/parsen van bestaande documenten (latere batch).
- Werkende handtekeningblokken/ondertekening (alleen ruimte reserveren).
- Genereren of opslaan bij andere statusovergangen dan aanbieden en nieuwe versie.

# Betrokken bestanden / datamodel

- `src/features/contracten/` â€” nieuwe module voor PDF-opbouw (`@react-pdf/renderer`-componenten: mapping van contract + `config` naar documentsecties) en een server-helper die de PDF genereert en (bij aanbieden/nieuwe versie) naar Supabase Storage schrijft + een `ContractDocument`-rij aanmaakt.
- `src/features/contracten/actions.ts` â€” koppelen aan de aanbieden-action (STAL-08) en versie-action (STAL-11), plus een preview-action (genereert in-memory, slaat niet op).
- `src/features/contracten/ContractActies.tsx` / `ContractenPanel.tsx` â€” preview-knop in het bewerkscherm en link (signed URL) naar de opgeslagen PDF in het overzicht.
- Hergebruik van bestaande label-/weergavehelpers per optieblok (`huisvesting.ts`, `dienstpakket.ts`, `prijsLooptijd.ts`, `verzekeringAansprakelijkheid.ts`, `gezondheidsplicht.ts`) zodat de PDF dezelfde teksten toont als de UI.
- `prisma/schema.prisma` â€” nieuw `ContractDocument`-model (`contractId` + `version` + storage-pad + `createdAt`), relatie naar `Contract`.
- `src/lib/supabase/` â€” opslag via de Supabase-client (bucket voor contract-PDF's, signed URL voor eigenaar-inzage).
- Eigenaar-weergave: inzage in de PDF sluit aan op STAL-09 (#82) â€” geen eigen autorisatie verzinnen, dezelfde leesrechten als de eigenaar-weergave van het paard.

# Acceptatiecriteria

- [ ] **Als** een contract opties bevat, **wanneer** men "Preview-PDF" kiest in het bewerkscherm, **dan** wordt een PDF in Velaro-huisstijl getoond met logo, titel, versienummer en generatiedatum, en blijft de contractstatus ongewijzigd (preview wordt niet opgeslagen).
- [ ] **Als** een optieblok is uitgeschakeld of leeg, **wanneer** de PDF wordt gegenereerd, **dan** komt dat blok niet in het document voor (geen lege koppen of placeholders).
- [ ] **Als** een blok is ingevuld, **wanneer** de PDF wordt gegenereerd, **dan** komen de waarden overeen met wat in de UI per blok wordt getoond (zelfde labels/teksten).
- [ ] **Als** een contract wordt aangeboden (STAL-08), **wanneer** de overgang `CONCEPT â†’ AANGEBODEN` plaatsvindt, **dan** wordt de PDF gegenereerd, naar Supabase Storage geschreven en als `ContractDocument` aan die versie gekoppeld.
- [ ] **Als** er een opgeslagen PDF bestaat, **wanneer** een OWNER/STAFF het contract op het paardprofiel bekijkt, **dan** kan hij de PDF van de huidige versie openen/downloaden (signed URL).
- [ ] **Als** er een opgeslagen PDF bestaat, **wanneer** de paardeigenaar zijn weergave opent, **dan** kan hij de PDF van de aangeboden versie inzien (aansluitend op STAL-09).
- [ ] De PDF reserveert zichtbaar ruimte voor handtekeningen van beide partijen, zonder ondertekeningsfunctionaliteit.
- [ ] Een paardeigenaar kan geen PDF genereren of opslaan van een concept (alleen inzien van aangeboden versies) â€” server-side afgedwongen.
