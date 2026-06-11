import Link from 'next/link'
import { getAdminDashboardStats } from '@/features/admin/queries'

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('nl-NL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

export default async function AdminDashboardPage() {
  const stats = await getAdminDashboardStats()

  return (
    <>
      {/* Page header */}
      <div className="page-header">
        <div className="page-header-left">
          <div className="breadcrumb">
            <span className="breadcrumb-current">Admin</span>
            <span className="breadcrumb-sep">›</span>
            <span className="breadcrumb-current">Dashboard</span>
          </div>
          <h1 className="page-title">Platform<em>overzicht</em></h1>
        </div>
      </div>

      {/* KPI cards */}
      <div className="kpi-row">
        <div className="kpi-card">
          <div className="kpi-card-icon">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M1 9L9 2l8 7" stroke="var(--velaro-color-gold-2)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3 9v7h12V9" stroke="var(--velaro-color-gold-2)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="kpi-card-body">
            <div className="kpi-card-value">{stats.totalStables}</div>
            <div className="kpi-card-label">Stallen</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-icon">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M2 15c0-3.5 2-6 5-6h4c3 0 5 2.5 5 6" stroke="var(--velaro-color-gold-2)" strokeWidth="1.4" strokeLinecap="round"/>
              <circle cx="9" cy="6" r="3.5" stroke="var(--velaro-color-gold-2)" strokeWidth="1.4"/>
            </svg>
          </div>
          <div className="kpi-card-body">
            <div className="kpi-card-value">{stats.totalHorses}</div>
            <div className="kpi-card-label">Paarden</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-icon navy">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="7" cy="6" r="2.5" stroke="var(--velaro-color-navy)" strokeWidth="1.4"/>
              <path d="M2 16c0-2.5 2-4 5-4" stroke="var(--velaro-color-navy)" strokeWidth="1.4" strokeLinecap="round"/>
              <circle cx="13" cy="6" r="2" stroke="var(--velaro-color-navy)" strokeWidth="1.3"/>
              <path d="M11 16c0-2 1-3.5 3-3.5" stroke="var(--velaro-color-navy)" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="kpi-card-body">
            <div className="kpi-card-value">{stats.totalOwnerAccounts}</div>
            <div className="kpi-card-label">Eigenaar-accounts</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-icon success">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="7" r="3" stroke="var(--velaro-color-success)" strokeWidth="1.4"/>
              <path d="M4 16c0-2.5 2-4 5-4s5 1.5 5 4" stroke="var(--velaro-color-success)" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="kpi-card-body">
            <div className="kpi-card-value">{stats.totalHorseOwners}</div>
            <div className="kpi-card-label">Paardeneigenaren</div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: 14 }}>
        <Link href="/admin/eigenaren" className="stal-actie-kaart">
          <div className="stal-actie-kaart__icon">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="8" cy="7" r="3" stroke="var(--velaro-color-gold-2)" strokeWidth="1.4"/>
              <path d="M3 18c0-3 2-5 5-5" stroke="var(--velaro-color-gold-2)" strokeWidth="1.4" strokeLinecap="round"/>
              <path d="M15 12v6M12 15h6" stroke="var(--velaro-color-gold-2)" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="stal-actie-kaart__tekst">
            <div className="stal-actie-kaart__titel">Eigenaren</div>
            <div className="stal-actie-kaart__sub">{stats.totalOwnerAccounts} accounts</div>
          </div>
        </Link>

        <Link href="/admin/stallen" className="stal-actie-kaart">
          <div className="stal-actie-kaart__icon">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M1 10L10 2l9 8" stroke="var(--velaro-color-gold-2)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3 10v8h14v-8" stroke="var(--velaro-color-gold-2)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="stal-actie-kaart__tekst">
            <div className="stal-actie-kaart__titel">Stallen</div>
            <div className="stal-actie-kaart__sub">{stats.totalStables} stallen</div>
          </div>
        </Link>

        <Link href="/admin/paarden" className="stal-actie-kaart">
          <div className="stal-actie-kaart__icon">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M2 17c0-4 3-7 6-7h4c3 0 6 3 6 7" stroke="var(--velaro-color-gold-2)" strokeWidth="1.4" strokeLinecap="round"/>
              <circle cx="10" cy="7" r="4" stroke="var(--velaro-color-gold-2)" strokeWidth="1.4"/>
            </svg>
          </div>
          <div className="stal-actie-kaart__tekst">
            <div className="stal-actie-kaart__titel">Paarden</div>
            <div className="stal-actie-kaart__sub">{stats.totalHorses} paarden</div>
          </div>
        </Link>

        <Link href="/admin/eigenaren/nieuw" className="stal-actie-kaart">
          <div className="stal-actie-kaart__icon">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="9" cy="8" r="3" stroke="var(--velaro-color-gold-2)" strokeWidth="1.4"/>
              <path d="M4 18c0-3 2-5 5-5" stroke="var(--velaro-color-gold-2)" strokeWidth="1.4" strokeLinecap="round"/>
              <path d="M15 12v6M12 15h6" stroke="var(--velaro-color-gold-2)" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="stal-actie-kaart__tekst">
            <div className="stal-actie-kaart__titel">Nieuw account</div>
            <div className="stal-actie-kaart__sub">Eigenaar aanmaken</div>
          </div>
        </Link>
      </div>

      {/* Two-column panels */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Recent toegevoegde stallen */}
        <div className="panel">
          <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="panel-title">Recente stallen</span>
            <Link href="/admin/stallen" style={{ fontSize: 12, color: 'var(--velaro-color-gold-2)' }}>
              Alle stallen
            </Link>
          </div>
          {stats.recentStables.length === 0 ? (
            <div className="empty-state" style={{ padding: '16px 0' }}>
              <div style={{ color: 'var(--velaro-color-muted)', fontSize: 13 }}>
                Nog geen stallen op het platform.
              </div>
            </div>
          ) : (
            <div className="data-grid-wrapper" style={{ marginTop: 0 }}>
              <table className="data-grid">
                <thead>
                  <tr>
                    <th>Stal</th>
                    <th>Eigenaar</th>
                    <th>Paarden</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentStables.map((stable) => {
                    const owner = stable.members[0]?.user
                    return (
                      <tr key={stable.id}>
                        <td>
                          <div className="cell-entity-name">{stable.name}</div>
                          {stable.members[0]?.user?.email && (
                            <div className="cell-entity-sub" style={{ fontSize: 11 }}>
                              {formatDate(stable.createdAt)}
                            </div>
                          )}
                        </td>
                        <td style={{ color: 'var(--velaro-color-muted)', fontSize: 12 }}>
                          {owner ? (owner.name ?? owner.email) : '—'}
                        </td>
                        <td>
                          <span className="badge badge-neutral">{stable._count.horses}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recente gebruikers */}
        <div className="panel">
          <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="panel-title">Recente accounts</span>
            <Link href="/admin/eigenaren" style={{ fontSize: 12, color: 'var(--velaro-color-gold-2)' }}>
              Alle accounts
            </Link>
          </div>
          {stats.recentOwners.length === 0 ? (
            <div className="empty-state" style={{ padding: '16px 0' }}>
              <div style={{ color: 'var(--velaro-color-muted)', fontSize: 13 }}>
                Nog geen accounts aangemaakt.
              </div>
            </div>
          ) : (
            <div className="data-grid-wrapper" style={{ marginTop: 0 }}>
              <table className="data-grid">
                <thead>
                  <tr>
                    <th>Naam</th>
                    <th>Stallen</th>
                    <th>Aangemaakt</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentOwners.map((owner) => (
                    <tr key={owner.id}>
                      <td>
                        <div className="cell-entity">
                          <div className="cell-avatar" style={{ width: 28, height: 28, fontSize: 11 }}>
                            {(owner.name ?? owner.email).slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="cell-entity-name">{owner.name ?? '—'}</div>
                            <div className="cell-entity-sub" style={{ fontSize: 11 }}>{owner.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-neutral">
                          {owner._count.stableMemberships}/{owner.maxStables}
                        </span>
                      </td>
                      <td style={{ color: 'var(--velaro-color-muted)', fontSize: 12 }}>
                        {formatDate(owner.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
