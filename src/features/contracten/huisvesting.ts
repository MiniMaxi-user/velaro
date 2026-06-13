import type { Prisma } from '@prisma/client'

// ── Huisvesting & dienstpakket (STAL-03) ─────────────────────────────────────
// Eerste optieblok van het stallingscontract (§3.3). De opties worden als JSON op
// het bestaande Contract.config-veld bewaard onder de sleutel `huisvesting`, zodat
// het schema niet hoeft te migreren. Latere stories (voer/weidegang, prijs) voegen
// hun eigen sleutels aan hetzelfde config-object toe.

// Boxtype-opties met Nederlandse labels.
export const BOXTYPE_LABELS = {
  BINNEN: 'Binnenbox',
  BUITEN: 'Buitenbox',
  PADDOCK: 'Paddockbox',
  GROEP: 'Groepshuisvesting',
} as const

export type Boxtype = keyof typeof BOXTYPE_LABELS

export const BOXTYPE_OPTIES = Object.keys(BOXTYPE_LABELS) as Boxtype[]

export type HuisvestingConfig = {
  boxtype: Boxtype | null
  boxNumber: string | null
  uitmesten: boolean
  opstrooien: boolean
  beddingtype: string | null
  toezicht: string | null
}

// Lege/standaardwaarden zodat het formulier altijd een volledige set velden heeft.
export const LEGE_HUISVESTING: HuisvestingConfig = {
  boxtype: null,
  boxNumber: null,
  uitmesten: false,
  opstrooien: false,
  beddingtype: null,
  toezicht: null,
}

function isBoxtype(value: unknown): value is Boxtype {
  return typeof value === 'string' && value in BOXTYPE_LABELS
}

// Leest de huisvesting-opties defensief uit het config-JSON van een contract.
// Onbekende/ontbrekende velden vallen terug op de lege standaard.
export function leesHuisvesting(config: Prisma.JsonValue | null | undefined): HuisvestingConfig {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return { ...LEGE_HUISVESTING }
  }
  const raw = (config as Record<string, unknown>).huisvesting
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...LEGE_HUISVESTING }
  }
  const h = raw as Record<string, unknown>
  return {
    boxtype: isBoxtype(h.boxtype) ? h.boxtype : null,
    boxNumber: typeof h.boxNumber === 'string' && h.boxNumber.trim() ? h.boxNumber.trim() : null,
    uitmesten: h.uitmesten === true,
    opstrooien: h.opstrooien === true,
    beddingtype:
      typeof h.beddingtype === 'string' && h.beddingtype.trim() ? h.beddingtype.trim() : null,
    toezicht: typeof h.toezicht === 'string' && h.toezicht.trim() ? h.toezicht.trim() : null,
  }
}

export function boxtypeLabel(boxtype: Boxtype | null): string {
  return boxtype ? BOXTYPE_LABELS[boxtype] : '—'
}
