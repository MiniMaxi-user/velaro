import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth/session'
import { getHorse } from '@/features/paarden/queries'
import { getStableRole } from '@/lib/auth/authorization'
import ContractForm from '@/features/contracten/ContractForm'
import { createStallingContract, createLeaseContract } from '@/features/contracten/actions'
import { bepaalContractPoort } from '@/features/contracten/relatietypeMatching'
import { LEASE_TYPE_LABELS } from '@/features/lease/leaseHelpers'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ family?: string; type?: string }>
}

export default async function NieuwContractPage({ params, searchParams }: Props) {
  const { id } = await params
  const { family, type } = await searchParams

  const user = await getAuthUser()
  if (!user) redirect('/login')

  const horse = await getHorse(id)
  if (!horse) notFound()

  const role = await getStableRole(user.id, horse.stableId)
  if (!role) notFound()

  const eigenaren = horse.people.filter((p) => p.isOwner)

  // ── Lease-tak ([Unify 04] #130) ────────────────────────────────────────────
  // De "Nieuw contract"-dropdown (#129) routeert een gekozen leasevorm hierheen via
  // ?family=LEASE&type=<leaseType>. We valideren de leasevorm, herbevestigen de
  // lease-poort server-side (eigenaar gekoppeld), maken een concept-leasecontract aan
  // en sturen door naar de bewerk-stepper. De stalling-tak hieronder blijft ongewijzigd.
  if (family === 'LEASE') {
    // Valideer de leasevorm tegen de bron van waarheid (LEASE_TYPE_LABELS).
    if (!type || !(type in LEASE_TYPE_LABELS)) {
      redirect(`/paarden/${id}?tab=contracten`)
    }
    // Lease-poort: er moet een eigenaar gekoppeld zijn (de leaser wordt pas in de
    // opstel-flow gekozen). Is de poort dicht, dan terug naar de tab.
    if (eigenaren.length === 0) {
      redirect(`/paarden/${id}?tab=contracten`)
    }
    // Maak het concept aan en stuur door naar de bewerk-stepper. createLeaseContract
    // dwingt de poort nogmaals server-side af.
    const contractId = await createLeaseContract(id, type)
    redirect(`/paarden/${id}/contracten/${contractId}/bewerken`)
  }

  // ── Stalling-tak (ongewijzigd) ─────────────────────────────────────────────
  // Poort (#113): relatietype + stallingsvorm + eigenaar zijn harde voorwaarden. Is
  // de poort dicht (bv. ontbrekende stallingsvorm of een niet-pension relatietype),
  // dan is er niets aan te maken — terug naar de tab, waar de knop de reden toont.
  const poort = bepaalContractPoort({
    relatietype: horse.relatietype,
    stallingsvorm: horse.stallingsvorm,
    heeftEigenaar: eigenaren.length > 0,
  })
  if (!poort.toegestaan) {
    redirect(`/paarden/${id}?tab=contracten`)
  }

  const owners = eigenaren.map((p) => ({
    userId: p.user.id,
    label: p.user.name ?? p.user.email,
  }))

  const action = createStallingContract.bind(null, id)

  return (
    <main className="page-container">
      <div className="page-header">
        <Link href={`/paarden/${id}?tab=contracten`} className="btn-ghost">← {horse.name}</Link>
      </div>

      <div style={{ marginBottom: 'var(--velaro-space-8)' }}>
        <div className="label">Nieuw stallingscontract</div>
        <h1 className="page-title">{horse.name}</h1>
      </div>

      <ContractForm
        horseId={id}
        action={action}
        owners={owners}
        typeVoorselectie={poort.voorselectie}
      />
    </main>
  )
}
