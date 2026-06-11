import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserStable, getHorsesForStable, getHorsesForOwner } from '@/features/paarden/queries'
import { berekenLeeftijd, GESLACHT_LABELS } from '@/features/paarden/paardHelpers'
import type { HorseSex } from '@prisma/client'

function leeftijdLabel(dateOfBirth: Date | null): string {
  if (!dateOfBirth) return '—'
  return `${berekenLeeftijd(new Date(dateOfBirth))} jr`
}

export default async function PaardenPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const stable = await getUserStable(user.id)

  if (stable) {
    const horses = await getHorsesForStable(stable.id)

    return (
      <>
        {/* Page header */}
        <div className="page-header">
          <div className="page-header-left">
            <div className="breadcrumb">
              <Link href="/stal">Dashboard</Link>
              <span className="breadcrumb-sep">›</span>
              <span className="breadcrumb-current">Paarden</span>
            </div>
            <h1 className="page-title">Paarden <em>{stable.name}</em></h1>
          </div>
          <div className="page-header-actions">
            <Link href="/paarden/nieuw" className="btn-primary">+ Nieuw paard</Link>
          </div>
        </div>

        {/* KPI */}
        <div className="kpi-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <div className="kpi-card">
            <div className="kpi-card-icon">🐴</div>
            <div className="kpi-card-body">
              <div className="kpi-card-value">{horses.length}</div>
              <div className="kpi-card-label">Totaal paarden</div>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-card-icon navy">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 2v7l4 2" stroke="var(--velaro-color-navy)" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="9" cy="9" r="7" stroke="var(--velaro-color-navy)" strokeWidth="1.5"/>
              </svg>
            </div>
            <div className="kpi-card-body">
              <div className="kpi-card-value">{stable.name}</div>
              <div className="kpi-card-label">Stal</div>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-card-icon success">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M4 9l4 4 6-7" stroke="var(--velaro-color-success)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="kpi-card-body">
              <div className="kpi-card-value">{horses.filter(h => h.discipline).length}</div>
              <div className="kpi-card-label">Met discipline</div>
            </div>
          </div>
        </div>

        {/* Data grid */}
        {horses.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__title">Nog geen paarden</div>
            <p style={{ color: 'var(--velaro-color-muted)', marginTop: 8 }}>
              Voeg het eerste paard toe aan {stable.name}.
            </p>
            <div style={{ marginTop: 16 }}>
              <Link href="/paarden/nieuw" className="btn-primary">+ Nieuw paard</Link>
            </div>
          </div>
        ) : (
          <div className="data-grid-wrapper">
            <table className="data-grid">
              <thead>
                <tr>
                  <th>Naam</th>
                  <th>Ras</th>
                  <th>Leeftijd</th>
                  <th>Geslacht</th>
                  <th>Discipline</th>
                  <th>Box</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {horses.map((horse) => (
                  <tr key={horse.id}>
                    <td>
                      <Link href={`/paarden/${horse.id}`} className="cell-entity" style={{ textDecoration: 'none' }}>
                        <div className="cell-avatar">🐴</div>
                        <div>
                          <div className="cell-entity-name">{horse.name}</div>
                          {horse.ueln && (
                            <div className="cell-entity-sub">UELN {horse.ueln}</div>
                          )}
                        </div>
                      </Link>
                    </td>
                    <td>{horse.breed ?? <span style={{ color: 'var(--velaro-color-muted-2)' }}>—</span>}</td>
                    <td>{leeftijdLabel(horse.dateOfBirth)}</td>
                    <td>{horse.sex ? GESLACHT_LABELS[horse.sex as HorseSex] : <span style={{ color: 'var(--velaro-color-muted-2)' }}>—</span>}</td>
                    <td>
                      {horse.discipline ? (
                        <span className="badge badge-gold">{horse.discipline}</span>
                      ) : (
                        <span style={{ color: 'var(--velaro-color-muted-2)' }}>—</span>
                      )}
                    </td>
                    <td>
                      {horse.boxNumber ? (
                        <span className="badge badge-neutral">Box {horse.boxNumber}</span>
                      ) : (
                        <span style={{ color: 'var(--velaro-color-muted-2)' }}>—</span>
                      )}
                    </td>
                    <td>
                      <div className="row-actions">
                        <Link href={`/paarden/${horse.id}`} className="btn-icon" title="Bekijken">
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M1 7s2-4 6-4 6 4 6 4-2 4-6 4-6-4-6-4Z" stroke="currentColor" strokeWidth="1.3"/>
                            <circle cx="7" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.3"/>
                          </svg>
                        </Link>
                        <Link href={`/paarden/${horse.id}/bewerken`} className="btn-icon" title="Bewerken">
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M9.5 2.5l2 2L4 12H2v-2L9.5 2.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
                          </svg>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </>
    )
  }

  // Paardeneigenaar
  const ownedHorses = await getHorsesForOwner(user.id)

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div className="breadcrumb">
            <span className="breadcrumb-current">Mijn paarden</span>
          </div>
          <h1 className="page-title">Mijn <em>paarden</em></h1>
        </div>
      </div>

      {ownedHorses.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__title">Nog geen paarden gekoppeld</div>
          <p style={{ color: 'var(--velaro-color-muted)', marginTop: 8 }}>
            De beheerder van uw stal koppelt uw paard aan uw account.
          </p>
        </div>
      ) : (
        <div className="data-grid-wrapper">
          <table className="data-grid">
            <thead>
              <tr>
                <th>Naam</th>
                <th>Ras</th>
                <th>Leeftijd</th>
                <th>Discipline</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {ownedHorses.map((horse) => (
                <tr key={horse.id}>
                  <td>
                    <Link href={`/paarden/${horse.id}`} className="cell-entity" style={{ textDecoration: 'none' }}>
                      <div className="cell-avatar">🐴</div>
                      <div>
                        <div className="cell-entity-name">{horse.name}</div>
                      </div>
                    </Link>
                  </td>
                  <td>{horse.breed ?? '—'}</td>
                  <td>{leeftijdLabel(horse.dateOfBirth)}</td>
                  <td>
                    {horse.discipline ? (
                      <span className="badge badge-gold">{horse.discipline}</span>
                    ) : '—'}
                  </td>
                  <td>
                    <div className="row-actions">
                      <Link href={`/paarden/${horse.id}`} className="btn-icon" title="Bekijken">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M1 7s2-4 6-4 6 4 6 4-2 4-6 4-6-4-6-4Z" stroke="currentColor" strokeWidth="1.3"/>
                          <circle cx="7" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.3"/>
                        </svg>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
