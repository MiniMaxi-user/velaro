import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth/session'
import { getHorse } from '@/features/paarden/queries'
import { getStableRole } from '@/lib/auth/authorization'
import { getLeaseListingForHorse } from '@/features/lease/listingQueries'
import LeaseListingForm from '@/features/lease/LeaseListingForm'
import { createLeaseListing } from '@/features/lease/listingActions'

interface Props {
  params: Promise<{ id: string }>
}

export default async function NieuwLeaseAanbodPage({ params }: Props) {
  const { id } = await params

  const user = await getAuthUser()
  if (!user) redirect('/login')

  const horse = await getHorse(id)
  if (!horse) notFound()

  const role = await getStableRole(user.id, horse.stableId)
  if (!role) notFound()

  // Eén aanbod per paard: bestaat er al een, stuur door naar bewerken.
  const bestaand = await getLeaseListingForHorse(id)
  if (bestaand) redirect(`/paarden/${id}/lease/bewerken`)

  const action = createLeaseListing.bind(null, id)

  return (
    <main className="page-container">
      <div className="page-header">
        <Link href={`/paarden/${id}?tab=lease`} className="btn-ghost">← {horse.name}</Link>
      </div>

      <div style={{ marginBottom: 'var(--velaro-space-8)' }}>
        <div className="label">Lease-aanbod plaatsen</div>
        <h1 className="page-title">{horse.name}</h1>
      </div>

      <LeaseListingForm horseId={id} action={action} />
    </main>
  )
}
