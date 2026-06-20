import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth/session'
import { getHorse } from '@/features/paarden/queries'
import { getStableRole } from '@/lib/auth/authorization'
import { prisma } from '@/lib/prisma'
import ContractStepperForm from '@/features/contracten/ContractStepperForm'
import LeaseContractStepperForm from '@/features/contracten/LeaseContractStepperForm'
import { updateStallingContract, updateLeaseContract } from '@/features/contracten/actions'
import { leesLeaseContractConfig } from '@/features/contracten/leaseContract'
import { LEASE_TYPE_LABELS } from '@/features/lease/leaseHelpers'
import type { LeaseType } from '@prisma/client'
import { leesHuisvesting } from '@/features/contracten/huisvesting'
import { leesDienstpakket } from '@/features/contracten/dienstpakket'
import { leesPrijsLooptijd } from '@/features/contracten/prijsLooptijd'
import { leesVerzekeringAansprakelijkheid } from '@/features/contracten/verzekeringAansprakelijkheid'
import { leesGezondheidsplicht } from '@/features/contracten/gezondheidsplicht'
import { leesBerijder } from '@/features/contracten/berijder'
import {
  leesBijlagenConfig,
  leesExtraDiensten,
} from '@/features/contracten/bijlagenDiensten'
import { getBijlagenVoorContract } from '@/features/contracten/bijlagenStorage'
import BijlagenBeheer from '@/features/contracten/BijlagenBeheer'
import { getFeedingPlan } from '@/features/paarden/queries'

interface Props {
  params: Promise<{ id: string; contractId: string }>
}

export default async function BewerkContractPage({ params }: Props) {
  const { id, contractId } = await params

  const user = await getAuthUser()
  if (!user) redirect('/login')

  const horse = await getHorse(id)
  if (!horse) notFound()

  const role = await getStableRole(user.id, horse.stableId)
  if (!role) notFound()

  const contract = await prisma.contract.findUnique({ where: { id: contractId } })
  if (!contract || contract.horseId !== id) notFound()

  const isLease = contract.family === 'LEASE'
  const bewerkLabel = isLease ? 'Leasecontract bewerken' : 'Stallingscontract bewerken'

  // Bewerken mag uitsluitend bij een concept-contract; bij elke andere status
  // tonen we een blokkering en geen formulier.
  if (contract.status !== 'CONCEPT') {
    return (
      <main className="page-container">
        <div className="page-header">
          <Link href={`/paarden/${id}?tab=contracten`} className="btn-ghost">← {horse.name}</Link>
        </div>
        <div style={{ marginBottom: 'var(--velaro-space-8)' }}>
          <div className="label">{bewerkLabel}</div>
          <h1 className="page-title">{horse.name}</h1>
        </div>
        <div className="panel">
          <div className="panel-body">
            <div className="gezondheid-leeg">
              Dit contract kan niet meer worden bewerkt. Alleen een concept-contract is
              bewerkbaar.
            </div>
          </div>
        </div>
      </main>
    )
  }

  const owners = horse.people
    .filter((p) => p.isOwner)
    .map((p) => ({
      userId: p.user.id,
      label: p.user.name ?? p.user.email,
    }))

  const defaultStartDate = contract.startDate
    ? new Date(contract.startDate).toISOString().slice(0, 10)
    : undefined

  // ── Lease-tak ([Unify 04] #130, [Unify 05] #131) ───────────────────────────
  // Een leasecontract gebruikt dezelfde stepper-UX als stalling, maar met de
  // lease-blokken (LeaseContractStepperForm) en opslag op config.lease — inclusief
  // de Kosten- en Verzekering & aansprakelijkheid-blokken (#131). De disclaimer-
  // banner blijft zichtbaar. De verzekeringspolis loopt via het bestaande bijlagen-
  // mechanisme (categorie VERZEKERINGSPOLIS), net als bij stalling.
  if (isLease) {
    const leaseType = (
      contract.type in LEASE_TYPE_LABELS ? contract.type : 'FULL'
    ) as LeaseType
    const lease = leesLeaseContractConfig(contract.config)
    const leaseAction = updateLeaseContract.bind(null, id, contractId)
    const leaseBijlagen = await getBijlagenVoorContract(contractId)

    return (
      <main className="page-container">
        <div className="page-header">
          <Link href={`/paarden/${id}?tab=contracten`} className="btn-ghost">← {horse.name}</Link>
        </div>

        <div style={{ marginBottom: 'var(--velaro-space-8)' }}>
          <div className="label">{bewerkLabel}</div>
          <h1 className="page-title">{horse.name}</h1>
        </div>

        {/* Disclaimer — geen juridisch advies. Blijft zichtbaar in de lease-flow. */}
        <div
          className="form-feedback form-feedback--error"
          style={{ marginBottom: 'var(--velaro-space-6)' }}
        >
          ⚠️ Geen juridisch advies — laat dit contract juridisch toetsen vóór gebruik.
        </div>

        <LeaseContractStepperForm
          horseId={id}
          contractId={contractId}
          leaseType={leaseType}
          action={leaseAction}
          owners={owners}
          defaultCounterpartyUserId={contract.counterpartyUserId ?? undefined}
          defaultStartDate={defaultStartDate}
          lease={lease}
          submitLabel="Wijzigingen opslaan"
        />

        {/* Verzekeringspolis (en evt. andere bijlagen) via het bestaande mechanisme. */}
        <BijlagenBeheer
          horseId={id}
          contractId={contractId}
          bijlagen={leaseBijlagen.map((b) => ({
            id: b.id,
            categorie: b.categorie,
            bestandsnaam: b.bestandsnaam,
          }))}
        />
      </main>
    )
  }

  // Huisvesting-opties (STAL-03). Bij een leeg boxnummer voorvullen uit het
  // paardprofiel — overschrijfbaar in het formulier.
  const huisvesting = leesHuisvesting(contract.config)
  if (!huisvesting.boxNumber && horse.boxNumber) {
    huisvesting.boxNumber = horse.boxNumber
  }

  // Dienstpakket (voer/weidegang/faciliteiten, STAL-04) uit de contract-config.
  const dienstpakket = leesDienstpakket(contract.config)

  // Prijs, borg & looptijd (STAL-05) uit de contract-config.
  const prijsLooptijd = leesPrijsLooptijd(contract.config)

  // Verzekering & aansprakelijkheid (STAL-06) uit de contract-config.
  const verzekeringAansprakelijkheid = leesVerzekeringAansprakelijkheid(contract.config)

  // Entings- & gezondheidsplicht (STAL-07) uit de contract-config.
  const gezondheidsplicht = leesGezondheidsplicht(contract.config)

  // Berijder (STAL-10) uit de contract-config — optioneel optieblok.
  const berijder = leesBerijder(contract.config)

  // Bijlagen-instelling + extra diensten/prijslijst (STAL-16) uit de contract-config.
  const bijlagenConfig = leesBijlagenConfig(contract.config)
  const extraDiensten = leesExtraDiensten(contract.config)

  // Reeds gekoppelde bijlagen (DB-records) voor het beheer-paneel onder het formulier.
  const bijlagen = await getBijlagenVoorContract(contractId)

  // Of er een stalreglement-bijlage gekoppeld is — bepaalt mede de compleetheid van
  // het Bijlagen-blok wanneer "stalreglement verplicht" aanstaat (mirror van de
  // aanbied-validatie, die ditzelfde feit gebruikt).
  const heeftStalreglement = bijlagen.some((b) => b.categorie === 'STALREGLEMENT')

  // Voorvulwaarden uit het voederschema van het paard; null wanneer er geen
  // FeedingPlan is, zodat de overnemen-knop in het formulier wordt uitgeschakeld.
  const feedingPlan = await getFeedingPlan(id)
  const voederschema =
    feedingPlan && (feedingPlan.roughage || feedingPlan.concentrate)
      ? { ruwvoer: feedingPlan.roughage, krachtvoer: feedingPlan.concentrate }
      : null

  const action = updateStallingContract.bind(null, id, contractId)

  return (
    <main className="page-container">
      <div className="page-header">
        <Link href={`/paarden/${id}?tab=contracten`} className="btn-ghost">← {horse.name}</Link>
      </div>

      <div style={{ marginBottom: 'var(--velaro-space-8)' }}>
        <div className="label">Stallingscontract bewerken</div>
        <h1 className="page-title">{horse.name}</h1>
      </div>

      <ContractStepperForm
        horseId={id}
        contractId={contractId}
        action={action}
        owners={owners}
        defaultCounterpartyUserId={contract.counterpartyUserId ?? undefined}
        defaultStartDate={defaultStartDate}
        huisvesting={huisvesting}
        dienstpakket={dienstpakket}
        voederschema={voederschema}
        prijsLooptijd={prijsLooptijd}
        verzekeringAansprakelijkheid={verzekeringAansprakelijkheid}
        gezondheidsplicht={gezondheidsplicht}
        berijder={berijder}
        bijlagenConfig={bijlagenConfig}
        extraDiensten={extraDiensten}
        heeftStalreglement={heeftStalreglement}
        submitLabel="Wijzigingen opslaan"
      />

      <BijlagenBeheer
        horseId={id}
        contractId={contractId}
        bijlagen={bijlagen.map((b) => ({
          id: b.id,
          categorie: b.categorie,
          bestandsnaam: b.bestandsnaam,
        }))}
      />
    </main>
  )
}
