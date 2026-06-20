import type { LeaseType, Prisma } from '@prisma/client'
import {
  leesLeaseKosten,
  legeLeaseKosten,
  type LeaseKosten,
} from '../lease/leaseKostenConfig'
import {
  leesVerzekering,
  LEGE_VERZEKERING,
  type LeaseVerzekering,
} from '../lease/leaseVerzekeringConfig'
import type { Ondertekening } from '../lease/leaseContractConfig'

// ── Lease-contractinhoud op Contract.config ([Unify 04] #130, [Unify 05] #131) ─
// De rijke leasevelden van de unified contract-flow worden — net als de
// stalling-optieblokken (huisvesting/prijsLooptijd/…) — als JSON op
// Contract.config bewaard, onder de sleutel `lease`. Géén Lease-rij in deze story:
// die ontstaat pas bij activatie ([Unify 06] #132). De configvorm spiegelt de
// losse lease-bron-van-waarheid: het Kosten-blok hergebruikt LeaseKosten /
// berekenKosten (leaseKostenConfig.ts), het Verzekering-blok hergebruikt
// LeaseVerzekering / magActiverenVerzekering (leaseVerzekeringConfig.ts). De polis
// loopt via het bestaande bijlagen-mechanisme (categorie VERZEKERINGSPOLIS), niet
// via het `polissen`-veld van LeaseVerzekering — dat blijft hier dus leeg.
//
// Defensief lezen met lege standaarden, zodat het formulier altijd een volledige
// set velden heeft. Spiegelt het patroon van huisvesting.ts / prijsLooptijd.ts.

export type LeaseContractStepperConfig = {
  // Basisgegevens
  // (leasevorm + wederpartij + ingangsdatum staan op het Contract zelf:
  //  Contract.type / Contract.counterpartyUserId / Contract.startDate)

  // Gebruiksrecht & disciplines
  gebruiksrecht: string | null
  disciplines: string | null
  // Aantal dagen per week (alleen relevant bij DEEL-lease).
  dagenPerWeek: number | null

  // Kosten & leasevergoeding ([Unify 05] #131). Gestructureerd via LeaseKosten
  // (kostenverdeling per post + vergoeding excl. btw + 21%-btw-toggle). Vervangt
  // het vrije-tekstveld `leasevergoeding` van #130 (geen dubbel begrip in de
  // stepper). Berekening: berekenKosten (leaseKostenConfig.ts).
  kosten: LeaseKosten

  // Verzekering & aansprakelijkheid 6:179 BW ([Unify 05] #131). Hergebruikt
  // LeaseVerzekering; het `polissen`-veld blijft leeg — de polis loopt via het
  // bijlagen-mechanisme (categorie VERZEKERINGSPOLIS). Gate: magActiverenVerzekering.
  verzekering: LeaseVerzekering

  // Looptijd / proefperiode / opzegging.
  looptijd: {
    // Aard van de looptijd: bepaalde of onbepaalde tijd.
    einddatum: string | null
    minimumTermijnMaanden: number | null
    opzegtermijnDagen: number | null
    proefperiode: {
      actief: boolean
      einddatum: string | null
    }
  }

  // Berijder (+ minderjarigheid → voogd). Conform projectgeheugen "minderjarige
  // berijder": het contract is met de meerderjarige eigenaar; een minderjarige is
  // alleen berijder en tekent niet — de voogd ondertekent (in #132).
  berijder: {
    naam: string | null
    geboortedatum: string | null
    minderjarig: boolean
    voogdNaam: string | null
  }

  // Eerste recht van koop / koopoptie. Bij KOOPOPTIE-lease prominenter; bij andere
  // vormen het eenvoudige "eerste recht van koop".
  koop: {
    eersteRechtVanKoop: boolean
    koopoptie: boolean
    koopprijs: string | null
  }

  // Bijzonderheden (vrije tekst).
  bijzonderheden: string | null
}

export const LEGE_LEASE_CONTRACT: LeaseContractStepperConfig = {
  gebruiksrecht: null,
  disciplines: null,
  dagenPerWeek: null,
  kosten: legeLeaseKosten(),
  verzekering: { ...LEGE_VERZEKERING, polissen: [] },
  looptijd: {
    einddatum: null,
    minimumTermijnMaanden: null,
    opzegtermijnDagen: null,
    proefperiode: { actief: false, einddatum: null },
  },
  berijder: {
    naam: null,
    geboortedatum: null,
    minderjarig: false,
    voogdNaam: null,
  },
  koop: {
    eersteRechtVanKoop: false,
    koopoptie: false,
    koopprijs: null,
  },
  bijzonderheden: null,
}

function tekst(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

function getal(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim()) {
    const n = Number(v.replace(',', '.'))
    return Number.isFinite(n) ? n : null
  }
  return null
}

// Leest de lease-contractinhoud defensief uit het config-JSON van een contract.
// Onbekende/ontbrekende velden vallen terug op de lege standaard.
export function leesLeaseContractConfig(
  config: Prisma.JsonValue | null | undefined,
): LeaseContractStepperConfig {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return structuredClone(LEGE_LEASE_CONTRACT)
  }
  const raw = (config as Record<string, unknown>).lease
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return structuredClone(LEGE_LEASE_CONTRACT)
  }
  const l = raw as Record<string, unknown>

  const looptijdRaw =
    l.looptijd && typeof l.looptijd === 'object' && !Array.isArray(l.looptijd)
      ? (l.looptijd as Record<string, unknown>)
      : {}
  const proefRaw =
    looptijdRaw.proefperiode &&
    typeof looptijdRaw.proefperiode === 'object' &&
    !Array.isArray(looptijdRaw.proefperiode)
      ? (looptijdRaw.proefperiode as Record<string, unknown>)
      : {}
  const berijderRaw =
    l.berijder && typeof l.berijder === 'object' && !Array.isArray(l.berijder)
      ? (l.berijder as Record<string, unknown>)
      : {}
  const koopRaw =
    l.koop && typeof l.koop === 'object' && !Array.isArray(l.koop)
      ? (l.koop as Record<string, unknown>)
      : {}

  const proefActief = proefRaw.actief === true
  const minderjarig = berijderRaw.minderjarig === true

  // Kosten & verzekering hergebruiken de bestaande readers, die respectievelijk
  // `.kosten` en `.verzekeringBlok` van het meegegeven object lezen. We voeden ze
  // de bijbehorende sub-objecten uit config.lease zodat de bron-van-waarheid niet
  // hertypt wordt. De polissen lopen via het bijlagen-mechanisme, dus we negeren
  // het `polissen`-veld van de verzekering-reader bewust.
  const kosten = leesLeaseKosten({ kosten: l.kosten as Prisma.JsonValue })
  const verzekeringRuw = leesVerzekering({
    verzekeringBlok: l.verzekering as Prisma.JsonValue,
  })

  return {
    gebruiksrecht: tekst(l.gebruiksrecht),
    disciplines: tekst(l.disciplines),
    dagenPerWeek: getal(l.dagenPerWeek),
    kosten,
    verzekering: { ...verzekeringRuw, polissen: [] },
    looptijd: {
      einddatum: tekst(looptijdRaw.einddatum),
      minimumTermijnMaanden: getal(looptijdRaw.minimumTermijnMaanden),
      opzegtermijnDagen: getal(looptijdRaw.opzegtermijnDagen),
      proefperiode: {
        actief: proefActief,
        einddatum: proefActief ? tekst(proefRaw.einddatum) : null,
      },
    },
    berijder: {
      naam: tekst(berijderRaw.naam),
      geboortedatum: tekst(berijderRaw.geboortedatum),
      minderjarig,
      voogdNaam: minderjarig ? tekst(berijderRaw.voogdNaam) : null,
    },
    koop: {
      eersteRechtVanKoop: koopRaw.eersteRechtVanKoop === true,
      koopoptie: koopRaw.koopoptie === true,
      koopprijs: koopRaw.koopoptie === true ? tekst(koopRaw.koopprijs) : null,
    },
    bijzonderheden: tekst(l.bijzonderheden),
  }
}

// ── Ondertekening op Contract.config.lease ([Unify 06] #132) ─────────────────
// De meerpartijen-ondertekening (stal / leaser / voogd) wordt — net als in de oude
// losse lease-flow (Lease.config.ondertekening) — append-only als JSON bewaard,
// hier onder Contract.config.lease.ondertekening. De datavorm (Ondertekening per
// partij) en de volledigheidsregel (isVolledigOndertekend) komen 1:1 uit de
// bron-van-waarheid leaseContractConfig.ts; ze worden hier dus niet hertypt.

export type LeaseOndertekening = {
  stal: Ondertekening
  leaser: Ondertekening
  voogd: Ondertekening
}

export const LEGE_ONDERTEKENING: LeaseOndertekening = {
  stal: null,
  leaser: null,
  voogd: null,
}

function leesEenOndertekening(v: unknown): Ondertekening {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null
  const o = v as Record<string, unknown>
  const naam = tekst(o.naam)
  const datum = tekst(o.datum)
  return naam && datum ? { naam, datum } : null
}

// Leest de ondertekening-status defensief uit Contract.config.lease.ondertekening.
// Ontbrekende/onbekende blokken vallen terug op "nog niet ondertekend" (null).
export function leesLeaseOndertekening(
  config: Prisma.JsonValue | null | undefined,
): LeaseOndertekening {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return { ...LEGE_ONDERTEKENING }
  }
  const lease = (config as Record<string, unknown>).lease
  if (!lease || typeof lease !== 'object' || Array.isArray(lease)) {
    return { ...LEGE_ONDERTEKENING }
  }
  const ond = (lease as Record<string, unknown>).ondertekening
  if (!ond || typeof ond !== 'object' || Array.isArray(ond)) {
    return { ...LEGE_ONDERTEKENING }
  }
  const r = ond as Record<string, unknown>
  return {
    stal: leesEenOndertekening(r.stal),
    leaser: leesEenOndertekening(r.leaser),
    voogd: leesEenOndertekening(r.voogd),
  }
}

// Volledig ondertekend = stal én leaser getekend, plus de voogd wanneer de berijder
// minderjarig is. `minderjarig` komt uit Contract.config.lease.berijder.minderjarig.
export function isLeaseVolledigOndertekend(
  ondertekening: LeaseOndertekening,
  minderjarig: boolean,
): boolean {
  if (!ondertekening.stal || !ondertekening.leaser) return false
  if (minderjarig && !ondertekening.voogd) return false
  return true
}

// Of een leasevorm het "dagen per week"-veld kent. Alleen bij deellease is een vast
// aantal dagen per week relevant; bij de overige vormen is het veld niet van toepassing.
export function kentDagenPerWeek(leaseType: LeaseType): boolean {
  return leaseType === 'DEEL'
}

// Of een leasevorm een expliciete koopoptie (met koopprijs) kent. Bij KOOPOPTIE-lease
// staat het koopoptie-blok prominent; bij de overige vormen volstaat het optionele
// "eerste recht van koop".
export function kentKoopoptie(leaseType: LeaseType): boolean {
  return leaseType === 'KOOPOPTIE'
}
