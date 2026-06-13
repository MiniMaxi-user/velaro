import type { ContractStatus, ContractFamily } from '@prisma/client'

// Nederlandse labels voor de contractstatussen. Alleen CONCEPT wordt in STAL-01
// aangemaakt; de overige statussen horen bij latere stories maar zijn hier al
// gelabeld zodat de lijst-weergave volledig is.
export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  CONCEPT: 'Concept',
  AANGEBODEN: 'Aangeboden',
  GEACCEPTEERD: 'Geaccepteerd',
  ACTIEF: 'Actief',
  OPGESCHORT: 'Opgeschort',
  OPZEGGING_LOOPT: 'Opzegging loopt',
  VERLENGD: 'Verlengd',
  BEEINDIGD: 'Beëindigd',
  VERLOPEN: 'Verlopen',
  GEANNULEERD: 'Geannuleerd',
  AFGEWEZEN: 'Afgewezen',
  VERVANGEN: 'Vervangen',
}

// Badge-variant per status. Sluit aan op de bestaande .badge-* klassen.
export const CONTRACT_STATUS_BADGE: Record<ContractStatus, string> = {
  CONCEPT: 'badge-neutral',
  AANGEBODEN: 'badge-gold',
  GEACCEPTEERD: 'badge-gold',
  ACTIEF: 'badge-success',
  OPGESCHORT: 'badge-warning',
  OPZEGGING_LOOPT: 'badge-warning',
  VERLENGD: 'badge-success',
  BEEINDIGD: 'badge-neutral',
  VERLOPEN: 'badge-neutral',
  GEANNULEERD: 'badge-neutral',
  AFGEWEZEN: 'badge-warning',
  VERVANGEN: 'badge-neutral',
}

export const CONTRACT_FAMILY_LABELS: Record<ContractFamily, string> = {
  STALLING: 'Stalling',
  LEASE: 'Lease',
}

// Type-labels. v1 kent alleen FULL_PENSION binnen de stalling-familie.
export const CONTRACT_TYPE_LABELS: Record<string, string> = {
  FULL_PENSION: 'Full pension',
}

export function contractTypeLabel(type: string): string {
  return CONTRACT_TYPE_LABELS[type] ?? type
}
