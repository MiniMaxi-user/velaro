---
issue: 94
title: "[STAL-16] Bijlagen & extra diensten (prijslijst)"
status: "Done"
labels: ["contract", "stalling"]
url: "https://github.com/MiniMaxi-user/velaro/issues/94"
archivedAt: 2026-06-19
---

# #94 — [STAL-16] Bijlagen & extra diensten (prijslijst)

**Epic:** Contractinhoud: opties & voorwaarden
**Hangt af van:** STAL-01 (#74, datamodel â€” Done), STAL-05 (#78, prijs/looptijd â€” Done); gerelateerd aan STAL-08 (#81, aanbieden + validatie â€” Done) en STAL-12 (#85, contract-PDF + opslag â€” Done).
**Status afhankelijkheden:** alle vereiste stories zijn opgeleverd; deze story is niet geblokkeerd.

# User Story

Als **staleigenaar (OWNER) of stalmedewerker (STAFF)**
wil ik **bijlagen (stalreglement, voerschema, prijslijst, verzekeringspolis) aan een concept-stallingscontract koppelen en extra diensten met meerprijs als prijslijst vastleggen**
zodat **de overeenkomst documentair compleet is en de paardeigenaar vooraf weet welke regels gelden en wat er los van de pensionprijs gefactureerd kan worden.**

# Context

Deze story sluit de laatste onderdelen van Â§3.0/Â§3.3 af die nog niet in een eerdere STAL-story belegd waren: het blok **"Bijlagen"** en het **"Extra diensten / prijslijst"**-deel van de pensionprijs.

- **Bijlagen** worden als documenten aan het contract gekoppeld (geÃ¼ploade bestanden). Dit is een ander type document dan de door STAL-12 gegenereerde contract-PDF: het zijn door de stal aangeleverde bijlagen, niet het contract zelf.
- **Extra diensten** worden als gestructureerde data op het contract opgeslagen (omschrijving + bedrag + frequentie), niet als bestand. Samen vormen ze de **prijslijst** naast de reguliere pensionprijs (STAL-05).

De opties/instellingen van het contract worden â€” net als in STAL-03/04/05/06 â€” als JSON onder het bestaande `Contract.config`-veld bewaard, zodat het schema niet voor deze story hoeft te migreren. De bewerkfunctie is alleen beschikbaar zolang het contract de status **CONCEPT** heeft, conform de bestaande statusmachine.

# Scope

**Binnen scope:**
- Sectie **"Bijlagen & extra diensten"** toevoegen aan het contract-bewerkscherm (`ContractForm`), alleen actief bij status CONCEPT.
- **Bijlagen koppelen:** uploaden/koppelen van documenten in de categorieÃ«n stalreglement, voerschema, prijslijst en kopie verzekeringspolis. Per categorie is meerdere of geen bijlage mogelijk; het **stalreglement** krijgt een instelling "verplicht aan/uit".
- Bijlagen worden opgeslagen in **Supabase Storage** (dezelfde opslagkeuze als de contract-PDF van STAL-12) en als documentrecord aan het contract gekoppeld; inzage voor de paardeigenaar via een signed URL met dezelfde leesrechten als de eigenaar-weergave van het paard (STAL-09).
- **Extra diensten / prijslijst:** een lijst van posten, per post een omschrijving, een bedrag en een frequentie (bijv. eenmalig / per maand). Toevoegen, bewerken en verwijderen van posten. Opslag als JSON op `Contract.config`.
- Bijlagen en prijslijst zichtbaar in de **contract-samenvatting** en in/bij de **gegenereerde contract-PDF** (STAL-12), voor beide partijen.
- **Update-action met autorisatie:** alleen OWNER/STAFF van de stal van het contract, en alleen bij status CONCEPT.
- **Validatie "stalreglement verplicht":** wanneer deze instelling aanstaat en er geen stalreglement-bijlage gekoppeld is, telt dit als ontbrekend verplicht onderdeel in de aanbied-validatie van STAL-08 (`ontbrekendeAanbiedVelden`), zodat het contract niet aangeboden kan worden.

**Buiten scope:**
- Facturatie/inning van de extra diensten (de prijslijst legt alleen vast wat los gefactureerd kan worden; de facturatie-stap volgt later in de bouwvolgorde).
- Automatische data-extractie of validatie van de inhoud van geÃ¼ploade bijlagen.
- Versiebeheer van bijlagen los van het contract (bijlagen volgen het contract; geen aparte documenthistorie).

# Acceptatiecriteria

- [ ] Als een contract de status CONCEPT heeft en een OWNER of STAFF een stalreglement, voerschema, prijslijst of kopie verzekeringspolis koppelt, dan is die bijlage aan het contract gekoppeld en opgeslagen in Supabase Storage.
- [ ] Als de paardeigenaar het contract bekijkt, dan ziet hij/zij de gekoppelde bijlagen (via signed URL) en de prijslijst, met dezelfde leesrechten als zijn/haar paard-weergave.
- [ ] Als een OWNER/STAFF extra diensten invult (omschrijving + bedrag + frequentie), dan worden deze als prijslijst op het contract opgeslagen en getoond in de samenvatting.
- [ ] Als een post in de prijslijst onvolledig is (ontbrekende omschrijving of bedrag), dan kan die post niet opgeslagen worden.
- [ ] Als "stalreglement verplicht" aanstaat en er geen stalreglement-bijlage gekoppeld is, dan blokkeert dit het aanbieden van het contract (verschijnt als ontbrekend onderdeel in de aanbied-validatie van STAL-08).
- [ ] Als het contract niet de status CONCEPT heeft, dan zijn de bewerk-acties voor bijlagen en extra diensten niet beschikbaar.
- [ ] Als een gebruiker zonder OWNER/STAFF-rol op de stal de update-action aanroept, dan wordt deze geweigerd.
- [ ] Bij het genereren van de contract-PDF (STAL-12) verschijnen de prijslijst en een overzicht van de gekoppelde bijlagen mee in/bij het document.

# Technische notities

- **Optie-data op `Contract.config`:** voeg een eigen sleutel toe (bijv. `extraDiensten` voor de prijslijst en `bijlagen`-instellingen zoals `stalreglementVerplicht`), volg het bestaande patroon van `dienstpakket.ts`/`prijsLooptijd.ts` met een defensieve `leesâ€¦`-functie en een `LEEG_â€¦`-default. Geen schemawijziging nodig voor de config-data.
- **Bijlage-documenten:** de gegenereerde PDF gebruikt `ContractDocument` (gekoppeld aan een contract-versie). GeÃ¼ploade bijlagen zijn een ander documenttype; bepaal of het bestaande `ContractDocument`-model met een type-onderscheid volstaat of dat een apart koppelmodel passender is. Een schemawijziging is hiervoor toegestaan (vastgelegd in projectmemory).
- **Opslag = Supabase Storage** (al in de stack), met signed-URL-inzage voor de eigenaar â€” dezelfde aanpak als STAL-12. Dit beslecht de eerdere open vraag over de opslaglocatie; geen aparte opslagdienst introduceren.
- **Aanbied-validatie:** breid `ontbrekendeAanbiedVelden` in `src/features/contracten/aanbiedValidatie.ts` uit met een blok dat (bij `stalreglementVerplicht`) een ontbrekend stalreglement signaleert, zodat server-poort Ã©n UI dezelfde "ontbreekt nog"-feedback geven.
- **Relevante bestanden:** `src/features/contracten/ContractForm.tsx`, `ContractSamenvatting.tsx`, `actions.ts`, `aanbiedValidatie.ts`, `pdfData.ts` / `ContractPdfDocument.tsx` en `prisma/schema.prisma`.
- Geen implementatieontwerp afdwingen; bovenstaande zijn aanknopingspunten binnen de vastgelegde stack (Next.js App Router, Prisma, Supabase Storage).
