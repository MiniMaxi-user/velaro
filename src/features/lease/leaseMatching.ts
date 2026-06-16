import type { LeaseType } from '@prisma/client'

// ── Matching-score voor de lease-marktplaats (Lease 04, #63) ─────────────────
// Geen ML: een gewogen criteria-match. Alleen criteria waarvoor de gebruiker een
// voorkeur heeft opgegeven tellen mee; de score is het percentage behaalde
// gewichten. Zuivere functie zonder side effects (testbaar).

export type MatchVoorkeuren = {
  leaseType?: LeaseType
  discipline?: string
  region?: string
  maxDaysPerWeek?: number
  maxPrice?: number
}

export type ScoorbareListing = {
  leaseType: LeaseType
  discipline: string | null
  region: string | null
  daysPerWeek: number | null
  pricePerMonth: number | null
}

const GEWICHTEN = {
  leaseType: 30,
  discipline: 25,
  region: 20,
  maxPrice: 15,
  maxDaysPerWeek: 10,
}

export function heeftVoorkeuren(v: MatchVoorkeuren): boolean {
  return Boolean(
    v.leaseType ||
      v.discipline ||
      v.region ||
      v.maxDaysPerWeek != null ||
      v.maxPrice != null,
  )
}

function bevat(haystack: string | null, needle: string): boolean {
  return !!haystack && haystack.toLowerCase().includes(needle.toLowerCase())
}

// Geeft een score 0–100. Alleen opgegeven voorkeuren wegen mee; zonder voorkeuren 0.
export function matchScore(listing: ScoorbareListing, v: MatchVoorkeuren): number {
  let totaal = 0
  let behaald = 0

  if (v.leaseType) {
    totaal += GEWICHTEN.leaseType
    if (listing.leaseType === v.leaseType) behaald += GEWICHTEN.leaseType
  }
  if (v.discipline) {
    totaal += GEWICHTEN.discipline
    if (bevat(listing.discipline, v.discipline)) behaald += GEWICHTEN.discipline
  }
  if (v.region) {
    totaal += GEWICHTEN.region
    if (bevat(listing.region, v.region)) behaald += GEWICHTEN.region
  }
  if (v.maxPrice != null) {
    totaal += GEWICHTEN.maxPrice
    if (listing.pricePerMonth != null && listing.pricePerMonth <= v.maxPrice) {
      behaald += GEWICHTEN.maxPrice
    }
  }
  if (v.maxDaysPerWeek != null) {
    totaal += GEWICHTEN.maxDaysPerWeek
    // Onbekende dagen/week (full lease) sluit niet uit.
    if (listing.daysPerWeek == null || listing.daysPerWeek <= v.maxDaysPerWeek) {
      behaald += GEWICHTEN.maxDaysPerWeek
    }
  }

  return totaal === 0 ? 0 : Math.round((behaald / totaal) * 100)
}
