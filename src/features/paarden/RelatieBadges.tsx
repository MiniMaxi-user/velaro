import type { CSSProperties } from 'react'
import type { HorseRelatietype, HorseStallingsvorm } from '@prisma/client'
import { RELATIETYPE_LABELS, STALLINGSVORM_LABELS } from './paardHelpers'

/**
 * Toont het relatietype van een paard (relatie/eigendom met de stal) als badge.
 * Vervangt de oude EigendomBadge: navy voor stalpaarden, goud voor de overige
 * relatietypes. Geen waarde → geen badge (laat de aanroeper een neutrale "—" tonen).
 */
export function RelatietypeBadge({
  relatietype,
  style,
}: {
  relatietype: HorseRelatietype | null | undefined
  style?: CSSProperties
}) {
  if (!relatietype) return null
  const label = RELATIETYPE_LABELS[relatietype]
  return (
    <span
      className={`badge ${relatietype === 'STALPAARD' ? 'badge-navy' : 'badge-gold'}`}
      aria-label={`Relatietype: ${label}`}
      title={`Relatietype: ${label}`}
      style={style}
    >
      {label}
    </span>
  )
}

/**
 * Toont de stallingsvorm (afgenomen dienst) van een paard als neutrale badge.
 * Geen waarde → geen badge.
 */
export function StallingsvormBadge({
  stallingsvorm,
  style,
}: {
  stallingsvorm: HorseStallingsvorm | null | undefined
  style?: CSSProperties
}) {
  if (!stallingsvorm) return null
  const label = STALLINGSVORM_LABELS[stallingsvorm]
  return (
    <span
      className="badge badge-neutral"
      aria-label={`Stallingsvorm: ${label}`}
      title={`Stallingsvorm: ${label}`}
      style={style}
    >
      {label}
    </span>
  )
}
