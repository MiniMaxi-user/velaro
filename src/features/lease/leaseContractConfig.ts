import type { Prisma } from '@prisma/client'

// ── Lease-contractinhoud + ondertekening (Lease 06, #65) ─────────────────────
// De rijke contractvelden (FNRS-artikelstructuur) en de ondertekening worden als
// JSON op Lease.config bewaard. De vaste velden (leasetype, looptijd, proeftijd)
// staan als kolommen op Lease zelf. Defensief lezen met lege standaarden.

export type Ondertekening = { naam: string; datum: string } | null

export type LeaseContractConfig = {
  gebruiksrecht: string | null // wat mag de leaser (buitenrijden, wedstrijd, lessen)
  disciplines: string | null
  kostenverdeling: string | null // vrije tekst in MVP; Lease 07 maakt dit gestructureerd
  leasevergoeding: string | null
  aansprakelijkheid: string | null
  verzekering: string | null
  opzegging: string | null
  eersteRechtVanKoop: boolean
  minderjarig: boolean
  voogdNaam: string | null
  bijzonderheden: string | null
  ondertekening: {
    stal: Ondertekening
    leaser: Ondertekening
    voogd: Ondertekening
  }
}

export const LEEG_LEASE_CONTRACT: LeaseContractConfig = {
  gebruiksrecht: null,
  disciplines: null,
  kostenverdeling: null,
  leasevergoeding: null,
  aansprakelijkheid: null,
  verzekering: null,
  opzegging: null,
  eersteRechtVanKoop: false,
  minderjarig: false,
  voogdNaam: null,
  bijzonderheden: null,
  ondertekening: { stal: null, leaser: null, voogd: null },
}

function tekst(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

function leesOndertekening(v: unknown): Ondertekening {
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  const naam = tekst(o.naam)
  const datum = tekst(o.datum)
  return naam && datum ? { naam, datum } : null
}

export function leesLeaseContract(config: Prisma.JsonValue | null | undefined): LeaseContractConfig {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return { ...LEEG_LEASE_CONTRACT, ondertekening: { stal: null, leaser: null, voogd: null } }
  }
  const r = config as Record<string, unknown>
  const ondertekeningRaw =
    r.ondertekening && typeof r.ondertekening === 'object' && !Array.isArray(r.ondertekening)
      ? (r.ondertekening as Record<string, unknown>)
      : {}
  return {
    gebruiksrecht: tekst(r.gebruiksrecht),
    disciplines: tekst(r.disciplines),
    kostenverdeling: tekst(r.kostenverdeling),
    leasevergoeding: tekst(r.leasevergoeding),
    aansprakelijkheid: tekst(r.aansprakelijkheid),
    verzekering: tekst(r.verzekering),
    opzegging: tekst(r.opzegging),
    eersteRechtVanKoop: r.eersteRechtVanKoop === true,
    minderjarig: r.minderjarig === true,
    voogdNaam: tekst(r.voogdNaam),
    bijzonderheden: tekst(r.bijzonderheden),
    ondertekening: {
      stal: leesOndertekening(ondertekeningRaw.stal),
      leaser: leesOndertekening(ondertekeningRaw.leaser),
      voogd: leesOndertekening(ondertekeningRaw.voogd),
    },
  }
}

// Volledig ondertekend = stal én leaser getekend, plus de voogd wanneer de leaser
// minderjarig is. Bepaalt de overgang naar een actieve lease.
export function isVolledigOndertekend(c: LeaseContractConfig): boolean {
  if (!c.ondertekening.stal || !c.ondertekening.leaser) return false
  if (c.minderjarig && !c.ondertekening.voogd) return false
  return true
}
