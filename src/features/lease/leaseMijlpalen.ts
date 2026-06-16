// ── Lease-mijlpalen (Lease 10, #69) ──────────────────────────────────────────
// Zuivere afleiding van mijlpalen uit de Lease-velden (proeftijd, minimale looptijd,
// opzegtermijn, einddatum). Geen opslag: mijlpalen worden server-side berekend t.o.v.
// vandaag en verdwijnen vanzelf zodra ze ruim verstreken zijn.

export type MijlpaalType = 'PROEF_EINDE' | 'MIN_DUUR' | 'OPZEGTERMIJN' | 'EINDDATUM'

export type Urgentie = 'verstreken' | 'urgent' | 'aankomend'

export type LeaseMijlpaal = {
  type: MijlpaalType
  label: string
  datum: Date
  urgentie: Urgentie
}

const DAG = 24 * 60 * 60 * 1000

function urgentieVan(datum: Date, vandaag: Date): Urgentie {
  const diff = datum.getTime() - vandaag.getTime()
  if (diff < 0) return 'verstreken'
  if (diff <= 14 * DAG) return 'urgent'
  return 'aankomend'
}

export type MijlpaalBron = {
  startDate: Date | null
  endDate: Date | null
  trialEndsAt: Date | null
  minimumTermMonths: number | null
  noticePeriodDays: number | null
}

export function berekenLeaseMijlpalen(lease: MijlpaalBron, vandaag: Date = new Date()): LeaseMijlpaal[] {
  const ruw: { type: MijlpaalType; label: string; datum: Date }[] = []

  if (lease.trialEndsAt) {
    ruw.push({ type: 'PROEF_EINDE', label: 'Einde proefperiode', datum: new Date(lease.trialEndsAt) })
  }
  if (lease.startDate && lease.minimumTermMonths) {
    const d = new Date(lease.startDate)
    d.setMonth(d.getMonth() + lease.minimumTermMonths)
    ruw.push({ type: 'MIN_DUUR', label: 'Einde minimale looptijd', datum: d })
  }
  if (lease.endDate) {
    if (lease.noticePeriodDays) {
      const d = new Date(lease.endDate)
      d.setDate(d.getDate() - lease.noticePeriodDays)
      ruw.push({ type: 'OPZEGTERMIJN', label: 'Uiterste opzegdatum', datum: d })
    }
    ruw.push({ type: 'EINDDATUM', label: 'Einddatum lease', datum: new Date(lease.endDate) })
  }

  return ruw.map((m) => ({ ...m, urgentie: urgentieVan(m.datum, vandaag) }))
}

// Houdt mijlpalen binnen een relevant venster: maximaal 30 dagen verstreken en tot
// 60 dagen vooruit. Voorkomt dat oude mijlpalen eeuwig blijven staan.
export function isRelevant(m: LeaseMijlpaal, vandaag: Date = new Date()): boolean {
  const diff = m.datum.getTime() - vandaag.getTime()
  return diff >= -30 * DAG && diff <= 60 * DAG
}

export const URGENTIE_BADGE: Record<Urgentie, string> = {
  verstreken: 'badge-warning',
  urgent: 'badge-warning',
  aankomend: 'badge-neutral',
}
