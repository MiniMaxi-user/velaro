import type { LeaseType, LeaseStatus } from '@prisma/client'

// ── Lease-helpers (Lease 01, #60) ────────────────────────────────────────────
// Centrale Nederlandse labels voor de leasemodule, zodat alle volgende UI-stories
// (marktplaats, listing-beheer, contract, kosten) dezelfde teksten gebruiken.
// Analoog aan paardHelpers.ts (GESLACHT_LABELS) en contractHelpers.ts.

// Leasevormen. Volgorde = de logische presentatievolgorde in selects/filters.
export const LEASE_TYPE_LABELS: Record<LeaseType, string> = {
  FULL: 'Full lease',
  DEEL: 'Deellease',
  BIJRIJDEN: 'Bijrijden',
  WEDSTRIJD: 'Wedstrijdlease',
  KOOPOPTIE: 'Lease met koopoptie',
  FOK: 'Foklease',
}

// Korte toelichting per leasevorm — bruikbaar als hint/subtekst in formulieren.
export const LEASE_TYPE_OMSCHRIJVING: Record<LeaseType, string> = {
  FULL: 'Volledige lease: de leaser heeft het paard de hele week ter beschikking.',
  DEEL: 'Gedeeld gebruik (halflease): een vast aantal dagen per week.',
  BIJRIJDEN: 'Lichtste vorm: af en toe rijden, geen vaste verantwoordelijkheid.',
  WEDSTRIJD: 'Lease specifiek om mee aan wedstrijden deel te nemen.',
  KOOPOPTIE: 'Lease met de mogelijkheid het paard later te kopen.',
  FOK: 'Lease voor fokdoeleinden.',
}

// Volgorde van de leasevormen voor selects/filters.
export const LEASE_TYPE_OPTIES = Object.keys(LEASE_TYPE_LABELS) as LeaseType[]

export function leaseTypeLabel(type: LeaseType): string {
  return LEASE_TYPE_LABELS[type]
}

// Status van een lease-overeenkomst.
export const LEASE_STATUS_LABELS: Record<LeaseStatus, string> = {
  CONCEPT: 'Concept',
  ACTIEF: 'Actief',
  OPGEZEGD: 'Opgezegd',
  BEEINDIGD: 'Beëindigd',
}

// Badge-variant per status (sluit aan op de bestaande .badge-* klassen).
export const LEASE_STATUS_BADGE: Record<LeaseStatus, string> = {
  CONCEPT: 'badge-neutral',
  ACTIEF: 'badge-success',
  OPGEZEGD: 'badge-warning',
  BEEINDIGD: 'badge-neutral',
}

export function leaseStatusLabel(status: LeaseStatus): string {
  return LEASE_STATUS_LABELS[status]
}
