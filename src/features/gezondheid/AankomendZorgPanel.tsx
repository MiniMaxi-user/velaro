import Link from 'next/link'
import type { GezondheidActie } from './queries'
import { formatDatum } from '@/features/paarden/paardHelpers'

interface Props {
  acties: GezondheidActie[]
}

export default function AankomendZorgPanel({ acties }: Props) {
  const aantalVerlopen = acties.filter((a) => a.isVerlopen).length

  return (
    <div className="panel">
      <div className="panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="panel-title">Aankomende zorg</span>
          {aantalVerlopen > 0 && (
            <span className="badge badge-warning">{aantalVerlopen} verlopen</span>
          )}
        </div>
      </div>
      <div className="panel-body">
        {acties.length === 0 ? (
          <p style={{ color: 'var(--velaro-color-muted)', fontSize: 'var(--velaro-text-sm)', margin: 0 }}>
            Alle gezondheidsacties zijn bijgewerkt.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {acties.map((actie) => (
              <div
                key={actie.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  background: 'var(--velaro-color-surf-2)',
                  borderRadius: 'var(--velaro-radius-md)',
                  fontSize: 'var(--velaro-text-sm)',
                }}
              >
                {actie.isVerlopen ? (
                  <span className="badge badge-warning" style={{ flexShrink: 0 }}>Verlopen</span>
                ) : (
                  <span className="badge badge-neutral" style={{ flexShrink: 0 }}>
                    {formatDatum(actie.nextDate)}
                  </span>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Link
                    href={`/paarden/${actie.horseId}`}
                    style={{
                      fontWeight: 600,
                      color: 'var(--velaro-color-navy)',
                      textDecoration: 'none',
                    }}
                  >
                    {actie.horseName}
                  </Link>
                  <span style={{ color: 'var(--velaro-color-muted)', marginLeft: 6 }}>
                    {actie.type === 'vaccinatie' ? 'Vaccinatie' : 'Ontworming'}
                    {actie.omschrijving ? ` — ${actie.omschrijving}` : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
