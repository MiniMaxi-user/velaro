---
issue: 59
title: "[Lease] Epic: Paardenlease-module"
status: "Done"
labels: ["lease"]
url: "https://github.com/MiniMaxi-user/velaro/issues/59"
archivedAt: 2026-06-19
---

# #59 — [Lease] Epic: Paardenlease-module

Overkoepelende feature voor de **paardenlease-module** (zie `velaro-leasemodule.md`).

Velaro's onderscheidend vermogen: integratie van **matching â†’ contract â†’ administratie â†’ paardprofiel** rond het centrale paardprofiel â€” dat bestaat bij geen enkele speler (Horsify, HorseDeal, DigiPaard dekken slechts delen). We zitten nu in de **doorontwikkeling** (vastgelegd in CLAUDE.md); fundament-eerst opgebouwd.

## Vaste plekken in de UI (consistent met bestaande patronen)
Om de module te laten "passen" in de huidige app gebruiken we deze ankerpunten â€” overal hergebruik van bestaande klassen (`panel`, `page-header`, `breadcrumb`, `btn-primary/secondary`, `badge`, `kpi-row`, `filter-bar`, `empty-state`, `detail-tabs-layout`):

- **Sidebar** (`src/components/NavLinks.tsx`): nieuw item **"Lease"** in `STAL_LINKS`, tussen *Paarden* en *Taken* â†’ `/lease`. Voor de leaser-rol een item **"Marktplaats"** in `EIGENAAR_LINKS`.
- **Paard-detailpagina** (`PaardDetailTabs`): extra tab **"Lease"** (na *Eigenaren*); de 70/30-layout blijft intact.
- **Topbar `NotificationBell`**: lease-mijlpalen verschijnen naast berichten.
- **`/berichten`**: tweepane gesprekkenoverzicht (lijst links, thread rechts) voor lease-contact.
- **Leaser-dashboard**: hergebruik van de bestaande eigenaar-weergave (`/eigenaar`), geleasede paarden met een onderscheidende **Lease-badge**.

## Bouwvolgorde (sub-issues, in deze volgorde verwerken)
1. `[Lease 01]` #60 â€” Datamodel & migratie â€” lease-kern *(geen UI)*
2. `[Lease 02]` #61 â€” Autorisatie: leaser-rol & toegang eigen geleased paard
3. `[Lease 03]` #62 â€” Marktplaats: lease-aanbod beheren (CRUD listing)
4. `[Lease 04]` #63 â€” Marktplaats: overzicht, filters & matching-score
5. `[Lease 05]` #64 â€” Communicatie: interesse tonen & in-app contact
6. `[Lease 06]` #65 â€” Contracttemplates per variant + digitale ondertekening
7. `[Lease 07]` #66 â€” Kostenverdeling & betaaladministratie
8. `[Lease 08]` #67 â€” Verzekering- & aansprakelijkheidsregistratie (6:179 BW)
9. `[Lease 09]` #68 â€” Gedeelde beschikbaarheidskalender (deellease)
10. `[Lease 10]` #69 â€” Mijlpaal-/notificatiemotor

## Fasering
- **Fase 1 (marktplaats â†’ contract):** 01â€“06.
- **Fase 2 (transactie & beheer):** 07â€“09.
- **Fase 3 (retentie):** 10.

---

## Refine-notitie (Refine Agent, 2026-06-15)

**Lease-contractmatching hoort hier thuis.** De koppeling *leasepaard â†’ leasecontract
(full/deellease)* is **bewust uit #105 gehouden**. #105 (contract_type afleiden uit
relatietype) levert voor een leasepaard alleen een informatieve indicatie
"leasecontract via lease-module (epic #59) â€” nog niet beschikbaar". De concrete
lease-contractinhoud, -templates en -matching worden binnen deze epic gebouwd (zie
`[Lease 06]` #65 â€” Contracttemplates per variant + digitale ondertekening). Dit
voorkomt dubbele/tegenstrijdige contracttypering.

**Status:** op het projectbord gezet in kolom **Backlog**, zodat de lease-contractmodule
als apart traject opgepakt en gerefined kan worden.

**Vervolgstap (latere refinement):** deze epic NU nog niet opsplitsen in losse
`[Lease 01..10]`-borditems â€” dat is een aparte refinement-stap zodra de epic wordt
opgepakt.
