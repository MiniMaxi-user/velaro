import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth/session'
import { getHorse } from '@/features/paarden/queries'
import { getStableRole } from '@/lib/auth/authorization'
import ContractForm from '@/features/contracten/ContractForm'
import { createStallingContract } from '@/features/contracten/actions'
import { matchContractVoorRelatietype } from '@/features/contracten/relatietypeMatching'

interface Props {
  params: Promise<{ id: string }>
}

export default async function NieuwContractPage({ params }: Props) {
  const { id } = await params

  const user = await getAuthUser()
  if (!user) redirect('/login')

  const horse = await getHorse(id)
  if (!horse) notFound()

  const role = await getStableRole(user.id, horse.stableId)
  if (!role) notFound()

  // Zonder gekoppelde eigenaar is er geen wederpartij te kiezen — terug naar de tab,
  // waar de knop de melding "Koppel eerst een eigenaar" toont.
  const eigenaren = horse.people.filter((p) => p.isOwner)
  if (eigenaren.length === 0) {
    redirect(`/paarden/${id}?tab=contracten`)
  }

  const owners = eigenaren.map((p) => ({
    userId: p.user.id,
    label: p.user.name ?? p.user.email,
  }))

  const action = createStallingContract.bind(null, id)

  // Contract-matching op basis van het relatietype (#105): pensionpaard levert een
  // overschrijfbare STALLING/FULL_PENSION-voorselectie; andere relatietypes leveren
  // hooguit een informatieve indicatie.
  const match = matchContractVoorRelatietype(horse.relatietype)

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
        typeVoorselectie={match.voorselectie ?? undefined}
        relatietypeIndicatie={match.indicatie ?? undefined}
      />
    </main>
  )
}
