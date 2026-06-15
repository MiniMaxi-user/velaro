import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth/session'
import { getUserStable, searchHorsesForStables, searchHorsesForOwner } from '@/features/paarden/queries'
import { berekenLeeftijd, GESLACHT_LABELS } from '@/features/paarden/paardHelpers'
import { RelatietypeBadge } from '@/features/paarden/RelatieBadges'
import PaardenZoek from '@/features/paarden/PaardenZoek'
import { isPlatformAdmin, getMemberships } from '@/lib/auth/authorization'
import { getActiveStableId, ALLE_STALLEN } from '@/lib/active-stable'
import { getPaardFotoSignedUrls } from '@/features/paarden/paardFotoStorage'
import type { HorseSex } from '@prisma/client'

// Rendert de avatar-cel: de profielfoto (rond) wanneer aanwezig, anders het
// standaard paard-icoon. fotoUrls is een batch-map (horseId → signed URL).
function PaardAvatar({ naam, url }: { naam: string; url: string | undefined }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={`Foto van ${naam}`} className="paard-foto-avatar" />
  }
  return <span aria-hidden>🐴</span>
}

function leeftijdLabel(dateOfBirth: Date | null): string {
  if (!dateOfBirth) return '—'
  return `${berekenLeeftijd(new Date(dateOfBirth))} jr`
}

export default async function PaardenPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  // Platform admins hebben hun eigen dashboard
  const isAdmin = await isPlatformAdmin(user.id)
  if (isAdmin) redirect('/admin')

  const { q } = await searchParams
  const query = q?.trim() ?? ''
  const heeftZoekterm = query.length > 0

  const activeStableId = await getActiveStableId(user.id)
  const alleStallen = activeStableId === ALLE_STALLEN

  // Modus: alle stallen van de gebruiker
  if (alleStallen) {
    const memberships = await getMemberships(user.id)
    const stableIds = memberships.map((m) => m.stableId)
    const horses = await searchHorsesForStables(stableIds, query)
    const fotoUrls = await getPaardFotoSignedUrls(horses)

    return (
      <>
        <div className="page-header">
          <div className="page-header-left">
            <div className="breadcrumb">
              <Link href="/stal">Dashboard</Link>
              <span className="breadcrumb-sep">›</span>
              <span className="breadcrumb-current">Paarden</span>
            </div>
            <h1 className="page-title">Paarden — <em>Alle stallen</em></h1>
          </div>
          <div className="page-header-actions">
            <Link href="/paarden/nieuw" className="btn-primary">+ Nieuw paard</Link>
          </div>
        </div>

        <div className="kpi-row" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
          <div className="kpi-card">
            <div className="kpi-card-icon">🐴</div>
            <div className="kpi-card-body">
              <div className="kpi-card-value">{horses.length}</div>
              <div className="kpi-card-label">{heeftZoekterm ? 'Zoekresultaten' : 'Totaal paarden'}</div>
              <div className="kpi-card-trend flat">alle stallen</div>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-card-icon navy">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M1 8L8 2l7 6" stroke="var(--velaro-color-navy)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3 8v5h10V8" stroke="var(--velaro-color-navy)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="kpi-card-body">
              <div className="kpi-card-value">{memberships.length}</div>
              <div className="kpi-card-label">Stallen</div>
            </div>
          </div>
        </div>

        <PaardenZoek key={query} initialQuery={query} />

        {horses.length === 0 ? (
          heeftZoekterm ? (
            <div className="empty-state">
              <div className="empty-state__title">Geen paarden gevonden</div>
              <p style={{ color: 'var(--velaro-color-muted)', marginTop: 8 }}>
                Geen paarden komen overeen met &ldquo;{query}&rdquo;.
              </p>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state__title">Nog geen paarden</div>
              <p style={{ color: 'var(--velaro-color-muted)', marginTop: 8 }}>
                Voeg het eerste paard toe.
              </p>
              <div style={{ marginTop: 16 }}>
                <Link href="/paarden/nieuw" className="btn-primary">+ Nieuw paard</Link>
              </div>
            </div>
          )
        ) : (
          <div className="data-grid-wrapper">
            <table className="data-grid">
              <thead>
                <tr>
                  <th>Naam</th>
                  <th>Stal</th>
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
                        <div className="cell-avatar"><PaardAvatar naam={horse.name} url={fotoUrls[horse.id]} /></div>
                        <div>
                          <div className="cell-entity-name">{horse.name}</div>
                          {horse.ueln && (
                            <div className="cell-entity-sub">UELN {horse.ueln}</div>
                          )}
                          {horse.relatietype && (
                            <div style={{ marginTop: 4 }}>
                              <RelatietypeBadge relatietype={horse.relatietype} />
                            </div>
                          )}
                        </div>
                      </Link>
                    </td>
                    <td>
                      <span className="badge badge-neutral">{horse.stable.name}</span>
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

  const stable = await getUserStable(user.id)

  if (stable) {
    const horses = await searchHorsesForStables([stable.id], query)
    const fotoUrls = await getPaardFotoSignedUrls(horses)

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
              <div className="kpi-card-label">{heeftZoekterm ? 'Zoekresultaten' : 'Totaal paarden'}</div>
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

        <PaardenZoek key={query} initialQuery={query} />

        {/* Data grid */}
        {horses.length === 0 ? (
          heeftZoekterm ? (
            <div className="empty-state">
              <div className="empty-state__title">Geen paarden gevonden</div>
              <p style={{ color: 'var(--velaro-color-muted)', marginTop: 8 }}>
                Geen paarden komen overeen met &ldquo;{query}&rdquo;.
              </p>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state__title">Nog geen paarden</div>
              <p style={{ color: 'var(--velaro-color-muted)', marginTop: 8 }}>
                Voeg het eerste paard toe aan {stable.name}.
              </p>
              <div style={{ marginTop: 16 }}>
                <Link href="/paarden/nieuw" className="btn-primary">+ Nieuw paard</Link>
              </div>
            </div>
          )
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
                        <div className="cell-avatar"><PaardAvatar naam={horse.name} url={fotoUrls[horse.id]} /></div>
                        <div>
                          <div className="cell-entity-name">{horse.name}</div>
                          {horse.ueln && (
                            <div className="cell-entity-sub">UELN {horse.ueln}</div>
                          )}
                          {horse.relatietype && (
                            <div style={{ marginTop: 4 }}>
                              <RelatietypeBadge relatietype={horse.relatietype} />
                            </div>
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
  const ownedHorses = await searchHorsesForOwner(user.id, query)
  const fotoUrls = await getPaardFotoSignedUrls(ownedHorses)

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

      {(ownedHorses.length > 0 || heeftZoekterm) && <PaardenZoek key={query} initialQuery={query} />}

      {ownedHorses.length === 0 ? (
        heeftZoekterm ? (
          <div className="empty-state">
            <div className="empty-state__title">Geen paarden gevonden</div>
            <p style={{ color: 'var(--velaro-color-muted)', marginTop: 8 }}>
              Geen paarden komen overeen met &ldquo;{query}&rdquo;.
            </p>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state__title">Nog geen paarden gekoppeld</div>
            <p style={{ color: 'var(--velaro-color-muted)', marginTop: 8 }}>
              De beheerder van uw stal koppelt uw paard aan uw account.
            </p>
          </div>
        )
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
                      <div className="cell-avatar"><PaardAvatar naam={horse.name} url={fotoUrls[horse.id]} /></div>
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
