import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth/session'
import { getStableRole } from '@/lib/auth/authorization'
import { getLeaseDetail } from '@/features/lease/leaseQueries'
import { leesLeaseContract, isVolledigOndertekend, type Ondertekening } from '@/features/lease/leaseContractConfig'
import { saveLeaseContract, signLease } from '@/features/lease/leaseActions'
import { LEASE_TYPE_LABELS } from '@/features/lease/leaseHelpers'
import { formatDatum } from '@/features/paarden/paardHelpers'
import SubmitButton from '@/components/SubmitButton'

interface Props {
  params: Promise<{ leaseId: string }>
}

function dateInput(d: Date | null): string {
  return d ? new Date(d).toISOString().slice(0, 10) : ''
}

function OndertekenBlok({
  titel,
  ondertekening,
  magTekenen,
  action,
}: {
  titel: string
  ondertekening: Ondertekening
  magTekenen: boolean
  action: (formData: FormData) => Promise<void>
}) {
  return (
    <div style={{ paddingTop: 12, borderTop: '1px solid var(--velaro-color-border)' }}>
      <div className="label" style={{ marginBottom: 6 }}>{titel}</div>
      {ondertekening ? (
        <div style={{ fontSize: 'var(--velaro-text-sm)' }}>
          <span className="badge badge-success">Ondertekend</span>
          <div style={{ marginTop: 4, color: 'var(--velaro-color-muted)' }}>
            {ondertekening.naam} · {formatDatum(new Date(ondertekening.datum))}
          </div>
        </div>
      ) : magTekenen ? (
        <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <input name="naam" className="input" placeholder="Naam ter ondertekening" required />
          <SubmitButton label="Onderteken" />
        </form>
      ) : (
        <span className="badge badge-neutral">Nog niet ondertekend</span>
      )}
    </div>
  )
}

function Veld({ label, waarde }: { label: string; waarde: string | null | undefined }) {
  return (
    <div className="detail-field">
      <div className="detail-field-label">{label}</div>
      <div className={`detail-field-value${waarde ? '' : ' muted'}`}>{waarde ?? '—'}</div>
    </div>
  )
}

export default async function LeaseContractPage({ params }: Props) {
  const { leaseId } = await params

  const user = await getAuthUser()
  if (!user) redirect('/login')

  const lease = await getLeaseDetail(leaseId)
  if (!lease) notFound()

  const role = await getStableRole(user.id, lease.horse.stableId)
  const isStal = role !== null
  const isLeaser = lease.leaserUserId === user.id
  if (!isStal && !isLeaser) notFound()

  const config = leesLeaseContract(lease.config)
  const volledig = isVolledigOndertekend(config)
  const bewerkbaar = isStal && !volledig

  const saveAction = saveLeaseContract.bind(null, leaseId)

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div className="breadcrumb">
            <Link href={`/paarden/${lease.horse.id}?tab=lease`}>{lease.horse.name}</Link>
            <span className="breadcrumb-sep">›</span>
            <span className="breadcrumb-current">Leasecontract</span>
          </div>
          <h1 className="page-title">
            Leasecontract <em>— {LEASE_TYPE_LABELS[lease.leaseType]}</em>
          </h1>
        </div>
        <div className="page-header-actions">
          <span className={`badge ${volledig ? 'badge-success' : 'badge-neutral'}`}>
            {volledig ? 'Ondertekend' : 'Concept'}
          </span>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="form-feedback form-feedback--error" style={{ marginBottom: 16 }}>
        ⚠️ Geen juridisch advies — laat dit contract juridisch toetsen vóór gebruik.
      </div>

      <div className="detail-layout">
        {/* Hoofd: editor of read-only inhoud */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="panel">
            <div className="panel-header"><span className="panel-title">Contractgegevens</span></div>
            <div className="panel-body">
              {bewerkbaar ? (
                <form action={saveAction} className="form-grid">
                  <div className="form-group">
                    <label htmlFor="startDate" className="form-label">Ingangsdatum</label>
                    <input id="startDate" name="startDate" type="date" className="input" defaultValue={dateInput(lease.startDate)} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="endDate" className="form-label">Einddatum</label>
                    <input id="endDate" name="endDate" type="date" className="input" defaultValue={dateInput(lease.endDate)} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="trialEndsAt" className="form-label">Einde proefperiode</label>
                    <input id="trialEndsAt" name="trialEndsAt" type="date" className="input" defaultValue={dateInput(lease.trialEndsAt)} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="minimumTermMonths" className="form-label">Min. looptijd (mnd)</label>
                    <input id="minimumTermMonths" name="minimumTermMonths" type="number" min="0" className="input" defaultValue={lease.minimumTermMonths ?? ''} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="noticePeriodDays" className="form-label">Opzegtermijn (dagen)</label>
                    <input id="noticePeriodDays" name="noticePeriodDays" type="number" min="0" className="input" defaultValue={lease.noticePeriodDays ?? ''} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="leasevergoeding" className="form-label">Leasevergoeding</label>
                    <input id="leasevergoeding" name="leasevergoeding" type="text" className="input" defaultValue={config.leasevergoeding ?? ''} placeholder="bv. € 250 p/m" />
                  </div>
                  <div className="form-group form-grid--full">
                    <label htmlFor="gebruiksrecht" className="form-label">Gebruiksrecht</label>
                    <textarea id="gebruiksrecht" name="gebruiksrecht" rows={2} className="input" defaultValue={config.gebruiksrecht ?? ''} placeholder="Wat mag de leaser (buitenrijden, wedstrijd, lessen)?" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="disciplines" className="form-label">Disciplines</label>
                    <input id="disciplines" name="disciplines" type="text" className="input" defaultValue={config.disciplines ?? ''} />
                  </div>
                  <div className="form-group form-grid--full">
                    <label htmlFor="kostenverdeling" className="form-label">Kostenverdeling</label>
                    <textarea id="kostenverdeling" name="kostenverdeling" rows={2} className="input" defaultValue={config.kostenverdeling ?? ''} placeholder="Wie betaalt hoefsmid, dierenarts, voer…" />
                  </div>
                  <div className="form-group form-grid--full">
                    <label htmlFor="aansprakelijkheid" className="form-label">Aansprakelijkheid (6:179 BW)</label>
                    <textarea id="aansprakelijkheid" name="aansprakelijkheid" rows={2} className="input" defaultValue={config.aansprakelijkheid ?? ''} />
                  </div>
                  <div className="form-group form-grid--full">
                    <label htmlFor="verzekering" className="form-label">Verzekering</label>
                    <textarea id="verzekering" name="verzekering" rows={2} className="input" defaultValue={config.verzekering ?? ''} />
                  </div>
                  <div className="form-group form-grid--full">
                    <label htmlFor="opzegging" className="form-label">Opzegging</label>
                    <textarea id="opzegging" name="opzegging" rows={2} className="input" defaultValue={config.opzegging ?? ''} />
                  </div>
                  <div className="form-group form-grid--full">
                    <label htmlFor="bijzonderheden" className="form-label">Bijzonderheden</label>
                    <textarea id="bijzonderheden" name="bijzonderheden" rows={2} className="input" defaultValue={config.bijzonderheden ?? ''} />
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input type="checkbox" name="eersteRechtVanKoop" defaultChecked={config.eersteRechtVanKoop} />
                      Eerste recht van koop
                    </label>
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input type="checkbox" name="minderjarig" defaultChecked={config.minderjarig} />
                      Leaser is minderjarig
                    </label>
                  </div>
                  <div className="form-group">
                    <label htmlFor="voogdNaam" className="form-label">Naam ouder/voogd (bij minderjarig)</label>
                    <input id="voogdNaam" name="voogdNaam" type="text" className="input" defaultValue={config.voogdNaam ?? ''} />
                  </div>
                  {/* Bewaar het leasetype mee (verborgen) zodat de update consistent blijft. */}
                  <input type="hidden" name="leaseType" value={lease.leaseType} />
                  <div className="action-buttons form-grid--full">
                    <SubmitButton label="Opslaan" />
                  </div>
                </form>
              ) : (
                <div className="detail-fields">
                  <Veld label="Leasevergoeding" waarde={config.leasevergoeding} />
                  <Veld label="Ingangsdatum" waarde={lease.startDate ? formatDatum(new Date(lease.startDate)) : null} />
                  <Veld label="Einddatum" waarde={lease.endDate ? formatDatum(new Date(lease.endDate)) : null} />
                  <Veld label="Einde proefperiode" waarde={lease.trialEndsAt ? formatDatum(new Date(lease.trialEndsAt)) : null} />
                  <Veld label="Min. looptijd" waarde={lease.minimumTermMonths != null ? `${lease.minimumTermMonths} mnd` : null} />
                  <Veld label="Opzegtermijn" waarde={lease.noticePeriodDays != null ? `${lease.noticePeriodDays} dagen` : null} />
                  <Veld label="Gebruiksrecht" waarde={config.gebruiksrecht} />
                  <Veld label="Disciplines" waarde={config.disciplines} />
                  <Veld label="Kostenverdeling" waarde={config.kostenverdeling} />
                  <Veld label="Aansprakelijkheid" waarde={config.aansprakelijkheid} />
                  <Veld label="Verzekering" waarde={config.verzekering} />
                  <Veld label="Opzegging" waarde={config.opzegging} />
                  <Veld label="Eerste recht van koop" waarde={config.eersteRechtVanKoop ? 'Ja' : 'Nee'} />
                  <Veld label="Bijzonderheden" waarde={config.bijzonderheden} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Side: partijen + ondertekening */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="panel">
            <div className="panel-header"><span className="panel-title">Partijen</span></div>
            <div className="panel-body">
              <div className="detail-fields">
                <Veld label="Stal" waarde={lease.horse.stable.name} />
                <Veld label="Leaser" waarde={lease.leaser.name ?? lease.leaser.email} />
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header"><span className="panel-title">Ondertekening</span></div>
            <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <OndertekenBlok
                titel="Stal"
                ondertekening={config.ondertekening.stal}
                magTekenen={isStal}
                action={signLease.bind(null, leaseId, 'stal')}
              />
              <OndertekenBlok
                titel="Leaser"
                ondertekening={config.ondertekening.leaser}
                magTekenen={isLeaser}
                action={signLease.bind(null, leaseId, 'leaser')}
              />
              {config.minderjarig && (
                <OndertekenBlok
                  titel="Ouder / voogd"
                  ondertekening={config.ondertekening.voogd}
                  magTekenen={isLeaser}
                  action={signLease.bind(null, leaseId, 'voogd')}
                />
              )}
              {volledig && (
                <p style={{ fontSize: 'var(--velaro-text-sm)', color: 'var(--velaro-color-success)', marginTop: 4 }}>
                  Volledig ondertekend — de lease is actief.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
