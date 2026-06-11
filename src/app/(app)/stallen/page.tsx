import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getUserOwnedStables } from '@/features/stallen/queries'
import { canCreateStable } from '@/lib/auth/authorization'

export default async function StallenPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [memberships, dbUser, canCreate] = await Promise.all([
    getUserOwnedStables(user.id),
    prisma.user.findUnique({ where: { id: user.id }, select: { maxStables: true, isPlatformAdmin: true } }),
    canCreateStable(user.id),
  ])

  const quotumLabel = dbUser?.isPlatformAdmin
    ? 'Onbeperkt'
    : `${memberships.length} / ${dbUser?.maxStables ?? 0}`

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div className="breadcrumb">
            <span className="breadcrumb-current">Mijn stallen</span>
          </div>
          <h1 className="page-title">Mijn <em>stallen</em></h1>
        </div>
        <div className="page-header-actions">
          {!canCreate && memberships.length > 0 && (
            <span style={{ fontSize: 13, color: 'var(--velaro-color-muted)', whiteSpace: 'nowrap' }}>
              Limiet bereikt ({memberships.length}/{dbUser?.maxStables})
            </span>
          )}
          {canCreate ? (
            <Link href="/stallen/nieuw" className="btn-primary">+ Nieuwe stal</Link>
          ) : (
            <span
              className="btn-primary"
              style={{ opacity: 0.5, cursor: 'not-allowed' }}
              title="Je hebt het maximale aantal stallen bereikt. Neem contact op met Velaro om je quotum te verhogen."
            >
              + Nieuwe stal
            </span>
          )}
        </div>
      </div>

      <div className="kpi-row" style={{ gridTemplateColumns: 'repeat(2, 1fr)', maxWidth: 400 }}>
        <div className="kpi-card">
          <div className="kpi-card-body">
            <div className="kpi-card-value">{memberships.length}</div>
            <div className="kpi-card-label">Stallen</div>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-body">
            <div className="kpi-card-value">{quotumLabel}</div>
            <div className="kpi-card-label">Quotum</div>
          </div>
        </div>
      </div>

      {memberships.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__title">Nog geen stallen</div>
          <p style={{ color: 'var(--velaro-color-muted)', marginTop: 8 }}>
            Maak je eerste stal aan om aan de slag te gaan.
          </p>
          {canCreate && (
            <div style={{ marginTop: 16 }}>
              <Link href="/stallen/nieuw" className="btn-primary">+ Eerste stal aanmaken</Link>
            </div>
          )}
          {!canCreate && (
            <p style={{ color: 'var(--velaro-color-amber)', marginTop: 12, fontSize: 14 }}>
              Je hebt nog geen quotum. Neem contact op met Velaro.
            </p>
          )}
        </div>
      ) : (
        <div className="data-grid-wrapper">
          <table className="data-grid">
            <thead>
              <tr>
                <th>Stal</th>
                <th>Stad</th>
                <th>Paarden</th>
                <th>Leden</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {memberships.map(({ stable }) => (
                <tr key={stable.id}>
                  <td>
                    <div className="cell-entity">
                      <div className="cell-avatar">🏠</div>
                      <div className="cell-entity-name">{stable.name}</div>
                    </div>
                  </td>
                  <td style={{ color: 'var(--velaro-color-muted)' }}>{stable.city ?? '—'}</td>
                  <td><span className="badge badge-neutral">{stable._count.horses}</span></td>
                  <td><span className="badge badge-neutral">{stable._count.members}</span></td>
                  <td>
                    <div className="row-actions">
                      <Link href="/stal" className="btn-icon" title="Bekijken">
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
