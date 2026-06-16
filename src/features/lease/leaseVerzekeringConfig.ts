import type { Prisma } from '@prisma/client'

// ── Verzekering & aansprakelijkheid 6:179 BW (Lease 08, #67) ─────────────────
// Opgeslagen als JSON op Lease.config.verzekering (geen schemawijziging). De
// bezitter van een dier is aansprakelijk (art. 6:179 BW); bij (deel)lease sluit dat
// de leaser niet automatisch uit. Daarom een verplichte meeverzekerd-vraag als gate
// vóór een actieve lease.

export type Meeverzekerd = 'JA' | 'NEE'

export type PolisType = 'WA_AVP' | 'ONGEVALLEN_RUITER' | 'PAARD'

export const POLIS_TYPE_LABELS: Record<PolisType, string> = {
  WA_AVP: 'WA / AVP (aansprakelijkheid)',
  ONGEVALLEN_RUITER: 'Ongevallen ruiter',
  PAARD: 'Ziektekosten / casco paard',
}

export const POLIS_TYPE_OPTIES = Object.keys(POLIS_TYPE_LABELS) as PolisType[]

export type Polis = {
  id: string
  type: PolisType
  bestandsnaam: string
  storagePath: string
  uploadedAt: string
}

export type LeaseVerzekering = {
  meeverzekerd: Meeverzekerd | null // is de leaser meeverzekerd op de WA/AVP van de eigenaar?
  risicoAcceptatie: boolean // checklist 6:179 BW
  dekkingOngevallen: boolean // checklist
  risicoBevestigd: boolean // "Ik begrijp het risico" — nodig wanneer niet meeverzekerd
  polissen: Polis[]
}

export const LEGE_VERZEKERING: LeaseVerzekering = {
  meeverzekerd: null,
  risicoAcceptatie: false,
  dekkingOngevallen: false,
  risicoBevestigd: false,
  polissen: [],
}

function isPolisType(v: unknown): v is PolisType {
  return typeof v === 'string' && v in POLIS_TYPE_LABELS
}

export function leesVerzekering(config: Prisma.JsonValue | null | undefined): LeaseVerzekering {
  if (!config || typeof config !== 'object' || Array.isArray(config)) return { ...LEGE_VERZEKERING, polissen: [] }
  const root = config as Record<string, unknown>
  // Eigen sleutel `verzekeringBlok` — botst niet met het vrije-tekstveld
  // `verzekering` uit de contractinhoud (Lease 06).
  const v = root.verzekeringBlok
  if (!v || typeof v !== 'object' || Array.isArray(v)) return { ...LEGE_VERZEKERING, polissen: [] }
  const r = v as Record<string, unknown>

  const polissenRaw = Array.isArray(r.polissen) ? r.polissen : []
  const polissen: Polis[] = polissenRaw
    .map((p): Polis | null => {
      if (!p || typeof p !== 'object') return null
      const o = p as Record<string, unknown>
      if (!isPolisType(o.type) || typeof o.storagePath !== 'string') return null
      return {
        id: typeof o.id === 'string' ? o.id : o.storagePath,
        type: o.type,
        bestandsnaam: typeof o.bestandsnaam === 'string' ? o.bestandsnaam : 'polis',
        storagePath: o.storagePath,
        uploadedAt: typeof o.uploadedAt === 'string' ? o.uploadedAt : new Date().toISOString(),
      }
    })
    .filter((p): p is Polis => p !== null)

  return {
    meeverzekerd: r.meeverzekerd === 'JA' ? 'JA' : r.meeverzekerd === 'NEE' ? 'NEE' : null,
    risicoAcceptatie: r.risicoAcceptatie === true,
    dekkingOngevallen: r.dekkingOngevallen === true,
    risicoBevestigd: r.risicoBevestigd === true,
    polissen,
  }
}

// Gate vóór een actieve lease: meeverzekerd = JA, óf expliciete risicobevestiging.
export function magActiverenVerzekering(v: LeaseVerzekering): boolean {
  return v.meeverzekerd === 'JA' || v.risicoBevestigd
}
