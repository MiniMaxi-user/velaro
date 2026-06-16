// ── Beschikbaarheidskalender-helpers (Lease 09, #68) ─────────────────────────
// Pure datum-/weekhulp. Alles in UTC zodat opslag (@db.Date) en weergave niet
// verschuiven over tijdzones. Een dag wordt als 'yyyy-mm-dd' bewaard/vergeleken.

export const DAGDELEN = ['OCHTEND', 'MIDDAG', 'AVOND'] as const
export type Dagdeel = (typeof DAGDELEN)[number]

export const DAGDEEL_LABELS: Record<Dagdeel, string> = {
  OCHTEND: 'Ochtend',
  MIDDAG: 'Middag',
  AVOND: 'Avond',
}

export const DAG_LABELS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']

export function isDagdeel(v: string): v is Dagdeel {
  return (DAGDELEN as readonly string[]).includes(v)
}

export function ymd(d: Date): string {
  return d.toISOString().slice(0, 10)
}

// Datum (UTC-middernacht) uit een 'yyyy-mm-dd'-string.
export function datumVanYmd(s: string): Date {
  return new Date(`${s}T00:00:00.000Z`)
}

// Maandag (UTC) van de week waarin `d` valt.
export function maandagVan(d: Date): Date {
  const dow = (d.getUTCDay() + 6) % 7 // ma=0 … zo=6
  const mon = new Date(d)
  mon.setUTCDate(d.getUTCDate() - dow)
  mon.setUTCHours(0, 0, 0, 0)
  return mon
}

export function addDagen(d: Date, n: number): Date {
  const x = new Date(d)
  x.setUTCDate(x.getUTCDate() + n)
  return x
}

// De zeven dagen (ma–zo) van een week die `weekOffset` weken vanaf nu ligt.
export function weekDagen(weekOffset: number): Date[] {
  const mon = addDagen(maandagVan(new Date()), weekOffset * 7)
  return Array.from({ length: 7 }, (_, i) => addDagen(mon, i))
}

export function formatDagLabel(d: Date): string {
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', timeZone: 'UTC' })
}
