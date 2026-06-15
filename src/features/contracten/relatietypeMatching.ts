import type { ContractFamily, HorseRelatietype, HorseStallingsvorm } from '@prisma/client'

// ── Contract-matching op basis van relatietype (#105) ────────────────────────
//
// Eén centrale, zuivere en testbare bron die het relatietype van een paard (As 1
// uit #103, enum `HorseRelatietype`) afbeeldt op het soort contract dat erbij
// hoort. De afbeelding levert per relatietype OFWEL een concrete, overschrijfbare
// voorselectie `{ family, type }` (vandaag alleen pensionpaard → STALLING /
// FULL_PENSION) OFWEL een informatieve `indicatie`-tekst.
//
// Bewust géén nieuwe ContractFamily/-type-waarden en géén schema-/migratiewijziging:
// we sluiten aan op de bestaande `ContractFamily` + de vrije `Contract.type`-string
// en op `CONTRACT_TYPE_LABELS` uit `contractHelpers.ts`. Geen side effects.

// Concrete, overschrijfbare voorselectie van een contract. `family` en `type`
// sluiten aan op `Contract.family` / `Contract.type`.
export type ContractVoorselectie = {
  family: ContractFamily
  type: string
}

// Uitkomst van de matching: óf een concrete (overschrijfbare) voorselectie, óf
// alleen een informatieve indicatie. `voorselectie` is null wanneer er geen
// contracttype wordt voorgesteld; `indicatie` is null wanneer er niets toe te
// lichten valt (neutraal). De twee sluiten elkaar in de praktijk uit, maar het
// type laat beide expliciet null toe zodat het neutrale geval (geen/onbekend
// relatietype) ook representeerbaar is.
export type RelatietypeMatch = {
  voorselectie: ContractVoorselectie | null
  indicatie: string | null
}

// Informatieve indicatieteksten (Nederlands, UI). Centraal zodat ze testbaar en
// herbruikbaar zijn.
export const MATCH_INDICATIE = {
  LES: 'Geen/intern contract.',
  OPDRACHT_BEMIDDELING: 'Opdracht/bemiddeling — nog niet ondersteund.',
  LEASE: 'Leasecontract via lease-module (epic #59) — nog niet beschikbaar.',
} as const

// Afbeelding relatietype → match. Volledig voor elke `HorseRelatietype`-waarde uit
// #103, zodat een toekomstige enum-uitbreiding hier een compile-fout geeft.
const RELATIETYPE_MATCH: Record<HorseRelatietype, RelatietypeMatch> = {
  // Pensionpaard: enige relatietype met een concrete, bouwbare contract-flow.
  // Overschrijfbare voorselectie op de bestaande Done STALLING-flow.
  PENSIONPAARD: {
    voorselectie: { family: 'STALLING', type: 'FULL_PENSION' },
    indicatie: null,
  },
  // Leasepaard: geen voorselectie; lease-contractmatching hoort in de lease-module (#59).
  LEASEPAARD: {
    voorselectie: null,
    indicatie: MATCH_INDICATIE.LEASE,
  },
  // Lespaard / manegepaard: intern, geen extern stallingscontract.
  LESPAARD: {
    voorselectie: null,
    indicatie: MATCH_INDICATIE.LES,
  },
  // Trainings-/beleerpaard: opdracht/bemiddeling — nog niet ondersteund.
  TRAININGSPAARD: {
    voorselectie: null,
    indicatie: MATCH_INDICATIE.OPDRACHT_BEMIDDELING,
  },
  // Verkoop-/handelspaard: opdracht/bemiddeling — nog niet ondersteund.
  VERKOOPPAARD: {
    voorselectie: null,
    indicatie: MATCH_INDICATIE.OPDRACHT_BEMIDDELING,
  },
  // Overige relatietypes: geen voorselectie, neutraal (geen indicatie). Een
  // stalpaard is eigendom van de stal en kent geen extern contract; fok-, opfok-,
  // revalidatie- en rustpaard hebben (nog) geen eigen contract-flow.
  STALPAARD: { voorselectie: null, indicatie: null },
  FOKPAARD: { voorselectie: null, indicatie: null },
  OPFOKPAARD: { voorselectie: null, indicatie: null },
  REVALIDATIEPAARD: { voorselectie: null, indicatie: null },
  RUSTPAARD: { voorselectie: null, indicatie: null },
}

// Neutrale uitkomst voor een ontbrekend/leeg relatietype: geen voorselectie, geen
// indicatie.
const NEUTRALE_MATCH: RelatietypeMatch = { voorselectie: null, indicatie: null }

// Bepaalt de contract-match voor een (eventueel ontbrekend) relatietype. Zuivere
// functie zonder side effects. Een ontbrekend (null/undefined) relatietype levert
// de neutrale uitkomst op.
export function matchContractVoorRelatietype(
  relatietype: HorseRelatietype | null | undefined,
): RelatietypeMatch {
  if (!relatietype) return NEUTRALE_MATCH
  return RELATIETYPE_MATCH[relatietype] ?? NEUTRALE_MATCH
}

// ── Contract-poort: relatietype + stallingsvorm als harde voorwaarde (#113) ──
//
// Een stallingscontract kan pas worden aangemaakt wanneer het paard bewust een
// relatietype (As 1) én een stallingsvorm (As 2) heeft, en er een eigenaar
// gekoppeld is. De stallingsvorm bepaalt vervolgens het contracttype. Deze stap
// ondersteunt volledig pension en halfpension; de overige stallingsvormen vallen
// (nog) buiten scope.

// Ondersteunde stallingsvormen → contracttype (Contract.type-string). Andere
// stallingsvormen leveren (nog) geen contract op. Volledig over `HorseStallingsvorm`
// zodat een toekomstige enum-uitbreiding hier een compile-fout geeft.
const STALLINGSVORM_CONTRACTTYPE: Record<HorseStallingsvorm, string | null> = {
  VOLLEDIG_PENSION: 'FULL_PENSION',
  HALFPENSION: 'HALF_PENSION',
  WEIDESTALLING: null,
  PADDOCK: null,
  TIJDELIJK: null,
}

// Redenen waarom de poort dicht is (Nederlands, UI). Centraal zodat ze testbaar en
// herbruikbaar zijn.
export const POORT_REDEN = {
  GEEN_RELATIETYPE: 'Stel eerst het relatietype van het paard in.',
  GEEN_STALLINGSVORM: 'Stel eerst de stallingsvorm van het paard in.',
  GEEN_EIGENAAR: 'Koppel eerst een eigenaar aan het paard.',
  RELATIETYPE_NIET_ONDERSTEUND: 'Voor dit relatietype is geen stallingscontract beschikbaar.',
  STALLINGSVORM_NIET_ONDERSTEUND:
    'Voor deze stallingsvorm is nog geen contract beschikbaar. Een stallingscontract is er voorlopig alleen voor volledig pension en halfpension.',
} as const

// Uitkomst van de poort: óf toegestaan met een concreet contracttype, óf dicht met
// een toon-bare reden.
export type ContractPoort =
  | { toegestaan: true; voorselectie: ContractVoorselectie }
  | { toegestaan: false; reden: string }

// Bepaalt of er een stallingscontract aangemaakt mag worden voor een paard, op basis
// van relatietype, stallingsvorm en of er een eigenaar gekoppeld is. Zuivere functie
// zonder side effects; geschikt voor zowel de UI (knop in-/uitschakelen) als de
// server-side afdwinging (actie/pagina). De volgorde van de checks bepaalt welke
// reden de gebruiker als eerste te zien krijgt: eerst "stel in" (ontbrekende
// kenmerken), dan "niet ondersteund", dan de eigenaar-eis.
export function bepaalContractPoort(params: {
  relatietype: HorseRelatietype | null | undefined
  stallingsvorm: HorseStallingsvorm | null | undefined
  heeftEigenaar: boolean
}): ContractPoort {
  const { relatietype, stallingsvorm, heeftEigenaar } = params

  if (!relatietype) return { toegestaan: false, reden: POORT_REDEN.GEEN_RELATIETYPE }
  if (!stallingsvorm) return { toegestaan: false, reden: POORT_REDEN.GEEN_STALLINGSVORM }

  // Alleen het pensionpaard heeft een (bouwbare) stallingscontract-flow. Andere
  // relatietypes tonen hun eigen indicatie wanneer aanwezig, anders een generieke reden.
  if (relatietype !== 'PENSIONPAARD') {
    return {
      toegestaan: false,
      reden:
        RELATIETYPE_MATCH[relatietype]?.indicatie ?? POORT_REDEN.RELATIETYPE_NIET_ONDERSTEUND,
    }
  }

  const type = STALLINGSVORM_CONTRACTTYPE[stallingsvorm]
  if (!type) {
    return { toegestaan: false, reden: POORT_REDEN.STALLINGSVORM_NIET_ONDERSTEUND }
  }

  if (!heeftEigenaar) return { toegestaan: false, reden: POORT_REDEN.GEEN_EIGENAAR }

  return { toegestaan: true, voorselectie: { family: 'STALLING', type } }
}
