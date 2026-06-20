import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth/session'
import { getHorse, getFeedingPlan, getStableMembersForHorse } from '@/features/paarden/queries'
import { getStableRole, canViewHorse, getLeaseForHorse } from '@/lib/auth/authorization'
import { leaseTypeLabel } from '@/features/lease/leaseHelpers'
import { getLeaseListingForHorse } from '@/features/lease/listingQueries'
import LeaseListingPanel, { type LeaseListingView } from '@/features/lease/LeaseListingPanel'
import { GESLACHT_LABELS, RELATIETYPE_LABELS, STALLINGSVORM_LABELS, berekenLeeftijd, formatDatum } from '@/features/paarden/paardHelpers'
import { RelatietypeBadge, StallingsvormBadge } from '@/features/paarden/RelatieBadges'
import DeletePaardButton from '@/features/paarden/DeletePaardButton'
import PersonenBeheer from '@/features/paarden/PersonenBeheer'
import PersonenInfo from '@/features/paarden/PersonenInfo'
import { getVaccinaties, getOntwormingen, getDierenartsBezzoeken, getHoefsmitBezoeKen, getMetingen } from '@/features/gezondheid/queries'
import GezondheidTabs from '@/features/gezondheid/GezondheidTabs'
import { getMessagesForHorse } from '@/features/berichten/queries'
import { markMessagesRead } from '@/features/berichten/actions'
import BerichtenPanel from '@/features/berichten/BerichtenPanel'
import StalGegevensPanel from '@/features/paarden/StalGegevensPanel'
import VoederschemaPanel from '@/features/paarden/VoederschemaPanel'
import PaardDetailTabs from '@/features/paarden/PaardDetailTabs'
import {
  getContractsForHorse,
  getGezondheidsplichtNaleving,
  type NalevingRegel,
} from '@/features/contracten/queries'
import { leesGezondheidsplicht } from '@/features/contracten/gezondheidsplicht'
import {
  verwerkStilzwijgendeVerlengingen,
  verwerkTijdgebondenOvergangen,
} from '@/features/contracten/actions'
import ContractenPanel from '@/features/contracten/ContractenPanel'
import { bepaalContractOpties } from '@/features/contracten/relatietypeMatching'
import { getPaardFotoSignedUrl } from '@/features/paarden/paardFotoStorage'

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

  const [canView, role, vaccinaties, ontwormingen, bezzoeken, hoefsmitBezoeKen, metingen, berichten, voederschema, contractenInitieel, fotoUrl, lease, leaseListing] = await Promise.all([
    canViewHorse(user.id, id),
    getStableRole(user.id, horse.stableId),
    getVaccinaties(id),
    getOntwormingen(id),
    getDierenartsBezzoeken(id),
    getHoefsmitBezoeKen(id),
    getMetingen(id),
    getMessagesForHorse(id),
    getFeedingPlan(id),
    getContractsForHorse(id),
    getPaardFotoSignedUrl(id),
    getLeaseForHorse(user.id, id),
    getLeaseListingForHorse(id),
  ])

  const stalleden = role ? await getStableMembersForHorse(id) : []

  if (!canView) notFound()

  // Lazy stilzwijgende verlenging (STAL-14, #87): bij het openen van het
  // paardprofiel verlengen stilzwijgende contracten waarvan het verlengmoment
  // bereikt is. Idempotent; bij wijziging opnieuw ophalen zodat de contracten-tab
  // de nieuwe status/einddatum toont.
  // Lazy tijdgebonden overgangen (STAL-15, #88): einde opschorting → ACTIEF en
  // verstreken opzegtermijn → BEEINDIGD. Samen met de stilzwijgende verlenging
  // (STAL-14) idempotent uitgevoerd; bij wijziging opnieuw ophalen.
  const verlengd = await verwerkStilzwijgendeVerlengingen(
    contractenInitieel.map((c) => c.id),
  )
  const tijdgebonden = await verwerkTijdgebondenOvergangen(
    contractenInitieel.map((c) => c.id),
  )
  const contracten =
    verlengd > 0 || tijdgebonden > 0
      ? await getContractsForHorse(id)
      : contractenInitieel

  // Wie het profiel opent, heeft de paardberichten gezien.
  if (berichten.length > 0) {
    await markMessagesRead(berichten.map((b) => b.id))
  }

  const canEdit = role !== null
  const canDelete = role === 'OWNER'

  // Pure leaser (lease-module #59, Lease 02): heeft een actieve lease maar is geen
  // stallid en niet als eigenaar/bereider gekoppeld. Krijgt de read-only weergave
  // zonder het Eigenaren-paneel.
  const isPerson = horse.people.some((p) => p.user.id === user.id)
  const isPureLeaser = !canEdit && !isPerson && lease !== null

  // Entings- & gezondheidsplicht-naleving (STAL-07): per contract de afgesproken
  // plicht afzetten tegen de echte gezondheidsregistratie van het paard.
  const nalevingEntries = await Promise.all(
    contracten.map(async (c): Promise<[string, NalevingRegel[]]> => {
      const plicht = leesGezondheidsplicht(c.config)
      const regels = await getGezondheidsplichtNaleving(id, plicht)
      return [c.id, regels]
    }),
  )
  const naleving: Record<string, NalevingRegel[]> = Object.fromEntries(nalevingEntries)

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
          <Link href={`/paarden/${id}/beschikbaarheid`} className="btn-ghost">
            Beschikbaarheid
          </Link>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {fotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={fotoUrl}
                alt={`Foto van ${horse.name}`}
                className="paard-foto-avatar paard-foto-avatar--md"
              />
            ) : (
              <div className="paard-foto-avatar paard-foto-avatar--md paard-foto-avatar--placeholder" aria-hidden>🐴</div>
            )}
            <h1 className="detail-title" style={{ margin: 0 }}>{horse.name}</h1>
          </div>
          <div className="detail-meta" style={{ marginTop: 8 }}>
            <RelatietypeBadge relatietype={horse.relatietype} />
            <StallingsvormBadge stallingsvorm={horse.stallingsvorm} />
            {horse.breed && <span className="badge badge-navy">{horse.breed}</span>}
            {leeftijd !== null && <span className="badge badge-neutral">{leeftijd} jaar</span>}
            {horse.sex && <span className="badge badge-neutral">{GESLACHT_LABELS[horse.sex]}</span>}
            {horse.discipline && <span className="badge badge-gold">{horse.discipline}{horse.disciplineLevel ? ` ${horse.disciplineLevel}` : ''}</span>}
            {lease && <span className="badge badge-gold">In lease — {leaseTypeLabel(lease.leaseType)}</span>}
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
                <Veld label="Relatietype" waarde={horse.relatietype ? RELATIETYPE_LABELS[horse.relatietype] : null} />
                <Veld label="Stallingsvorm" waarde={horse.stallingsvorm ? STALLINGSVORM_LABELS[horse.stallingsvorm] : null} />
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
            metingen={metingen}
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

        const heeftEigenaar = horse.people.some((p) => p.isOwner)

        // Contractopties ([Unify 03] #129): de "Nieuw contract"-dropdown toont
        // stalling (poort #113: relatietype = pensionpaard, stallingsvorm ∈ {volledig
        // pension, halfpension} én een eigenaar gekoppeld) en alle leasevormen
        // (toegestaan zodra er een eigenaar gekoppeld is). Niet-mogelijke opties
        // blijven zichtbaar met een reden.
        const contractOpties = bepaalContractOpties({
          relatietype: horse.relatietype,
          stallingsvorm: horse.stallingsvorm,
          heeftEigenaar,
        })

        const contractenPanel = (
          <ContractenPanel
            horseId={id}
            contracts={contracten}
            opties={contractOpties}
            naleving={naleving}
            currentUserId={user.id}
          />
        )

        // Lease-tab ([Unify 07], #133): toont uitsluitend het marktplaats-aanbod
        // (LeaseListingPanel). Leasecontracten worden via de unified contract-stepper
        // onder de Contracten-tab beheerd. Alleen voor stalleden (canEdit-weergave).
        const leaseView: LeaseListingView | null = leaseListing
          ? {
              id: leaseListing.id,
              leaseType: leaseListing.leaseType,
              daysPerWeek: leaseListing.daysPerWeek,
              pricePerMonth: leaseListing.pricePerMonth ? Number(leaseListing.pricePerMonth) : null,
              region: leaseListing.region,
              discipline: leaseListing.discipline,
              movable: leaseListing.movable,
              exclusive: leaseListing.exclusive,
              description: leaseListing.description,
              isActive: leaseListing.isActive,
            }
          : null
        const leasePanel = <LeaseListingPanel horseId={id} listing={leaseView} />



        // Stalleden (OWNER/STAFF): tab-layout met vaste contextkolom rechts.
        if (canEdit) {
          return (
            <div className="detail-tabs-layout">
              {/* Linkerkolom (70%) — tabstrip */}
              <PaardDetailTabs
                algemeen={algemeenPanel}
                gezondheid={gezondheidPanel}
                eigenaren={
                  <PersonenBeheer horseId={id} people={horse.people} members={stalleden} />
                }
                voederschema={voederschemaPanel}
                berichten={berichtenPanel}
                contracten={contractenPanel}
                lease={leasePanel}
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
              {!isPureLeaser && <PersonenInfo people={horse.people} />}
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
