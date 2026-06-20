import type { LeaseType, Prisma } from '@prisma/client'

// ── Lease-contractinhoud op Contract.config ([Unify 04] #130) ────────────────
// De rijke leasevelden van de unified contract-flow worden — net als de
// stalling-optieblokken (huisvesting/prijsLooptijd/…) — als JSON op
// Contract.config bewaard, onder de sleutel `lease`. Géén Lease-rij in deze story:
// die ontstaat pas bij activatie ([Unify 06] #132). De configvorm is bewust een
// projectie van LeaseContractConfig (leaseContractConfig.ts) zónder de kosten- en
// verzekering/aansprakelijkheid-velden; die verhuizen naar [Unify 05] #131.
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

  // Leasevergoeding (vrije tekst in deze story; #131 maakt kosten gestructureerd).
  leasevergoeding: string | null

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
  leasevergoeding: null,
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

  return {
    gebruiksrecht: tekst(l.gebruiksrecht),
    disciplines: tekst(l.disciplines),
    dagenPerWeek: getal(l.dagenPerWeek),
    leasevergoeding: tekst(l.leasevergoeding),
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
