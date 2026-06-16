import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth/session'
import { canViewHorse, getStableRole } from '@/lib/auth/authorization'
import { getHorse } from '@/features/paarden/queries'
import { getClaimsVoorWeek } from '@/features/lease/kalenderQueries'
import { claimDagdeel, releaseDagdeel } from '@/features/lease/kalenderActions'
import {
  DAGDELEN,
  DAGDEEL_LABELS,
  DAG_LABELS,
  weekDagen,
  ymd,
  formatDagLabel,
} from '@/features/lease/kalenderHelpers'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ week?: string }>
}

const KLEUREN = ['#BEA256', '#1A2B4A', '#5B8C7B', '#B5705A', '#6E74B0', '#9A6FA8']

export default async function BeschikbaarheidPage({ params, searchParams }: Props) {
  const { id } = await params
  const { week } = await searchParams

  const user = await getAuthUser()
  if (!user) redirect('/login')

  const horse = await getHorse(id)
  if (!horse) notFound()
  if (!(await canViewHorse(user.id, id))) notFound()

  const isStal = (await getStableRole(user.id, horse.stableId)) !== null

  const weekOffset = Number.isFinite(Number(week)) ? parseInt(week ?? '0', 10) : 0
  const dagen = weekDagen(weekOffset)
  const claims = await getClaimsVoorWeek(id, ymd(dagen[0]), ymd(dagen[6]))

  // Claim-map + kleur per persoon.
  const claimMap = new Map<string, (typeof claims)[number]>()
  for (const c of claims) claimMap.set(`${ymd(c.datum)}|${c.dagdeel}`, c)

  const personen = Array.from(new Map(claims.map((c) => [c.user.id, c.user])).values())
  const kleurVan = (userId: string) => KLEUREN[personen.findIndex((p) => p.id === userId) % KLEUREN.length]

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div className="breadcrumb">
            <Link href={`/paarden/${id}`}>{horse.name}</Link>
            <span className="breadcrumb-sep">›</span>
            <span className="breadcrumb-current">Beschikbaarheid</span>
          </div>
          <h1 className="page-title">Beschikbaarheid</h1>
        </div>
        <div className="page-header-actions" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link href={`/paarden/${id}/beschikbaarheid?week=${weekOffset - 1}`} className="btn-ghost btn-ghost--sm">← Vorige</Link>
          <Link href={`/paarden/${id}/beschikbaarheid`} className="btn-ghost btn-ghost--sm">Deze week</Link>
          <Link href={`/paarden/${id}/beschikbaarheid?week=${weekOffset + 1}`} className="btn-ghost btn-ghost--sm">Volgende →</Link>
        </div>
      </div>

      <div className="panel">
        <div className="panel-body" style={{ overflowX: 'auto' }}>
          <table className="gezondheid-tabel" style={{ minWidth: 720 }}>
            <thead>
              <tr>
                <th></th>
                {dagen.map((d, i) => (
                  <th key={i} style={{ textAlign: 'center' }}>
                    {DAG_LABELS[i]}<br />
                    <span className="gezondheid-tabel__muted" style={{ fontWeight: 400 }}>{formatDagLabel(d)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAGDELEN.map((dagdeel) => (
                <tr key={dagdeel}>
                  <td style={{ fontWeight: 600 }}>{DAGDEEL_LABELS[dagdeel]}</td>
                  {dagen.map((d) => {
                    const dayYmd = ymd(d)
                    const claim = claimMap.get(`${dayYmd}|${dagdeel}`)
                    if (claim) {
                      const magVrijgeven = claim.user.id === user.id || isStal
                      return (
                        <td key={dayYmd} style={{ textAlign: 'center' }}>
                          <span
                            className="badge"
                            style={{ background: kleurVan(claim.user.id), color: '#fff', borderColor: 'transparent' }}
                          >
                            {claim.user.name ?? claim.user.email}
                          </span>
                          {magVrijgeven && (
                            <form action={releaseDagdeel.bind(null, claim.id, id)} style={{ display: 'inline' }}>
                              <button type="submit" className="btn-ghost btn-ghost--sm" style={{ marginLeft: 6 }} title="Vrijgeven" aria-label="Vrijgeven">×</button>
                            </form>
                          )}
                        </td>
                      )
                    }
                    return (
                      <td key={dayYmd} style={{ textAlign: 'center' }}>
                        <form action={claimDagdeel.bind(null, id, dayYmd, dagdeel)} style={{ display: 'inline' }}>
                          <button type="submit" className="btn-ghost btn-ghost--sm" title="Claimen">+ Claim</button>
                        </form>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          {personen.length > 0 && (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 16 }}>
              {personen.map((p) => (
                <span key={p.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 'var(--velaro-text-sm)' }}>
                  <span style={{ width: 12, height: 12, borderRadius: 3, background: kleurVan(p.id), display: 'inline-block' }} />
                  {p.name ?? p.email}
                </span>
              ))}
            </div>
          )}

          <p style={{ fontSize: 'var(--velaro-text-xs)', color: 'var(--velaro-color-muted)', marginTop: 16 }}>
            Eén dagdeel kan maar door één persoon worden geclaimd, zodat partijen niet tegelijk
            willen rijden.
          </p>
        </div>
      </div>
    </>
  )
}
