import type { Prisma } from '@prisma/client'
import { leesPrijsLooptijd, type OpzegtermijnEenheid } from './prijsLooptijd'
import { voegMaandenToe } from './verlenging'

// ── Opzeggen, opschorten, prijsverlaging & retentierecht (STAL-15, #88) ──────
// Vierde blok in de levensloop van een actief stallingscontract (§3.2/§3.4 +
// §6 journey F/S3 uit `docs/velaro-contracten.md`). Net als bij eerdere stories wordt
// alle metadata append-only/als data in Contract.config bewaard — géén
// schemawijziging. De tijdgebonden overgangen (einde opschorting → ACTIEF; einde
// opzegtermijn → BEEINDIGD; einde prijsverlaging) worden LAZY berekend bij
// paginabezoek/serveractie (productowner-beslissing, consistent met STAL-14).
//
// Geen facturatie/incasso: prijsverlaging en retentierecht/wanbetaling zijn
// uitsluitend vastgelegde data/clausules op het contract.

// ── Datumhulp ────────────────────────────────────────────────────────────────
// Normaliseert een ISO-datum-string naar een Date op middernacht (lokaal). Geeft
// null bij een onleesbare waarde.
export function leesDatum(waarde: unknown): Date | null {
  if (typeof waarde !== 'string' || !waarde.trim()) return null
  const datum = new Date(waarde)
  return Number.isNaN(datum.getTime()) ? null : datum
}

// Telt een aantal dagen op bij een datum (kalenderdagen).
export function voegDagenToe(datum: Date, dagen: number): Date {
  const resultaat = new Date(datum.getTime())
  resultaat.setDate(resultaat.getDate() + dagen)
  return resultaat
}

// Berekent de einddatum van een opzegging op basis van de opzegtermijn uit STAL-05
// (config.prijsLooptijd.looptijd.opzegtermijn), gerekend vanaf `vanaf` (standaard
// vandaag). Eenheid DAGEN/WEKEN/MAANDEN wordt ondersteund; een ontbrekende termijn
// valt terug op de default (1 maand).
export function berekenOpzegEinddatum(
  config: Prisma.JsonValue | null,
  vanaf: Date = new Date(),
): Date {
  const { looptijd } = leesPrijsLooptijd(config)
  const { waarde, eenheid } = looptijd.opzegtermijn
  return voegOpzegtermijnToe(vanaf, waarde, eenheid)
}

function voegOpzegtermijnToe(
  vanaf: Date,
  waarde: number,
  eenheid: OpzegtermijnEenheid,
): Date {
  const veiligeWaarde = Number.isFinite(waarde) && waarde > 0 ? waarde : 1
  if (eenheid === 'DAGEN') return voegDagenToe(vanaf, veiligeWaarde)
  if (eenheid === 'WEKEN') return voegDagenToe(vanaf, veiligeWaarde * 7)
  return voegMaandenToe(vanaf, veiligeWaarde)
}

// ── Opzegging (OPZEGGING_LOOPT) ──────────────────────────────────────────────
// Data van een lopende opzegging: de berekende einddatum (ISO yyyy-mm-dd), het
// moment van opzeggen en een optionele reden.
export type OpzeggingData = {
  einddatum: string // ISO yyyy-mm-dd
  op: string // ISO-timestamp
  doorUserId: string
  reden: string | null
}

export function leesOpzegging(config: Prisma.JsonValue | null): OpzeggingData | null {
  if (!config || typeof config !== 'object' || Array.isArray(config)) return null
  const root = (config as Record<string, unknown>).opzegging
  if (!root || typeof root !== 'object' || Array.isArray(root)) return null
  const r = root as Record<string, unknown>
  if (typeof r.einddatum !== 'string') return null
  return {
    einddatum: r.einddatum,
    op: typeof r.op === 'string' ? r.op : '',
    doorUserId: typeof r.doorUserId === 'string' ? r.doorUserId : '',
    reden: typeof r.reden === 'string' && r.reden.trim() ? r.reden.trim() : null,
  }
}

// Is de einddatum van een lopende opzegging op of vóór `vandaag` verstreken?
export function opzegEinddatumVerstreken(
  config: Prisma.JsonValue | null,
  vandaag: Date = new Date(),
): boolean {
  const opzegging = leesOpzegging(config)
  if (!opzegging) return false
  const eind = leesDatum(opzegging.einddatum)
  if (!eind) return false
  return eind.getTime() <= vandaag.getTime()
}

// ── Opschorting (OPGESCHORT) ─────────────────────────────────────────────────
// Data van een opschorting: de einddatum waarop het contract terugkeert naar
// ACTIEF, het moment van opschorten en een optionele reden.
export type OpschortingData = {
  einddatum: string // ISO yyyy-mm-dd
  op: string // ISO-timestamp
  doorUserId: string
  reden: string | null
}

export function leesOpschorting(config: Prisma.JsonValue | null): OpschortingData | null {
  if (!config || typeof config !== 'object' || Array.isArray(config)) return null
  const root = (config as Record<string, unknown>).opschorting
  if (!root || typeof root !== 'object' || Array.isArray(root)) return null
  const r = root as Record<string, unknown>
  if (typeof r.einddatum !== 'string') return null
  return {
    einddatum: r.einddatum,
    op: typeof r.op === 'string' ? r.op : '',
    doorUserId: typeof r.doorUserId === 'string' ? r.doorUserId : '',
    reden: typeof r.reden === 'string' && r.reden.trim() ? r.reden.trim() : null,
  }
}

// Is de einddatum van een opschorting op of vóór `vandaag` verstreken?
export function opschortEinddatumVerstreken(
  config: Prisma.JsonValue | null,
  vandaag: Date = new Date(),
): boolean {
  const opschorting = leesOpschorting(config)
  if (!opschorting) return false
  const eind = leesDatum(opschorting.einddatum)
  if (!eind) return false
  return eind.getTime() <= vandaag.getTime()
}

// ── Tijdelijke prijsverlaging ────────────────────────────────────────────────
// Afwijkend bedrag met start-/einddatum. Vastgelegd als data — geen inning. Bewust
// als append-only lijst zodat de historie van prijsverlagingen behouden blijft.
export type PrijsverlagingEntry = {
  bedrag: number
  startdatum: string // ISO yyyy-mm-dd
  einddatum: string // ISO yyyy-mm-dd
  op: string // ISO-timestamp
  doorUserId: string
  notitie: string | null
}

export function leesPrijsverlagingen(
  config: Prisma.JsonValue | null,
): PrijsverlagingEntry[] {
  if (!config || typeof config !== 'object' || Array.isArray(config)) return []
  const root = (config as Record<string, unknown>).prijsverlagingen
  if (!Array.isArray(root)) return []
  return root.filter(
    (e): e is PrijsverlagingEntry =>
      !!e &&
      typeof e === 'object' &&
      typeof (e as Record<string, unknown>).bedrag === 'number' &&
      typeof (e as Record<string, unknown>).startdatum === 'string' &&
      typeof (e as Record<string, unknown>).einddatum === 'string',
  )
}

// De op `vandaag` actieve prijsverlaging (start ≤ vandaag ≤ eind), of null.
export function actievePrijsverlaging(
  config: Prisma.JsonValue | null,
  vandaag: Date = new Date(),
): PrijsverlagingEntry | null {
  const nu = vandaag.getTime()
  for (const entry of leesPrijsverlagingen(config)) {
    const start = leesDatum(entry.startdatum)
    const eind = leesDatum(entry.einddatum)
    if (!start || !eind) continue
    // Tot en met de einddatum: tel de hele einddag mee.
    const eindInclusief = voegDagenToe(eind, 1).getTime()
    if (start.getTime() <= nu && nu < eindInclusief) return entry
  }
  return null
}

// ── Wanbetaling / retentierecht ──────────────────────────────────────────────
// Markeerbare status/notitie conform de retentierecht-clausule (art. 3:290 BW).
// Vastgelegd als data — geen incasso.
export type RetentierechtData = {
  actief: boolean
  op: string | null // ISO-timestamp van markeren
  doorUserId: string | null
  notitie: string | null
}

export function leesRetentierecht(
  config: Prisma.JsonValue | null,
): RetentierechtData {
  const leeg: RetentierechtData = {
    actief: false,
    op: null,
    doorUserId: null,
    notitie: null,
  }
  if (!config || typeof config !== 'object' || Array.isArray(config)) return leeg
  const root = (config as Record<string, unknown>).retentierecht
  if (!root || typeof root !== 'object' || Array.isArray(root)) return leeg
  const r = root as Record<string, unknown>
  return {
    actief: r.actief === true,
    op: typeof r.op === 'string' ? r.op : null,
    doorUserId: typeof r.doorUserId === 'string' ? r.doorUserId : null,
    notitie: typeof r.notitie === 'string' && r.notitie.trim() ? r.notitie.trim() : null,
  }
}
