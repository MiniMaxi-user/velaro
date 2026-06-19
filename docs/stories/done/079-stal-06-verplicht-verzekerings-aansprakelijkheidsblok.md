---
issue: 79
title: "[STAL-06] Verplicht verzekerings- & aansprakelijkheidsblok"
status: "Done"
labels: ["contract", "stalling", "tested"]
url: "https://github.com/MiniMaxi-user/velaro/issues/79"
archivedAt: 2026-06-19
---

# #79 — [STAL-06] Verplicht verzekerings- & aansprakelijkheidsblok

**Epic:** #90 â€” Contractinhoud: opties & voorwaarden
**Hangt af van:** STAL-01 (contract-datamodel â€” aanwezig: `Contract.config` JSON)
**Sluit aan op:** STAL-03 (#76 huisvesting), STAL-04 (#77 voer/weidegang/faciliteiten), STAL-05 (#78 prijs/borg/looptijd) â€” zelfde config-patroon.
**Poort voor:** STAL-08 (#81) dwingt af dat dit blok volledig is vÃ³Ã³r AANGEBODEN.

# User Story

Als **staleigenaar (OWNER) of stalmedewerker (STAFF)**
wil ik op een concept-stallingscontract het verzekerings- & aansprakelijkheidsblok invullen, met de juridisch verplichte velden duidelijk gemarkeerd,
zodat het contract juridisch sluitend is voordat ik het aan de paardeigenaar aanbied.

# Context

Het verzekerings- en aansprakelijkheidsblok (Â§3.0/Â§3.3) is het gevoeligste deel van het stallingscontract en moet **verplicht** ingevuld zijn voordat een contract de status AANGEBODEN kan krijgen. Deze story levert het raamwerk + de datavelden + de UI-sectie; de daadwerkelijke harde blokkade bij aanbieden wordt afgedwongen in STAL-08 (#81).

De gegevens worden â€” net als de eerder opgeleverde blokken â€” als JSON op het bestaande `Contract.config`-veld bewaard (onder een eigen sleutel, bijv. `verzekeringAansprakelijkheid`). Er is dus **geen schemamigratie** nodig en bestaande config-sleutels (huisvesting, voer, weidegang, faciliteiten, prijsLooptijd) blijven ongewijzigd. Volg het bestaande modulepatroon: een feature-module met types + lege defaults + validatie, een form-sectie in `ContractForm.tsx`, en een update-action in `actions.ts`.

# Scope

**Binnen scope**
- Een config-module voor verzekering & aansprakelijkheid (types, lege defaults, validatie van verplichte velden).
- Datavelden:
  - *Verzekering:* WA-/aansprakelijkheidsverzekering eigenaar **verplicht** (ja, met polisnummer + verzekeraar/maatschappij); brandverzekering paard (ja/nee); bevestiging dat de eigenaar het paard zelf verzekert.
  - *Aansprakelijkheid:* risico-acceptatie eigenaar (**verplicht**); bezitter-aansprakelijkheid (art. 6:179 BW); notitieveld bedrijfsmatig gebruik (art. 6:181 BW) â€” bij full pension zonder training NVT, maar veld aanwezig; zorgplicht stal; aansprakelijkheid stal beperkt en gekoppeld aan dekking.
- UI-sectie "Verzekering & aansprakelijkheid" in het contractformulier met zichtbare **verplicht-markering** op de vereiste velden.
- Update-action met autorisatie: alleen OWNER/STAFF van de stal, alleen op een contract met status CONCEPT.
- Een validatiehulp die teruggeeft of het blok compleet is (gebruikt door STAL-08 als poortcontrole).

**Buiten scope**
- De juridische teksten zelf (worden door een hippisch jurist aangeleverd; hier alleen raamwerk + datavelden).
- De harde statusblokkade bij aanbieden zelf (STAL-08 #81); deze story levert alleen de validatiehulp die daar gebruikt wordt.
- Facturatie / verzekeringsadministratie.

# Acceptatiecriteria

- [ ] **Opslaan** â€” Als een contract de status CONCEPT heeft, wanneer een OWNER of STAFF het verzekerings- & aansprakelijkheidsblok invult en opslaat, dan worden de gegevens onder `Contract.config` bewaard en blijven de overige config-blokken ongewijzigd.
- [ ] **Verplicht-markering** â€” De verplichte velden (verzekering eigenaar + polisnummer + verzekeraar, en risico-acceptatie eigenaar) zijn in de UI zichtbaar als "verplicht" gemarkeerd.
- [ ] **Validatie compleetheid** â€” Er is een validatiehulp die `true`/`false` (of de lijst ontbrekende velden) teruggeeft op basis van de verplichte velden; een onvolledig blok geeft `niet compleet` terug.
- [ ] **Autorisatie status** â€” Wanneer een gebruiker zonder OWNER/STAFF-rol op de stal, of op een contract dat niet CONCEPT is, dit blok probeert op te slaan, dan wordt de actie geweigerd.
- [ ] **Poort-koppeling** â€” De validatiehulp is herbruikbaar zodat STAL-08 (#81) hem kan inzetten om aanbieden te blokkeren bij een onvolledig blok (geen harde blokkade in deze story).
- [ ] **Optionele velden** â€” Niet-verplichte velden (brandverzekering, art. 6:181-notitie, etc.) mogen leeg blijven zonder dat opslaan faalt.

# Open vragen

- Welke exacte velden eist de hippisch jurist als minimaal verplicht? Voorlopige aanname (akkoord voor implementatie): verzekering eigenaar + polisnummer + verzekeraar + risico-acceptatie eigenaar. Aanpassing van de verplicht-set is een latere tekstuele wijziging, geen blokkade voor deze story.
