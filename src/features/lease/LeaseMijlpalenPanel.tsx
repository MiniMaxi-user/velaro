import Link from 'next/link'
import type { MijlpaalRegel } from './mijlpaalQueries'
import { URGENTIE_BADGE } from './leaseMijlpalen'
import { formatDatum } from '@/features/paarden/paardHelpers'

// "Aandachtspunten — lease": de eerstvolgende lease-mijlpalen, gesorteerd op datum,
// met urgentie-kleur (Lease 10, #69). Toont niets als er geen mijlpalen zijn.
export default function LeaseMijlpalenPanel({ regels }: { regels: MijlpaalRegel[] }) {
  if (regels.length === 0) return null
  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">Aandachtspunten — lease</span>
        <span className="badge badge-gold">{regels.length}</span>
      </div>
      <div className="panel-body">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {regels.map((r, i) => (
            <Link
              key={i}
              href={`/paarden/${r.horseId}?tab=lease`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                textDecoration: 'none',
                padding: '8px 12px',
                background: 'var(--velaro-color-surf-2)',
                borderRadius: 'var(--velaro-radius-md)',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 500, color: 'var(--velaro-color-navy)' }}>
                  {r.horseName} — {r.label}
                </div>
                <div className="gezondheid-tabel__muted" style={{ fontSize: 'var(--velaro-text-sm)' }}>
                  {r.leaserNaam}
                </div>
              </div>
              <span className={`badge ${URGENTIE_BADGE[r.urgentie]}`} style={{ flexShrink: 0 }}>
                {r.urgentie === 'verstreken' ? 'Verstreken — ' : ''}
                {formatDatum(r.datum)}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
