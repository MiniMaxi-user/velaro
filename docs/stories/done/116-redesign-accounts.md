---
issue: 116
title: "Redesign accounts"
status: "Done"
labels: ["tested"]
url: "https://github.com/MiniMaxi-user/velaro/issues/116"
archivedAt: 2026-06-19
---

# #116 — Redesign accounts

# User Story

**Als** ontwikkelaar/beheerder van het Velaro-datamodel
**wil ik** de zakelijke- en factuurgegevens van een staleigenaar in een aparte, Ã©Ã©n-op-Ã©Ã©n gekoppelde tabel opslaan in plaats van als platte kolommen op `User`,
**zodat** het `User`/account-model schoon blijft en accounts die deze gegevens niet nodig hebben (platform-admin, stalmedewerker, bereider, paardeneigenaar) niet langer ongebruikte kolommen meedragen.

# Context

In de huidige situatie staan elf zakelijke-/facturatievelden rechtstreeks op het `User`-model
(`prisma/schema.prisma`, regel ~29-47):
`companyName, address, postalCode, city, country, kvkNumber, vatNumber,
separateInvoiceAddress, invoiceAddress, invoicePostalCode, invoiceCity, invoiceCountry`.

Deze velden zijn alleen relevant voor **staleigenaar-accounts** (de te factureren klant), maar
liggen nu op Ã©lk account. Admin, stalmedewerker, bereider en paardeneigenaar hebben ze niet
nodig. Het account-model vermengt daardoor "wie ben je" (account) met "zakelijke
factuurgegevens" â€” dat is niet netjes en schaalt slecht richting de facturatiemodule.

Deze story verplaatst die velden naar Ã©Ã©n nieuwe, 1-1 met `User` gekoppelde tabel. Het is een
**datamodel-refactor zonder functionele wijziging**: het admin-scherm "Zakelijke gegevens" blijft
exact hetzelfde werken.

**Onderzoek dat al is gedaan (geen duplicatie / journey-impact):**
- Er bestaat **geen** los "Accounts"-scherm in de app. De term "accounts" in de issue verwijst naar
  het `User`-/eigenarenmodel, niet naar een UI-pagina. Er is dus geen schermduplicatie of
  versnipperde navigatie. De Sidebar/navigatie wordt niet geraakt.
- De velden worden op dit moment **uitsluitend** geconsumeerd in het platform-admin-onderdeel
  "Eigenaren beheren":
  - lezen: `src/features/admin/queries.ts` â†’ `getOwnerAccount()`
  - formulier: `src/features/admin/EigenaarBewerkenForm.tsx`
  - schrijven: `src/features/admin/actions.ts` â†’ `updateOwnerBusinessDetails()`
  - pagina: `src/app/(app)/admin/eigenaren/[id]/page.tsx`
- De contracten-module gebruikt van de wederpartij allÃ©Ã©n `name`/`email`
  (`src/features/contracten/ContractenPanel.tsx`, `ContractOverzicht.tsx`) â€” die wordt **niet** geraakt.
- `Stable` heeft een eigen, losstaand adres-/factuuradresblok; dat blijft ongewijzigd en valt
  buiten deze story.

# Scope

**In scope:**
- Nieuw Prisma-model met een 1-1 relatie naar `User` (suggestie: `OwnerBusinessProfile`,
  met `userId` als unieke FK; relatie `User.businessProfile?`). De elf bestaande velden verhuizen
  hiernaartoe; `separateInvoiceAddress` houdt `default(false)`.
- De velden worden **verwijderd** van `User`.
- Prisma-migratie met **datamigratie**: bestaande ingevulde waarden mogen niet verloren gaan.
  Maak voor elke `User`-rij die ten minste Ã©Ã©n ingevuld zakelijk/factuurveld heeft een bijbehorende
  profielrij aan, kopieer de waarden, en drop daarna pas de kolommen op `User`.
- Aanpassen van de drie bestaande consumenten zodat ze via de nieuwe relatie lezen/schrijven en het
  gedrag identiek blijft:
  - `getOwnerAccount()` includeert het nieuwe profiel.
  - `EigenaarBewerkenForm.tsx` leest de waarden uit het profiel (vorm/labels ongewijzigd).
  - `updateOwnerBusinessDetails()` doet een **upsert** op het profiel (rij bestaat mogelijk nog niet)
    met dezelfde trim-/separateInvoiceAddress-logica als nu.
- `npx prisma generate` draait schoon; de app compileert en typed correct.

**Niet in scope:**
- Geen nieuwe velden, geen nieuwe schermen, geen navigatiewijzigingen.
- Geen functionele/UX-wijziging aan het admin-eigenarenscherm (labels, secties, validatie blijven gelijk).
- De facturatiemodule zelf (stap 6) â€” die haakt later op dit profiel aan.
- Adresvelden op `Stable` blijven ongemoeid.
- Geen wijziging aan de contracten-/wederpartijlogica.

# Acceptatiecriteria

- **Als** ik het Prisma-schema bekijk, **dan** staan de elf zakelijke-/factuurvelden niet meer op
  `User` maar op een nieuw model dat 1-1 (unieke FK op `userId`) aan `User` gekoppeld is.
- **Als** er vÃ³Ã³r de migratie `User`-rijen met ingevulde zakelijke-/factuurgegevens bestaan,
  **wanneer** de migratie draait, **dan** krijgen die rijen een bijbehorende profielrij met exact
  dezelfde waarden, en gaat geen ingevulde data verloren.
- **Als** een account geen enkel zakelijk/factuurveld ingevuld had, **dan** is er voor dat account
  geen verplichte profielrij nodig (relatie is optioneel).
- **Als** een platform-admin het scherm "Eigenaren â†’ Zakelijke gegevens" opent,
  **dan** ziet die exact dezelfde velden en eerder opgeslagen waarden als vÃ³Ã³r de refactor.
- **Als** een platform-admin zakelijke gegevens opslaat voor een eigenaar die nog geen profielrij
  had, **wanneer** het formulier wordt verzonden, **dan** wordt een profielrij aangemaakt (upsert)
  en correct bewaard; bij een bestaande rij wordt die bijgewerkt.
- **Als** "afwijkend factuuradres" uit staat, **dan** worden de factuuradresvelden op het profiel
  leeggemaakt â€” net als in de huidige `updateOwnerBusinessDetails`-logica.
- **Als** de contracten-/wederpartijweergave wordt gebruikt, **dan** werkt die ongewijzigd
  (gebruikt alleen `name`/`email`).
- **Als** ik `npx prisma generate` en de build draai, **dan** compileert alles zonder type-fouten en
  zijn er geen verwijzingen meer naar de oude `User`-velden.

# Technische notities / relevante bestanden

- `prisma/schema.prisma` â€” velden ~29-47 op `User` verhuizen naar nieuw model; relatie toevoegen.
- Migratie: handgeschreven SQL nodig voor de datamigratie (CREATE TABLE â†’ INSERT bestaande data â†’
  DROP COLUMNs). Prisma genereert standaard alleen het schema-verschil, dus de data-kopieerstap
  bewust toevoegen vÃ³Ã³r het droppen van de kolommen. Bron-migratie ter referentie:
  `prisma/migrations/20260614223019_user_business_invoice_fields/migration.sql`.
- `src/features/admin/queries.ts` â†’ `getOwnerAccount()` (include profiel).
- `src/features/admin/actions.ts` â†’ `updateOwnerBusinessDetails()` (upsert i.p.v. `user.update`).
- `src/features/admin/EigenaarBewerkenForm.tsx` â†’ `Owner`-type en `defaultValue`/`checked` lezen uit
  het geneste profiel (vorm ongewijzigd).
- `src/app/(app)/admin/eigenaren/[id]/page.tsx` â†’ doorgeven van het profiel aan de form.
- Conventie: enkelvoud PascalCase modelnaam; `npx prisma migrate` via `npx prisma` in
  `C:\Claude\velaro`; Prisma CLI leest `.env`.
