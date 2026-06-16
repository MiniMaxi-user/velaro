import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth/session'
import { getStableRole } from '@/lib/auth/authorization'
import { getLeaseDetail } from '@/features/lease/leaseQueries'
import {
  leesLeaseKosten,
  berekenKosten,
  KOSTENPOSTEN,
  LEASE_BTW_TARIEF,
} from '@/features/lease/leaseKostenConfig'
import { saveLeaseKosten } from '@/features/lease/leaseActions'
import { LEASE_TYPE_LABELS } from '@/features/lease/leaseHelpers'
import SubmitButton from '@/components/SubmitButton'

interface Props {
  params: Promise<{ leaseId: string }>
}

function euro(n: number): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n)
}

export default async function LeaseKostenPage({ params }: Props) {
  const { leaseId } = await params

  const user = await getAuthUser()
  if (!user) redirect('/login')

  const lease = await getLeaseDetail(leaseId)
  if (!lease) notFound()

  const role = await getStableRole(user.id, lease.horse.stableId)
  const isStal = role !== null
  const isLeaser = lease.leaserUserId === user.id
  if (!isStal && !isLeaser) notFound()

  const kosten = leesLeaseKosten(lease.config)
  const berek = berekenKosten(kosten)
  const action = saveLeaseKosten.bind(null, leaseId)

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div className="breadcrumb">
            <Link href={`/paarden/${lease.horse.id}?tab=lease`}>{lease.horse.name}</Link>
            <span className="breadcrumb-sep">›</span>
            <span className="breadcrumb-current">Kosten &amp; betaling</span>
          </div>
          <h1 className="page-title">Kosten &amp; betaling <em>— {LEASE_TYPE_LABELS[lease.leaseType]}</em></h1>
        </div>
        <div className="page-header-actions">
          <Link href={`/lease/${leaseId}/contract`} className="btn-ghost btn-ghost--sm">Naar contract</Link>
        </div>
      </div>

      <div className="detail-layout">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {isStal ? (
            <form action={action} className="panel">
              <div className="panel-header"><span className="panel-title">Kostenverdeling</span></div>
              <div className="panel-body">
                <table className="gezondheid-tabel">
                  <thead>
                    <tr>
                      <th>Post</th>
                      <th>Wie betaalt</th>
                      <th>Bedrag p/m</th>
                      <th>Onvoorzien</th>
                    </tr>
                  </thead>
                  <tbody>
                    {KOSTENPOSTEN.map((def) => {
                      const post = kosten.posten[def.key]
                      return (
                        <tr key={def.key}>
                          <td>{def.label}</td>
                          <td>
                            <select name={`betaler_${def.key}`} className="input" defaultValue={post.betaler}>
                              <option value="EIGENAAR">Eigenaar</option>
                              <option value="LEASER">Leaser</option>
                            </select>
                          </td>
                          <td>
                            <input name={`bedrag_${def.key}`} type="number" min="0" step="0.01" className="input" defaultValue={post.bedrag ?? ''} style={{ maxWidth: 120 }} />
                          </td>
                          <td>
                            <input type="checkbox" name={`onvoorzien_${def.key}`} defaultChecked={post.onvoorzien} />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>

                <div className="form-grid" style={{ marginTop: 16 }}>
                  <div className="form-group">
                    <label htmlFor="vergoeding" className="form-label">Leasevergoeding p/m (excl. btw)</label>
                    <input id="vergoeding" name="vergoeding" type="number" min="0" step="0.01" className="input" defaultValue={kosten.vergoeding ?? ''} />
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 28 }}>
                      <input type="checkbox" name="btw" defaultChecked={kosten.btw} />
                      Btw 21% (lease is belast tegen het hoge tarief)
                    </label>
                  </div>
                </div>

                <div className="action-buttons" style={{ marginTop: 8 }}>
                  <SubmitButton label="Opslaan" />
                </div>
              </div>
            </form>
          ) : (
            <div className="panel">
              <div className="panel-header"><span className="panel-title">Kostenverdeling</span></div>
              <div className="panel-body">
                <table className="gezondheid-tabel">
                  <thead>
                    <tr><th>Post</th><th>Wie betaalt</th><th>Bedrag p/m</th></tr>
                  </thead>
                  <tbody>
                    {KOSTENPOSTEN.map((def) => {
                      const post = kosten.posten[def.key]
                      return (
                        <tr key={def.key}>
                          <td>
                            {def.label}
                            {post.onvoorzien && <span className="badge badge-warning" style={{ marginLeft: 8 }}>Onvoorzien</span>}
                          </td>
                          <td className="gezondheid-tabel__muted">{post.betaler === 'LEASER' ? 'Leaser' : 'Eigenaar'}</td>
                          <td className="gezondheid-tabel__muted">{post.bedrag != null ? euro(post.bedrag) : '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Maandoverzicht */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="panel">
            <div className="panel-header"><span className="panel-title">Leasevergoeding</span></div>
            <div className="panel-body">
              <div className="detail-fields">
                <div className="detail-field">
                  <div className="detail-field-label">Subtotaal</div>
                  <div className="detail-field-value">{euro(berek.subtotaal)}</div>
                </div>
                <div className="detail-field">
                  <div className="detail-field-label">Btw {kosten.btw ? `${Math.round(LEASE_BTW_TARIEF * 100)}%` : '—'}</div>
                  <div className="detail-field-value">{euro(berek.btwBedrag)}</div>
                </div>
                <div className="detail-field">
                  <div className="detail-field-label">Totaal p/m</div>
                  <div className="detail-field-value"><strong>{euro(berek.totaalVergoeding)}</strong></div>
                </div>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header"><span className="panel-title">Maandoverzicht per partij</span></div>
            <div className="panel-body">
              <div className="detail-fields">
                <div className="detail-field">
                  <div className="detail-field-label">Leaser betaalt</div>
                  <div className="detail-field-value"><strong>{euro(berek.leaserMaand)}</strong> p/m</div>
                </div>
                <div className="detail-field">
                  <div className="detail-field-label">Eigenaar draagt</div>
                  <div className="detail-field-value">{euro(berek.eigenaarMaand)} p/m</div>
                </div>
              </div>
              <p style={{ fontSize: 'var(--velaro-text-xs)', color: 'var(--velaro-color-muted)', marginTop: 12 }}>
                Administratie/overzicht — echte incasso volgt met de facturatie-stap.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
