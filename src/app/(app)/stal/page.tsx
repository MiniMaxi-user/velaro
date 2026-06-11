import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserStable, getHorsesForStable } from '@/features/paarden/queries'
import { getTaskCountsForDate } from '@/features/taken/queries'
import { getStableRole, canCreateStable } from '@/lib/auth/authorization'
import { getAankomendGezondheidActies } from '@/features/gezondheid/queries'
import AankomendZorgPanel from '@/features/gezondheid/AankomendZorgPanel'

function toDateParam(d: Date) {
  return d.toISOString().slice(0, 10)
}

export default async function StalPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [stable, canCreate] = await Promise.all([
    getUserStable(user.id),
    canCreateStable(user.id),
  ])

  if (!stable) {
    return (
      <div className="empty-state">
        <div className="empty-state__title">Geen actieve stal</div>
        <p style={{ color: 'var(--velaro-color-muted)', marginTop: 8 }}>
          Je bent nog niet aan een stal gekoppeld.
        </p>
        {canCreate && (
          <div style={{ marginTop: 16 }}>
            <Link href="/stallen/nieuw" className="btn-primary">Eerste stal aanmaken</Link>
          </div>
        )}
        <div style={{ marginTop: 12 }}>
          <Link href="/stallen" className="btn-ghost">Mijn stallen</Link>
        </div>
      </div>
    )
  }

  const today = new Date()
  const [horses, role, takenVandaag, zorgActies] = await Promise.all([
    getHorsesForStable(stable.id),
    getStableRole(user.id, stable.id),
    getTaskCountsForDate(stable.id, today),
    getAankomendGezondheidActies(stable.id, 30),
  ])

  const isOwner = role === 'OWNER'
  const openTaken = takenVandaag.total - takenVandaag.completed
  const verlopenZorg = zorgActies.filter((a) => a.isVerlopen).length

  return (
    <>
      {/* Page header */}
      <div className="page-header">
        <div className="page-header-left">
          <div className="breadcrumb">
            <span className="breadcrumb-current">Dashboard</span>
          </div>
          <h1 className="page-title"><em>{stable.name}</em></h1>
        </div>
        <div className="page-header-actions">
          <Link href="/paarden/nieuw" className="btn-primary">+ Nieuw paard</Link>
        </div>
      </div>

      {/* KPI cards */}
      <div className="kpi-row">
        <div className="kpi-card">
          <div className="kpi-card-icon">🐴</div>
          <div className="kpi-card-body">
            <div className="kpi-card-value">{horses.length}</div>
            <div className="kpi-card-label">Paarden</div>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-icon amber">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="2" y="4" width="14" height="12" rx="2" stroke="var(--velaro-color-warning)" strokeWidth="1.4"/>
              <path d="M5 2v4M13 2v4M2 8h14" stroke="var(--velaro-color-warning)" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="kpi-card-body">
            <div className="kpi-card-value">{openTaken}</div>
            <div className="kpi-card-label">Open taken vandaag</div>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-icon success">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M4 9l4 4 6-7" stroke="var(--velaro-color-success)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="kpi-card-body">
            <div className="kpi-card-value">
              {takenVandaag.total > 0
                ? `${takenVandaag.completed}/${takenVandaag.total}`
                : '—'}
            </div>
            <div className="kpi-card-label">Taken afgerond</div>
          </div>
        </div>
        {isOwner && (
          <div className="kpi-card">
            <div className="kpi-card-icon navy">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle cx="7" cy="6" r="3" stroke="var(--velaro-color-navy)" strokeWidth="1.4"/>
                <path d="M2 16c0-3 2-5 5-5" stroke="var(--velaro-color-navy)" strokeWidth="1.4" strokeLinecap="round"/>
                <path d="M12 11v6M9 14h6" stroke="var(--velaro-color-navy)" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="kpi-card-body">
              <div className="kpi-card-value">
                <Link href="/stal/leden" style={{ color: 'inherit', textDecoration: 'none' }}>Team</Link>
              </div>
              <div className="kpi-card-label">Leden beheren</div>
            </div>
          </div>
        )}
        {role !== null && (
          <div className="kpi-card">
            <div className={`kpi-card-icon ${verlopenZorg > 0 ? 'amber' : 'success'}`}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 3v5l3 3" stroke={verlopenZorg > 0 ? 'var(--velaro-color-warning)' : 'var(--velaro-color-success)'} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="9" cy="9" r="7" stroke={verlopenZorg > 0 ? 'var(--velaro-color-warning)' : 'var(--velaro-color-success)'} strokeWidth="1.4"/>
              </svg>
            </div>
            <div className="kpi-card-body">
              <div className="kpi-card-value" style={verlopenZorg > 0 ? { color: 'var(--velaro-color-warning)' } : undefined}>
                {verlopenZorg > 0 ? verlopenZorg : zorgActies.length}
              </div>
              <div className="kpi-card-label">
                {verlopenZorg > 0 ? 'Verlopen zorg' : 'Aankomende zorg (30d)'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: 14 }}>
        <Link href={`/stal/taken?datum=${toDateParam(today)}`} className="stal-actie-kaart">
          <div className="stal-actie-kaart__icon">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M4 10l5 5 7-8" stroke="var(--velaro-color-gold-2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="stal-actie-kaart__tekst">
            <div className="stal-actie-kaart__titel">Taken vandaag</div>
            <div className="stal-actie-kaart__sub">
              {openTaken > 0 ? `${openTaken} openstaand` : 'Alles gedaan'}
            </div>
          </div>
        </Link>
        <Link href="/paarden" className="stal-actie-kaart">
          <div className="stal-actie-kaart__icon">🐴</div>
          <div className="stal-actie-kaart__tekst">
            <div className="stal-actie-kaart__titel">Paarden</div>
            <div className="stal-actie-kaart__sub">{horses.length} in de stal</div>
          </div>
        </Link>
        {isOwner && (
          <Link href="/stal/leden" className="stal-actie-kaart">
            <div className="stal-actie-kaart__icon">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="8" cy="7" r="3" stroke="var(--velaro-color-gold-2)" strokeWidth="1.4"/>
                <path d="M3 18c0-3 2-5 5-5h4" stroke="var(--velaro-color-gold-2)" strokeWidth="1.4" strokeLinecap="round"/>
                <path d="M15 12v6M12 15h6" stroke="var(--velaro-color-gold-2)" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="stal-actie-kaart__tekst">
              <div className="stal-actie-kaart__titel">Team</div>
              <div className="stal-actie-kaart__sub">Beheer medewerkers</div>
            </div>
          </Link>
        )}
      </div>

      {/* Aankomende zorg */}
      {role !== null && (
        <AankomendZorgPanel acties={zorgActies} />
      )}

      {/* Stalbewoners */}
      {horses.length > 0 && (
        <div>
          <div style={{ marginBottom: 10 }}>
            <span className="label">Stalbewoners</span>
          </div>
          <div className="data-grid-wrapper">
            <table className="data-grid">
              <thead>
                <tr>
                  <th>Naam</th>
                  <th>Ras</th>
                  <th>Box</th>
                  <th>Discipline</th>
                </tr>
              </thead>
              <tbody>
                {horses.map((horse) => (
                  <tr key={horse.id}>
                    <td>
                      <Link href={`/paarden/${horse.id}`} className="cell-entity" style={{ textDecoration: 'none' }}>
                        <div className="cell-avatar">🐴</div>
                        <div className="cell-entity-name">{horse.name}</div>
                      </Link>
                    </td>
                    <td style={{ color: 'var(--velaro-color-muted)' }}>{horse.breed ?? '—'}</td>
                    <td>
                      {horse.boxNumber
                        ? <span className="badge badge-neutral">Box {horse.boxNumber}</span>
                        : <span style={{ color: 'var(--velaro-color-muted-2)' }}>—</span>}
                    </td>
                    <td>
                      {horse.discipline
                        ? <span className="badge badge-gold">{horse.discipline}</span>
                        : <span style={{ color: 'var(--velaro-color-muted-2)' }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
