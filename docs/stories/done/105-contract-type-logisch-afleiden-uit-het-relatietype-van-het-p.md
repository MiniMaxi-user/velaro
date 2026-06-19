---
issue: 105
title: "Contract_type logisch afleiden uit het relatietype van het paard"
status: "Done"
labels: []
url: "https://github.com/MiniMaxi-user/velaro/issues/105"
archivedAt: 2026-06-19
---

# #105 — Contract_type logisch afleiden uit het relatietype van het paard

# User Story

**Als** staleigenaar (OWNER) of stalmedewerker (STAFF)
**wil ik** dat bij het opstellen van een contract het **contract_type logisch aansluit op
het relatietype** van het paard
**zodat** ik niet handmatig hoef te bepalen welk soort overeenkomst past en ik niet per
ongeluk een verkeerd contracttype kies.

# Context

Vervolg op #103 (datamodel relatietype/stallingsvorm) en #104 (UI). Deze story koppelt het
relatietype aan de contractmodule.

Bestaande contract-architectuur (geverifieerd in de codebase):
- `Contract.family` is enum `ContractFamily` (`STALLING` | `LEASE`); `Contract.type` is een
  vrij `String` (vandaag enkel `FULL_PENSION`). Zie `prisma/schema.prisma` en
  `src/features/contracten/contractHelpers.ts` (`CONTRACT_FAMILY_LABELS`,
  `CONTRACT_TYPE_LABELS`).
- In `src/features/contracten/ContractForm.tsx` is het type nu hardgecodeerd/readOnly
  ("Stalling â€” Full pension").
- Contract-aanmaak loopt via `src/features/contracten/actions.ts`.
- De relatietype-enum komt uit #103; labels uit `paardHelpers.ts`.

**Belangrijk vastgesteld (PO + verificatie 2026-06-15):** de lease-functionaliteit is NIET
gebouwd. `ContractFamily.LEASE` is een lege enum-schil; alle 19 Done contract-items zijn
stalling/pension. Er is geen lease-engine en geen lease-contractinhoud. De volledige
lease-contractmodule hoort thuis in epic #59 (lease-module) en wordt bewust uit #105
gehouden.

# Beslissingen PO (2026-06-15) â€” open vragen BESLIST

> De twee eerder als blokkerend gemarkeerde open vragen zijn door de PO beslist. Deze
> story heeft daarmee geen openstaande `needs-human`-beslissing meer.

**BESLIST 1 â€” niet-stalling/niet-lease relatietypes: alleen informatieve indicatie.**
Er worden in #105 **geen** nieuwe contractfamilies/-types geintroduceerd (geen schema-/
migratiewijziging). Voor relatietypes zonder eigen contractfamilie/-type tonen we
uitsluitend een **informatieve indicatie**:
- **lespaard** â†’ indicatie "geen/intern contract".
- **trainings-/beleerpaard** en **verkoop-/handelspaard** â†’ indicatie
  "opdracht/bemiddeling â€” nog niet ondersteund".

**BESLIST 2 â€” leasepaard: alleen informatieve indicatie, geen lease-engine in #105.**
Het lease-relatietype zelf wordt gebouwd via #103/#104. In #105 tonen we voor een
**leasepaard** alleen de informatieve indicatie "leasecontract via lease-module (epic #59)
â€” nog niet beschikbaar". De concrete lease-contractmatching hoort in #59 (lease-module),
om dubbele/tegenstrijdige functionaliteit te voorkomen.

# Scope

## In scope
- **pensionpaard â†’ `STALLING` / `FULL_PENSION`** als **overschrijfbare voorselectie**
  (zachte voorselectie) bij het aanmaken van een contract. Volledig bouwbaar op de
  bestaande, Done STALLING-flow.
- EÃ©n **centrale, testbare matching-bron**: een afbeelding
  `relatietype -> {ContractFamily, type} | indicatie` (naast `contractHelpers.ts`). Geen
  parallelle typering naast `ContractFamily` / `Contract.type`.
- Voor alle overige relatietypes: het tonen van de **informatieve indicatie** uit de
  beslissingen hierboven (geen voorselectie van een contracttype, geen blokkade van
  handmatige keuze).

## Out of scope
- Het bouwen van nieuwe contractinhoud/-formulieren voor lease, opdracht of bemiddeling.
- Het introduceren van nieuwe `ContractFamily`-waarden of -types.
- **Elke schema-/migratiewijziging** (#105 raakt het datamodel niet).
- De concrete lease-contractmatching/-inhoud (hoort in lease-module #59).
- Wijzigingen aan het bestaande full-pension-stallingscontract zelf.
- Datamodel-/UI-werk voor relatietype/stallingsvorm (#103/#104).

# Afhankelijkheden

- **Hard: #103** â€” de relatietype-enum moet in `main` staan voordat #105 concreet bouwbaar
  is. De matching-bron mapt tegen de **echte enum-waarden** (UPPER_SNAKE, As 1) uit #103;
  zonder die enum is er niets om tegen te matchen. #103 staat op het bord in **Ready**
  (nog niet Done) â€” #105 kan pas in implementatie wanneer #103 in main is gemerged.
- **Zacht: #104** â€” UI om relatietype te tonen/bewerken; niet strikt nodig om de
  matching-bron + voorselectie te bouwen, maar wel voor de eindgebruikerservaring.
- **Verwijzing: #59** (lease-module) â€” de leasepaard-contractmatching wordt daar gebouwd,
  niet hier.

# Acceptatiecriteria

- [ ] Bij het starten van een nieuw contract voor een paard met relatietype
  **pensionpaard** wordt automatisch het stallingscontract (`STALLING` / `FULL_PENSION`)
  als **overschrijfbare** voorselectie ingevuld; de gebruiker kan dit wijzigen.
- [ ] Bij relatietype **lespaard** wordt de informatieve indicatie "geen/intern contract"
  getoond; er wordt geen contracttype afgedwongen.
- [ ] Bij relatietype **trainings-/beleerpaard** of **verkoop-/handelspaard** wordt de
  informatieve indicatie "opdracht/bemiddeling â€” nog niet ondersteund" getoond.
- [ ] Bij relatietype **leasepaard** wordt de informatieve indicatie "leasecontract via
  lease-module (epic #59) â€” nog niet beschikbaar" getoond.
- [ ] De matching-logica is op **Ã©Ã©n centrale plek** belegd als
  `relatietype -> {ContractFamily, type} | indicatie` en is **getest** (unit-tests dekken
  pensionpaard-mapping + elke indicatie-uitkomst).
- [ ] Er is **geen** parallelle typering naast `ContractFamily` / `Contract.type` en
  **geen** schema-/migratiewijziging.

# Technische notities

- Hergebruik de relatietype-enum/labels uit #103 (`paardHelpers.ts`); geen labels
  dupliceren.
- Sluit aan op `ContractFamily` en de vrije `Contract.type`-string.
- De matching-bron levert per relatietype ofwel een concrete `{ContractFamily, type}`
  (vandaag alleen pensionpaard) ofwel een `indicatie`-tekst; dit is een zuivere,
  testbare functie zonder side effects.
