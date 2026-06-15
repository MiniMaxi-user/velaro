import type { HorseSex, HorseRelatietype, HorseStallingsvorm } from '@prisma/client'

export const DISCIPLINE_OPTIES = [
  'Dressuur',
  'Springen',
  'Eventing',
  'Mennen',
  'Overig',
] as const

export const GESLACHT_LABELS: Record<HorseSex, string> = {
  MARE: 'Merrie',
  STALLION: 'Hengst',
  GELDING: 'Ruin',
}

// As 1 — Relatietype (relatie/eigendom met de stal). Nederlandse UI-labels,
// herbruikbaar in de UI (#104) en de contractmodule (#105).
export const RELATIETYPE_LABELS: Record<HorseRelatietype, string> = {
  STALPAARD: 'Stalpaard',
  PENSIONPAARD: 'Pensionpaard',
  LESPAARD: 'Lespaard',
  LEASEPAARD: 'Leasepaard',
  TRAININGSPAARD: 'Trainingspaard',
  VERKOOPPAARD: 'Verkooppaard',
  FOKPAARD: 'Fokpaard',
  OPFOKPAARD: 'Opfokpaard',
  REVALIDATIEPAARD: 'Revalidatiepaard',
  RUSTPAARD: 'Rustpaard',
}

// As 2 — Stallingsvorm (afgenomen dienst). Nederlandse UI-labels.
export const STALLINGSVORM_LABELS: Record<HorseStallingsvorm, string> = {
  VOLLEDIG_PENSION: 'Volledig pension',
  HALFPENSION: 'Halfpension',
  WEIDESTALLING: 'Weidestalling',
  PADDOCK: 'Paddock',
  TIJDELIJK: 'Tijdelijke stalling',
}

export function berekenLeeftijd(dateOfBirth: Date): number {
  const today = new Date()
  let age = today.getFullYear() - dateOfBirth.getFullYear()
  const m = today.getMonth() - dateOfBirth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < dateOfBirth.getDate())) age--
  return age
}

export function formatDatum(date: Date): string {
  return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function formatDateForInput(date: Date | null): string {
  if (!date) return ''
  return new Date(date).toISOString().split('T')[0]
}

/**
 * Leidt af of een bereider minderjarig is (< 18 jaar op vandaag).
 * Geen geboortedatum → null (geen badge tonen).
 */
export function isMinderjarig(dateOfBirth: Date | null | undefined): boolean | null {
  if (!dateOfBirth) return null
  return berekenLeeftijd(new Date(dateOfBirth)) < 18
}
