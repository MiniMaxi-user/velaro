import type { Prisma } from '@prisma/client'

// ── Bijlagen & extra diensten / prijslijst (STAL-16) ─────────────────────────
// Sluit de laatste onderdelen van §3.0/§3.3 af: het blok "Bijlagen" en het deel
// "Extra diensten / prijslijst" van de pensionprijs.
//
// - De *bestanden* van de bijlagen worden niet hier bewaard maar als aparte
//   ContractBijlage-records (Supabase Storage). Hier leggen we enkel de
//   *instelling* "stalreglement verplicht" vast onder config.bijlagen.
// - De *extra diensten* (prijslijst) zijn gestructureerde data — geen bestand — en
//   worden als JSON onder config.extraDiensten bewaard. Net als bij de andere
//   optieblokken (dienstpakket/prijsLooptijd) volgen we het patroon met een
//   defensieve lees-functie en een LEEG_…-default, zodat het schema voor deze
//   config-data niet hoeft te migreren.

// ── Bijlage-categorieën ──────────────────────────────────────────────────────

export const BIJLAGE_CATEGORIE_LABELS = {
  STALREGLEMENT: 'Stalreglement',
  VOERSCHEMA: 'Voerschema',
  PRIJSLIJST: 'Prijslijst',
  VERZEKERINGSPOLIS: 'Kopie verzekeringspolis',
} as const

export type BijlageCategorie = keyof typeof BIJLAGE_CATEGORIE_LABELS

export const BIJLAGE_CATEGORIE_OPTIES = Object.keys(
  BIJLAGE_CATEGORIE_LABELS,
) as BijlageCategorie[]

export function isBijlageCategorie(value: unknown): value is BijlageCategorie {
  return typeof value === 'string' && value in BIJLAGE_CATEGORIE_LABELS
}

export function bijlageCategorieLabel(categorie: string): string {
  return isBijlageCategorie(categorie)
    ? BIJLAGE_CATEGORIE_LABELS[categorie]
    : categorie
}

// ── Bijlagen-instellingen (config.bijlagen) ──────────────────────────────────
// Voorlopig één instelling: of een stalreglement-bijlage verplicht is voordat het
// contract aangeboden mag worden (poort in STAL-08).

export type BijlagenConfig = {
  stalreglementVerplicht: boolean
}

export const LEGE_BIJLAGEN: BijlagenConfig = {
  stalreglementVerplicht: false,
}

export function leesBijlagenConfig(
  config: Prisma.JsonValue | null | undefined,
): BijlagenConfig {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return { ...LEGE_BIJLAGEN }
  }
  const root = (config as Record<string, unknown>).bijlagen
  if (!root || typeof root !== 'object' || Array.isArray(root)) {
    return { ...LEGE_BIJLAGEN }
  }
  const r = root as Record<string, unknown>
  return {
    stalreglementVerplicht: r.stalreglementVerplicht === true,
  }
}

// ── Extra diensten / prijslijst (config.extraDiensten) ───────────────────────
// Een lijst van posten naast de reguliere pensionprijs (STAL-05). Per post een
// omschrijving, een bedrag en een frequentie. Geen facturatie/inning — enkel
// vastgelegde data over wat los gefactureerd kan worden.

export const FREQUENTIE_LABELS = {
  EENMALIG: 'Eenmalig',
  PER_MAAND: 'Per maand',
  PER_JAAR: 'Per jaar',
  PER_KEER: 'Per keer',
} as const

export type Frequentie = keyof typeof FREQUENTIE_LABELS

export const FREQUENTIE_OPTIES = Object.keys(FREQUENTIE_LABELS) as Frequentie[]

export function isFrequentie(value: unknown): value is Frequentie {
  return typeof value === 'string' && value in FREQUENTIE_LABELS
}

export function frequentieLabel(frequentie: Frequentie): string {
  return FREQUENTIE_LABELS[frequentie]
}

export type ExtraDienst = {
  omschrijving: string
  bedrag: number
  frequentie: Frequentie
}

export type ExtraDienstenConfig = {
  posten: ExtraDienst[]
}

export const LEGE_EXTRA_DIENSTEN: ExtraDienstenConfig = {
  posten: [],
}

function getalOfNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value.replace(',', '.'))
    return Number.isFinite(n) ? n : null
  }
  return null
}

// Leest de prijslijst (extra diensten) defensief uit het config-JSON. Onvolledige
// posten (zonder omschrijving of zonder geldig bedrag) worden overgeslagen.
export function leesExtraDiensten(
  config: Prisma.JsonValue | null | undefined,
): ExtraDienstenConfig {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return { posten: [] }
  }
  const ruw = (config as Record<string, unknown>).extraDiensten
  const root =
    ruw && typeof ruw === 'object' && !Array.isArray(ruw)
      ? (ruw as Record<string, unknown>)
      : {}
  const postenRaw = Array.isArray(root.posten) ? root.posten : []

  const posten: ExtraDienst[] = []
  for (const p of postenRaw) {
    if (!p || typeof p !== 'object' || Array.isArray(p)) continue
    const rec = p as Record<string, unknown>
    const omschrijving =
      typeof rec.omschrijving === 'string' ? rec.omschrijving.trim() : ''
    const bedrag = getalOfNull(rec.bedrag)
    if (!omschrijving || bedrag === null) continue
    const frequentie: Frequentie = isFrequentie(rec.frequentie)
      ? rec.frequentie
      : 'PER_MAAND'
    posten.push({ omschrijving, bedrag, frequentie })
  }

  return { posten }
}

// Geeft een bedrag als geformatteerde euro-string terug.
export function formatExtraDienstBedrag(bedrag: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
  }).format(bedrag)
}
