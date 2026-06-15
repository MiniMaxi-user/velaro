import Link from 'next/link'
import type { Horse } from '@prisma/client'
import { GESLACHT_LABELS, berekenLeeftijd } from './paardHelpers'
import { RelatietypeBadge } from './RelatieBadges'

interface Props {
  horse: Horse
}

export default function PaardKaart({ horse }: Props) {
  const leeftijd = horse.dateOfBirth ? berekenLeeftijd(new Date(horse.dateOfBirth)) : null

  return (
    <Link href={`/paarden/${horse.id}`} className="paard-card">
      <div className="paard-card__naam">{horse.name}</div>
      <div className="paard-card__meta">
        {horse.breed && <span>{horse.breed}</span>}
        {horse.sex && <span>{GESLACHT_LABELS[horse.sex]}</span>}
        {leeftijd !== null && <span>{leeftijd} jaar</span>}
      </div>
      {(horse.relatietype || horse.boxNumber) && (
        <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          <RelatietypeBadge relatietype={horse.relatietype} />
          {horse.boxNumber && <span className="paard-card__badge">Box {horse.boxNumber}</span>}
        </div>
      )}
    </Link>
  )
}
