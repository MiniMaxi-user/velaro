import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth/session'
import { getHorse, getFeedingPlan } from '@/features/paarden/queries'
import { getStableRole, canViewHorse } from '@/lib/auth/authorization'
import { GESLACHT_LABELS, berekenLeeftijd, formatDatum } from '@/features/paarden/paardHelpers'
import DeletePaardButton from '@/features/paarden/DeletePaardButton'
import EigenaarBeheer from '@/features/paarden/EigenaarBeheer'
import BereiderBeheer from '@/features/paarden/BereiderBeheer'
import BereiderInfo from '@/features/paarden/BereiderInfo'
import { getVaccinaties, getOntwormingen, getDierenartsBezzoeken, getHoefsmitBezoeKen } from '@/features/gezondheid/queries'
import GezondheidTabs from '@/features/gezondheid/GezondheidTabs'
import { getMessagesForHorse } from '@/features/berichten/queries'
import { markMessagesRead } from '@/features/berichten/actions'
import BerichtenPanel from '@/features/berichten/BerichtenPanel'
import StalGegevensPanel from '@/features/paarden/StalGegevensPanel'
import VoederschemaPanel from '@/features/paarden/VoederschemaPanel'
import PaardDetailTabs from '@/features/paarden/PaardDetailTabs'
import EigendomBadge from '@/features/paarden/EigendomBadge'
import { getContractsForHorse } from '@/features/contracten/queries'
import ContractenPanel from '@/features/contracten/ContractenPanel'

interface Props {
  params: Promise<{ id: string }>
}

function Veld({ label, waarde }: { label: string; waarde: string | null | undefined }) {
  return (
    <div className="detail-field">
      <div className="detail-field-label">{label}</div>
      <div className={`detail-field-value${waarde ? '' : ' muted'}`}>{waarde ?? '—'}</div>
    </div>
  )
}

export default async function PaardDetailPage({ params }: Props) {
  const { id } = await params

  const user = await getAuthUser()
  if (!user) redirect('/login')

  const horse = await getHorse(id)
  if (!horse) notFound()

  const [canView, role, vaccinaties, ontwormingen, bezzoeken, hoefsmitBezoeKen, berichten, voederschema, contracten] = await Promise.all([
    canViewHorse(user.id, id),
    getStableRole(user.id, horse.stableId),
    getVaccinaties(id),
    getOntwormingen(id),
    getDierenartsBezzoeken(id),
    getHoefsmitBezoeKen(id),
    getMessagesForHorse(id),
    getFeedingPlan(id),
    getContractsForHorse(id),
  ])

  if (!canView) notFound()

  // Wie het profiel opent, heeft de paardberichten gezien.
  if (berichten.length > 0) {
    await markMessagesRead(berichten.map((b) => b.id))
  }

  const canEdit = role !== null
  const canDelete = role === 'OWNER'

  const leeftijd = horse.dateOfBirth ? berekenLeeftijd(new Date(horse.dateOfBirth)) : null

  return (
    <>
      {/* Page header */}
      <div className="page-header">
        <div className="page-header-left">
          <div className="breadcrumb">
            <Link href="/paarden">Paarden</Link>
            <span className="breadcrumb-sep">›</span>
            <span className="breadcrumb-current">{horse.name}</span>
          </div>
        </div>
        <div className="page-header-actions">
          {canEdit && (
            <Link href={`/paarden/${id}/bewerken`} className="btn-secondary">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M9.5 2.5l2 2L4 12H2v-2L9.5 2.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
              </svg>
              Bewerken
            </Link>
          )}
          {canDelete && <DeletePaardButton horseId={id} />}
        </div>
      </div>

      {/* Detail header card */}
      <div className="detail-header">
        <div className="detail-header-left">
          <Link href="/paarden" className="detail-back">← Terug naar paarden</Link>
          <h1 className="detail-title">{horse.name}</h1>
          <div className="detail-meta">
            <EigendomBadge ownedByStable={horse.ownedByStable} />
            {horse.breed && <span className="badge badge-navy">{horse.breed}</span>}
            {leeftijd !== null && <span className="badge badge-neutral">{leeftijd} jaar</span>}
            {horse.sex && <span className="badge badge-neutral">{GESLACHT_LABELS[horse.sex]}</span>}
            {horse.discipline && <span className="badge badge-gold">{horse.discipline}{horse.disciplineLevel ? ` ${horse.disciplineLevel}` : ''}</span>}
          </div>
        </div>
      </div>

      {/* Herbruikbare panelen */}
      {(() => {
        const algemeenPanel = (
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Algemeen</span>
            </div>
            <div className="panel-body">
              <div className="detail-fields">
                <Veld label="Ras" waarde={horse.breed} />
                <Veld
                  label="Geboortejaar"
                  waarde={horse.dateOfBirth
                    ? `${new Date(horse.dateOfBirth).getFullYear()}${leeftijd !== null ? ` (${leeftijd} jaar)` : ''}`
                    : null}
                />
                <Veld label="Kleur" waarde={horse.color} />
                <Veld label="Geslacht" waarde={horse.sex ? GESLACHT_LABELS[horse.sex] : null} />
                <Veld label="Stalplek / Box" waarde={horse.boxNumber} />
                <Veld label="Discipline" waarde={horse.discipline} />
                {horse.disciplineLevel && <Veld label="Niveau" waarde={horse.disciplineLevel} />}
                <Veld label="Vader" waarde={horse.sireName} />
                <Veld label="Moeder" waarde={horse.damName} />
              </div>
            </div>
          </div>
        )

        const identificatiePanel = (
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Identificatie</span>
            </div>
            <div className="panel-body">
              <div className="detail-fields">
                <Veld label="UELN" waarde={horse.ueln} />
                <Veld label="Chipnummer" waarde={horse.chipNumber} />
                <Veld label="Paspoortnummer" waarde={horse.passportNumber} />
              </div>
            </div>
          </div>
        )

        const welzijnPanel = (
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Welzijn / EU</span>
            </div>
            <div className="panel-body">
              <div className="detail-field">
                <div className="detail-field-label">Slachtuitsluiting</div>
                <div className="detail-field-value">
                  {horse.excludedFromConsumption ? (
                    <span className="badge badge-warning">Uitgesloten</span>
                  ) : (
                    <span className="badge badge-success">Niet uitgesloten</span>
                  )}
                </div>
              </div>
              {horse.excludedFromConsumption && horse.excludedFromConsumptionDate && (
                <div className="detail-field" style={{ marginTop: 12 }}>
                  <div className="detail-field-label">Datum uitsluiting</div>
                  <div className="detail-field-value">
                    {formatDatum(new Date(horse.excludedFromConsumptionDate))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )

        const voederschemaPanel = (
          <VoederschemaPanel horseId={id} plan={voederschema} canEdit={canEdit} />
        )

        const gezondheidPanel = (
          <GezondheidTabs
            horseId={id}
            vaccinaties={vaccinaties}
            ontwormingen={ontwormingen}
            bezzoeken={bezzoeken}
            hoefsmitBezoeKen={hoefsmitBezoeKen}
            canEdit={canEdit}
          />
        )

        const berichtenPanel = (
          <BerichtenPanel
            target={{ horseId: id }}
            title="Berichten"
            messages={berichten}
            canManage={role === 'OWNER'}
            emptyLabel="Nog geen berichten voor dit paard."
          />
        )

        const contractenPanel = (
          <ContractenPanel
            horseId={id}
            contracts={contracten}
            hasOwners={horse.owners.length > 0}
          />
        )

        // Stalleden (OWNER/STAFF): tab-layout met vaste contextkolom rechts.
        if (canEdit) {
          return (
            <div className="detail-tabs-layout">
              {/* Linkerkolom (70%) — tabstrip */}
              <PaardDetailTabs
                algemeen={algemeenPanel}
                gezondheid={gezondheidPanel}
                eigenaren={
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div className="panel">
                      <div className="panel-header">
                        <span className="panel-title">Eigenaren</span>
                      </div>
                      <div className="panel-body">
                        <EigenaarBeheer horseId={id} owners={horse.owners} />
                      </div>
                    </div>
                    <div className="panel">
                      <div className="panel-header">
                        <span className="panel-title">Bereiders</span>
                      </div>
                      <div className="panel-body">
                        <BereiderBeheer horseId={id} riders={horse.riders} />
                      </div>
                    </div>
                  </div>
                }
                voederschema={voederschemaPanel}
                berichten={berichtenPanel}
                contracten={contractenPanel}
              />

              {/* Rechterkolom (30%) — altijd zichtbaar */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {identificatiePanel}
                {welzijnPanel}
              </div>
            </div>
          )
        }

        // Paardeneigenaar (canEdit === false): ongewijzigde weergave.
        return (
          <div className="detail-layout">
            {/* Main column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {algemeenPanel}
              {identificatiePanel}
              <BereiderInfo horseId={id} owners={horse.owners} riders={horse.riders} />
              {voederschemaPanel}
              {gezondheidPanel}
              {berichtenPanel}
            </div>

            {/* Side panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <StalGegevensPanel stable={horse.stable} />
              {welzijnPanel}
            </div>
          </div>
        )
      })()}
    </>
  )
}
