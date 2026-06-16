import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth/session'
import { getStableRole } from '@/lib/auth/authorization'
import { getLeaseDetail } from '@/features/lease/leaseQueries'
import {
  leesVerzekering,
  magActiverenVerzekering,
  POLIS_TYPE_LABELS,
  POLIS_TYPE_OPTIES,
} from '@/features/lease/leaseVerzekeringConfig'
import { getPolisSignedUrls } from '@/features/lease/leasePolisStorage'
import { saveVerzekering, uploadPolis, deletePolis } from '@/features/lease/leaseVerzekeringActions'
import { LEASE_TYPE_LABELS } from '@/features/lease/leaseHelpers'
import { formatDatum } from '@/features/paarden/paardHelpers'
import SubmitButton from '@/components/SubmitButton'

interface Props {
  params: Promise<{ leaseId: string }>
}

export default async function LeaseVerzekeringPage({ params }: Props) {
  const { leaseId } = await params

  const user = await getAuthUser()
  if (!user) redirect('/login')

  const lease = await getLeaseDetail(leaseId)
  if (!lease) notFound()

  const role = await getStableRole(user.id, lease.horse.stableId)
  const isStal = role !== null
  const isLeaser = lease.leaserUserId === user.id
  if (!isStal && !isLeaser) notFound()

  const verzekering = leesVerzekering(lease.config)
  const magActiveren = magActiverenVerzekering(verzekering)
  const urls = await getPolisSignedUrls(verzekering.polissen.map((p) => p.storagePath))

  const saveAction = saveVerzekering.bind(null, leaseId)
  const uploadAction = uploadPolis.bind(null, leaseId)

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div className="breadcrumb">
            <Link href={`/paarden/${lease.horse.id}?tab=lease`}>{lease.horse.name}</Link>
            <span className="breadcrumb-sep">›</span>
            <span className="breadcrumb-current">Verzekering &amp; aansprakelijkheid</span>
          </div>
          <h1 className="page-title">Verzekering &amp; aansprakelijkheid <em>— {LEASE_TYPE_LABELS[lease.leaseType]}</em></h1>
        </div>
        <div className="page-header-actions">
          <Link href={`/lease/${leaseId}/contract`} className="btn-ghost btn-ghost--sm">Naar contract</Link>
        </div>
      </div>

      {!magActiveren && (
        <div className="form-feedback form-feedback--error" style={{ marginBottom: 16 }}>
          ⚠️ De leaser is (nog) niet meeverzekerd en het risico is niet bevestigd. De lease kan
          niet actief worden tot de meeverzekerd-vraag met &ldquo;Ja&rdquo; is beantwoord óf het
          risico expliciet is bevestigd. Aansprakelijkheid: art. 6:179 BW (bezitter van het dier).
        </div>
      )}

      <div className="detail-layout">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Kernvraag + checklist */}
          <div className="panel">
            <div className="panel-header"><span className="panel-title">Aansprakelijkheid &amp; meeverzekering</span></div>
            <div className="panel-body">
              {isStal ? (
                <form action={saveAction} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <div className="form-label">Is de leaser meeverzekerd op de WA/AVP-polis van de eigenaar? *</div>
                    <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                        <input type="radio" name="meeverzekerd" value="JA" defaultChecked={verzekering.meeverzekerd === 'JA'} /> Ja
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                        <input type="radio" name="meeverzekerd" value="NEE" defaultChecked={verzekering.meeverzekerd === 'NEE'} /> Nee
                      </label>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div className="form-label">6:179 BW-checklist</div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input type="checkbox" name="risicoAcceptatie" defaultChecked={verzekering.risicoAcceptatie} />
                      Partijen accepteren de risicoverdeling rond aansprakelijkheid (6:179 BW).
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input type="checkbox" name="dekkingOngevallen" defaultChecked={verzekering.dekkingOngevallen} />
                      Er is dekking voor ongevallen van de ruiter.
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input type="checkbox" name="risicoBevestigd" defaultChecked={verzekering.risicoBevestigd} />
                      Ik begrijp het risico (vereist wanneer de leaser niet meeverzekerd is).
                    </label>
                  </div>

                  <div className="action-buttons">
                    <SubmitButton label="Opslaan" />
                  </div>
                </form>
              ) : (
                <div className="detail-fields">
                  <div className="detail-field">
                    <div className="detail-field-label">Leaser meeverzekerd (WA/AVP eigenaar)</div>
                    <div className="detail-field-value">
                      {verzekering.meeverzekerd === 'JA' ? 'Ja' : verzekering.meeverzekerd === 'NEE' ? 'Nee' : '—'}
                    </div>
                  </div>
                  <div className="detail-field">
                    <div className="detail-field-label">Risicoverdeling geaccepteerd</div>
                    <div className="detail-field-value">{verzekering.risicoAcceptatie ? 'Ja' : 'Nee'}</div>
                  </div>
                  <div className="detail-field">
                    <div className="detail-field-label">Dekking ongevallen ruiter</div>
                    <div className="detail-field-value">{verzekering.dekkingOngevallen ? 'Ja' : 'Nee'}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Polissen */}
          <div className="panel">
            <div className="panel-header"><span className="panel-title">Polissen</span></div>
            <div className="panel-body">
              {verzekering.polissen.length === 0 ? (
                <div className="gezondheid-leeg">Nog geen polissen toegevoegd.</div>
              ) : (
                <table className="gezondheid-tabel">
                  <thead>
                    <tr><th>Type</th><th>Bestand</th><th>Toegevoegd</th>{isStal && <th />}</tr>
                  </thead>
                  <tbody>
                    {verzekering.polissen.map((p) => (
                      <tr key={p.id}>
                        <td>{POLIS_TYPE_LABELS[p.type]}</td>
                        <td>
                          {urls[p.storagePath] ? (
                            <a href={urls[p.storagePath]} target="_blank" rel="noopener noreferrer" className="form-link">{p.bestandsnaam}</a>
                          ) : (
                            p.bestandsnaam
                          )}
                        </td>
                        <td className="gezondheid-tabel__muted">{formatDatum(new Date(p.uploadedAt))}</td>
                        {isStal && (
                          <td className="gezondheid-tabel__acties">
                            <form action={deletePolis.bind(null, leaseId, p.id)}>
                              <button type="submit" className="btn-ghost btn-ghost--sm">Verwijderen</button>
                            </form>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {isStal && (
                <form action={uploadAction} className="form-grid" style={{ marginTop: 16 }}>
                  <div className="form-group">
                    <label htmlFor="type" className="form-label">Polistype</label>
                    <select id="type" name="type" className="input" required defaultValue="">
                      <option value="" disabled>Kies een type…</option>
                      {POLIS_TYPE_OPTIES.map((t) => (
                        <option key={t} value={t}>{POLIS_TYPE_LABELS[t]}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="bestand" className="form-label">Bestand (PDF/JPG/PNG)</label>
                    <input id="bestand" name="bestand" type="file" accept="application/pdf,image/png,image/jpeg" className="input" required />
                  </div>
                  <div className="action-buttons form-grid--full">
                    <SubmitButton label="Polis toevoegen" />
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="panel">
            <div className="panel-header"><span className="panel-title">Status</span></div>
            <div className="panel-body">
              <span className={`badge ${magActiveren ? 'badge-success' : 'badge-warning'}`}>
                {magActiveren ? 'Gereed voor activatie' : 'Aandacht nodig'}
              </span>
              <p style={{ fontSize: 'var(--velaro-text-sm)', color: 'var(--velaro-color-muted)', marginTop: 12 }}>
                Een lease wordt pas actief na volledige ondertekening én een akkoord op de
                meeverzekering of een expliciete risicobevestiging.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
