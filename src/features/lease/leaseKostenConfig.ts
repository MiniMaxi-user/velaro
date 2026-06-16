import type { Prisma } from '@prisma/client'

// ── Kostenverdeling & btw (Lease 07, #66) ────────────────────────────────────
// De kostenverdeling en leasevergoeding worden als JSON op Lease.config.kosten
// bewaard (geen schemawijziging). Btw op de leasevergoeding is 21% (zakelijke
// verlease); het lage sporttarief 9% geldt hier niet.

export const LEASE_BTW_TARIEF = 0.21

export type Betaler = 'EIGENAAR' | 'LEASER'

export type KostenPostDef = { key: string; label: string }

// Vaste kostenposten in vaste volgorde.
export const KOSTENPOSTEN: KostenPostDef[] = [
  { key: 'hoefsmid', label: 'Hoefsmid' },
  { key: 'dierenarts', label: 'Dierenarts' },
  { key: 'voer', label: 'Voer' },
  { key: 'stalling', label: 'Stalling' },
  { key: 'tuig', label: 'Tuig' },
  { key: 'overig', label: 'Overig' },
]

export type KostenPost = { betaler: Betaler; bedrag: number | null; onvoorzien: boolean }

export type LeaseKosten = {
  vergoeding: number | null // maandelijkse leasevergoeding (excl. btw)
  btw: boolean // 21% btw over de vergoeding
  posten: Record<string, KostenPost>
}

export function legeLeaseKosten(): LeaseKosten {
  // Standaardverdeling: de zorgkosten liggen bij de eigenaar; de leasevergoeding
  // (apart veld) is voor de leaser.
  const posten: Record<string, KostenPost> = {}
  for (const p of KOSTENPOSTEN) {
    posten[p.key] = { betaler: 'EIGENAAR', bedrag: null, onvoorzien: false }
  }
  return { vergoeding: null, btw: true, posten }
}

function getal(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim()) {
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function betaler(v: unknown): Betaler {
  return v === 'LEASER' ? 'LEASER' : 'EIGENAAR'
}

export function leesLeaseKosten(config: Prisma.JsonValue | null | undefined): LeaseKosten {
  const basis = legeLeaseKosten()
  if (!config || typeof config !== 'object' || Array.isArray(config)) return basis
  const root = config as Record<string, unknown>
  const k = root.kosten
  if (!k || typeof k !== 'object' || Array.isArray(k)) return basis
  const kosten = k as Record<string, unknown>

  const postenRaw =
    kosten.posten && typeof kosten.posten === 'object' && !Array.isArray(kosten.posten)
      ? (kosten.posten as Record<string, unknown>)
      : {}

  const posten: Record<string, KostenPost> = {}
  for (const def of KOSTENPOSTEN) {
    const raw = postenRaw[def.key]
    const r = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
    posten[def.key] = {
      betaler: betaler(r.betaler),
      bedrag: getal(r.bedrag),
      onvoorzien: r.onvoorzien === true,
    }
  }

  return {
    vergoeding: getal(kosten.vergoeding),
    btw: kosten.btw !== false,
    posten,
  }
}

export type KostenBerekening = {
  subtotaal: number
  btwBedrag: number
  totaalVergoeding: number
  leaserMaand: number
  eigenaarMaand: number
}

// Maandbedragen per partij: de leaser betaalt de (incl. btw) vergoeding plus de
// posten die aan de leaser zijn toegewezen; de eigenaar draagt zijn posten.
export function berekenKosten(k: LeaseKosten): KostenBerekening {
  const subtotaal = k.vergoeding ?? 0
  const btwBedrag = k.btw ? Math.round(subtotaal * LEASE_BTW_TARIEF * 100) / 100 : 0
  const totaalVergoeding = subtotaal + btwBedrag

  let leaserPosten = 0
  let eigenaarPosten = 0
  for (const def of KOSTENPOSTEN) {
    const post = k.posten[def.key]
    const bedrag = post.bedrag ?? 0
    if (post.betaler === 'LEASER') leaserPosten += bedrag
    else eigenaarPosten += bedrag
  }

  return {
    subtotaal,
    btwBedrag,
    totaalVergoeding,
    leaserMaand: totaalVergoeding + leaserPosten,
    eigenaarMaand: eigenaarPosten,
  }
}
