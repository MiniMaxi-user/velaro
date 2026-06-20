import type {
  ContractFamily,
  HorseRelatietype,
  HorseStallingsvorm,
  LeaseType,
} from '@prisma/client'

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
// Sinds het contract-unify-epic (#126) is lease een volwaardige contractfamilie
// (ContractFamily.LEASE) met een eigen opstel-flow; de oude "epic #59 — nog niet
// beschikbaar"-indicatie is daarmee vervallen en bewust verwijderd.
export const MATCH_INDICATIE = {
  LES: 'Geen/intern contract.',
  OPDRACHT_BEMIDDELING: 'Opdracht/bemiddeling — nog niet ondersteund.',
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
  // Leasepaard: geen stalling-voorselectie. Lease is sinds het contract-unify-epic
  // een eigen contractfamilie met eigen opstel-flow (zie bepaalContractOpties),
  // dus hier geen aparte indicatie meer.
  LEASEPAARD: {
    voorselectie: null,
    indicatie: null,
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

// ── Per-optie poort: alle contractopties met redenen ([Unify 03] #129) ────────
//
// De "Nieuw contract"-dropdown toont alle contractopties (stalling + alle
// leasevormen) tegelijk, waarbij niet-mogelijke opties zichtbaar maar uitgeschakeld
// zijn met een leesbare reden. Deze functie levert die opties als zuivere,
// testbare afbeelding (geen side effects, geen DB-toegang).
//
// Stalling-opties hergebruiken `bepaalContractPoort` zodat het stalling-gedrag
// identiek blijft. Lease-opties volgen de bestaande createLease-conventie: ze zijn
// toegestaan zodra er een eigenaar aan het paard gekoppeld is (de leaser wordt pas
// in de opstel-flow gekozen). Er komt bewust geen relatietype- of listing-eis bij.

// Redenen waarom een lease-optie (nog) niet kan (Nederlands, UI). Centraal zodat
// ze testbaar en herbruikbaar zijn.
export const LEASE_POORT_REDEN = {
  GEEN_EIGENAAR: 'Koppel eerst een eigenaar aan het paard.',
} as const

// Eén contractoptie in de dropdown: een concrete family + type, plus de
// poort-uitkomst (toegestaan met voorselectie, of dicht met reden). Het Nederlandse
// label wordt bewust niet hier bepaald maar in de UI opgehaald uit
// CONTRACT_TYPE_LABELS/LEASE_TYPE_LABELS (bron van waarheid), zodat deze module geen
// UI-labelafhankelijkheid kent en zuiver/testbaar blijft.
export type ContractOptie = {
  family: ContractFamily
  type: string
} & (
  | { toegestaan: true; voorselectie: ContractVoorselectie }
  | { toegestaan: false; reden: string }
)

// De opties gegroepeerd per familie, in presentatievolgorde. Lege groepen komen
// niet voor (stalling en lease hebben altijd hun vaste opties). Het groep-label
// (CONTRACT_FAMILY_LABELS) wordt in de UI opgehaald.
export type ContractOptiesPerFamilie = {
  family: ContractFamily
  opties: ContractOptie[]
}

// Presentatievolgorde van de leasevormen, compile-compleet over `LeaseType` zodat
// een toekomstige enum-uitbreiding hier een fout geeft. De Nederlandse labels staan
// in LEASE_TYPE_LABELS (leaseHelpers.ts) en worden in de UI opgehaald.
const LEASE_TYPE_VOLGORDE_MAP: Record<LeaseType, true> = {
  FULL: true,
  DEEL: true,
  BIJRIJDEN: true,
  WEDSTRIJD: true,
  KOOPOPTIE: true,
  FOK: true,
}
const LEASE_TYPE_VOLGORDE = Object.keys(LEASE_TYPE_VOLGORDE_MAP) as LeaseType[]

// De ondersteunde stalling-contracttypes in presentatievolgorde, met de
// stallingsvorm waar elk type bij hoort (sluit aan op STALLINGSVORM_CONTRACTTYPE:
// volledig pension → FULL_PENSION, halfpension → HALF_PENSION).
const STALLING_CONTRACTTYPES: { type: string; bijStallingsvorm: HorseStallingsvorm }[] = [
  { type: 'FULL_PENSION', bijStallingsvorm: 'VOLLEDIG_PENSION' },
  { type: 'HALF_PENSION', bijStallingsvorm: 'HALFPENSION' },
]

// Bepaalt voor één concreet stalling-contracttype of de poort open is. Hergebruikt
// `bepaalContractPoort` met de werkelijke stallingsvorm van het paard, zodat het
// stalling-gedrag identiek blijft aan vandaag: alleen het type dat bij de
// stallingsvorm van het paard hoort kan open staan. De andere stalling-optie wordt
// getoond maar uitgeschakeld met de stallingsvorm-reden — geen regressie in welke
// optie kan, welke reden en welke route.
function stallingOptie(
  type: string,
  bijStallingsvorm: HorseStallingsvorm,
  params: {
    relatietype: HorseRelatietype | null | undefined
    stallingsvorm: HorseStallingsvorm | null | undefined
    heeftEigenaar: boolean
  },
): ContractOptie {
  const poort = bepaalContractPoort({
    relatietype: params.relatietype,
    stallingsvorm: params.stallingsvorm,
    heeftEigenaar: params.heeftEigenaar,
  })

  // De poort kan hooguit het type van de werkelijke stallingsvorm openzetten. Een
  // optie waarvan het type niet bij de stallingsvorm van het paard hoort, is altijd
  // dicht — met de stallingsvorm-reden als de poort verder open zou zijn.
  if (poort.toegestaan && params.stallingsvorm === bijStallingsvorm) {
    return { family: 'STALLING', type, toegestaan: true, voorselectie: poort.voorselectie }
  }
  const reden = poort.toegestaan ? POORT_REDEN.STALLINGSVORM_NIET_ONDERSTEUND : poort.reden
  return { family: 'STALLING', type, toegestaan: false, reden }
}

// Bepaalt voor één leasevorm of de poort open is. Volgt de bestaande
// createLease-conventie: toegestaan zodra er een eigenaar gekoppeld is.
function leaseOptie(
  leaseType: LeaseType,
  params: { heeftEigenaar: boolean },
): ContractOptie {
  if (!params.heeftEigenaar) {
    return {
      family: 'LEASE',
      type: leaseType,
      toegestaan: false,
      reden: LEASE_POORT_REDEN.GEEN_EIGENAAR,
    }
  }
  return {
    family: 'LEASE',
    type: leaseType,
    toegestaan: true,
    voorselectie: { family: 'LEASE', type: leaseType },
  }
}

// Bepaalt alle contractopties (stalling + alle leasevormen) voor een paard, per
// familie gegroepeerd. Zuivere functie zonder side effects; geschikt voor de
// dropdown (optie in-/uitschakelen + reden) en testbaar per uitkomst.
export function bepaalContractOpties(params: {
  relatietype: HorseRelatietype | null | undefined
  stallingsvorm: HorseStallingsvorm | null | undefined
  heeftEigenaar: boolean
}): ContractOptiesPerFamilie[] {
  const stalling = STALLING_CONTRACTTYPES.map(({ type, bijStallingsvorm }) =>
    stallingOptie(type, bijStallingsvorm, params),
  )
  const lease = LEASE_TYPE_VOLGORDE.map((lt) => leaseOptie(lt, params))

  return [
    { family: 'STALLING', opties: stalling },
    { family: 'LEASE', opties: lease },
  ]
}
