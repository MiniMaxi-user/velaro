# Velaro — Paardenlease-module (visie & marktonderzoek)

> Bron-document waarnaar de lease-stories (#59 + #60–#69) verwijzen. Hersteld op
> 2026-06-16 op basis van de bestaande story-specs (`scripts/create-lease-stories.sh`,
> `scripts/refine-lease-stories.sh`) en aanvullend markt-/juridisch onderzoek.
> Geen juridisch advies — contracttemplates moeten juridisch worden getoetst.

## 1. Visie & onderscheidend vermogen

De paardenlease-module is de eerste feature buiten de oorspronkelijke MVP-scope
(doorontwikkeling, vastgelegd in `CLAUDE.md`). Velaro's onderscheid: de integratie
van **matching → contract → administratie → paardprofiel** rond het centrale
paardprofiel. Bestaande spelers dekken slechts delen: marktplaatsen (Marktplaats,
Facebook, HorseDeal) bieden geen contract/administratie; juridische templates (FNRS)
staan los van een platform. De pijn die wij oplossen: laagdrempelig **contact**,
een **kloppend contract** en **transparante kosten/aansprakelijkheid** in één flow.

## 2. Leasevormen (`LeaseType`)

| Enum | Label | Betekenis |
|------|-------|-----------|
| `FULL` | Full lease | Volledige lease; paard de hele week ter beschikking. |
| `DEEL` | Deellease | Gedeeld gebruik (halflease); vast aantal dagen/week. |
| `BIJRIJDEN` | Bijrijden | Lichtste vorm; co-rider, geen vaste verantwoordelijkheid. |
| `WEDSTRIJD` | Wedstrijdlease | Specifiek om mee aan wedstrijden te rijden. |
| `KOOPOPTIE` | Lease met koopoptie | Lease met mogelijkheid tot latere koop. |
| `FOK` | Foklease | Lease voor fokdoeleinden. |

> **Terminologie-valkuil:** "halfpension" (zorgniveau bij **stalling**) ≠
> "deellease/halflease" (een **paard delen**). Twee verschillende assen; niet
> verwarren in de UI of het datamodel.

## 3. Lease vs. de bestaande stalling-/contractmodule

| Aspect | Stalling (bestaand) | Lease (deze module) |
|--------|---------------------|---------------------|
| Partijen | Stal ↔ paardeigenaar | Paardeigenaar ↔ leaser (stal faciliteert) |
| Onderwerp | Huisvesting + zorg tegen maandbedrag | Gebruiksrecht van het paard tegen vergoeding |
| Rol | OWNER/STAFF/eigenaar | Nieuwe rol **leaser** (read-only op geleased paard) |
| Marktplaats | n.v.t. | Kern: aanbod + filters + matching, over stallen heen |
| Aansprakelijkheid | Licht | Zwaar — **art. 6:179 BW** (bezitter); meeverzekering leaser |
| BTW | Sportfaciliteit 9% | Lease **21%** |
| Kosten | Stal factureert eigenaar | Kostenverdeling eigenaar ↔ leaser |
| Levenscyclus | concept→aangeboden→actief→opzeggen | idem **+ proeftijd** + (deellease) kalender |

**Hergebruik:** `Contract.config`-JSON-patroon, statusmachine, PDF + versionering,
signed-URL-opslag, `Message`/`MessageRead`, notificatiebel, detail-tab-layout,
`panel`/`badge`/`filter-bar`-componenten.

## 3a. Unified contractsysteem (contract-unify-epic #126) — actuele werking

> Vanaf juni 2026 is lease- en stallingcontractbeheer samengevoegd tot **één
> contractsysteem**. Onderstaande beschrijft de **actuele** werking; de oude losse
> lease-contract-/kosten-/verzekering-editor onder `/lease/[leaseId]/…` bestaat niet
> meer (opgeruimd in `[Unify 08]` #134).

- **Eén stepper, één model.** Een leasecontract (`Contract.family = LEASE`) wordt
  opgesteld, ondertekend en geactiveerd via **dezelfde unified contract-stepper** als
  een stallingcontract, onder de **Contracten-tab** van het paardprofiel. De rijke
  leasevelden (gebruiksrecht, kosten, verzekering, ondertekening) leven als JSON op
  `Contract.config.lease` — het patroon spiegelt de stalling-optieblokken.
- **De Lease-tab is puur marktplaats-aanbod.** De Lease-tab toont uitsluitend het
  marktplaats-/listing-aanbod (aanbieden, filteren, matching, interesse/inquiry). Er
  wordt daar **geen** contract meer opgesteld of beheerd.
- **De operationele `Lease` ontstaat bij activatie.** Bij volledige ondertekening en
  activatie van een `LEASE`-contract brengt het systeem **1:1** een operationele,
  `ACTIEF`-`Lease` voort (gekoppeld via `Lease.contractId`). Die `Lease` is de bron
  voor leaser-leestoegang, de gedeelde kalender en de mijlpaal-/notificatiemotor.
  Er bestaat **geen UI meer** om een losse `Lease` zónder contract aan te maken.
- **Behouden, herbruikte configs:** `leaseKostenConfig.ts` (`KOSTENPOSTEN`,
  `berekenKosten`) en `leaseVerzekeringConfig.ts` (`leesVerzekering`,
  `magActiverenVerzekering`, polislabels) worden door de unified contract-flow
  hergebruikt. Het `Ondertekening`-type leeft in `features/contracten/leaseContract.ts`.

## 4. Contractstructuur (FNRS-artikelstructuur) — voor Lease 06

Verplichte/aankruisbare onderdelen van een leasecontract (consistent in FNRS- en
advocatenbronnen):

1. **Partijen** (eigenaar, leaser; bij minderjarige leaser: ouder/voogd tekent mee)
2. **Paard** (identificatie uit het profiel)
3. **Duur & proeftijd**
4. **Gebruiksrecht & disciplines** (mag leaser springen / buitenrijden / wedstrijd?)
5. **Kostenverdeling** (wie betaalt hoefsmid / dierenarts / voer / stalling / tuig)
6. **Leasevergoeding** (maandbedrag, BTW 21%)
7. **Aansprakelijkheid** (art. 6:179 BW — bezitter aansprakelijk; vrijwaring?)
8. **Verzekering** (WA/AVP, is leaser meeverzekerd? ongevallen ruiter; casco/ziektekosten paard)
9. **Opzegging** (termijnen, tussentijds)
10. **Eerste recht van koop** (optioneel)
11. **Blessure/overlijden van het paard**

## 5. Juridisch — art. 6:179 BW

De **bezitter** van een dier is aansprakelijk voor schade die het dier veroorzaakt.
Bij (deel)lease sluit dat aansprakelijkheid van de leaser niet automatisch uit
(vgl. LG München I). Daarom in Lease 08: een verplichte vraag "is de leaser
meeverzekerd op de WA/AVP-polis van de eigenaar?" als gate vóór status `ACTIEF`,
plus polis-registratie en een korte 6:179-checklist.

## 6. Fiscaal — BTW

- **Lease = 21%** (zakelijk verleaser/manege).
- Stalling/manege als **sport(accommodatie) = 9%** — geldt **niet** voor lease.
- Gecombineerde diensten (stalling + zorg + instructie) moeten gesplitst worden.

Bron: FNRS / AAFF BTW-overzichten hippische sector.

## 7. Marktreferentie

Pensionbedrijven combineren manege, pension, sportpaarden, verzorging en
cursussen (bv. meerspaardencentrum.nl — menustructuur manege/pension/sportpaarden,
losse tarievenpagina's per dienst). Lease/verzorgpaard zit doorgaans onder de
sportpaarden-/manegetak. Concrete prijzen staan per bedrijf op aparte
tarievenpagina's en variëren sterk per regio en leasevorm.

## 8. Bekend aandachtspunt buiten de lease-scope — Full/Half pension

In de **stalling**module wordt het contracttype `FULL_PENSION`/`HALF_PENSION`
afgeleid uit de stallingsvorm, maar de **contractinhoud is identiek**. Het echte
verschil tussen vol- en halfpension zit in de **taakverdeling** (volpension: stal
doet alles; halfpension: eigenaar doet o.a. uitmesten/weidegang). Aanbeveling:
een optieblok "Taakverdeling" op het stallingscontract (verplicht bij halfpension).
Dit is een aparte verbetering in de stalling-module, niet de lease-module.

## 9. Bouwvolgorde (epic #59)

Fundament-eerst. Fase 1 (marktplaats → contract): Lease 01–06. Fase 2 (transactie
& beheer): Lease 07–09. Fase 3 (retentie): Lease 10. Zie de issues #60–#69 voor de
gedetailleerde scope, UI-plaatsing en acceptatiecriteria per story.
