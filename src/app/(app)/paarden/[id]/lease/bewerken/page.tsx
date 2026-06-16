import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth/session'
import { getHorse } from '@/features/paarden/queries'
import { getStableRole } from '@/lib/auth/authorization'
import { getLeaseListingForHorse } from '@/features/lease/listingQueries'
import LeaseListingForm from '@/features/lease/LeaseListingForm'
import { updateLeaseListing } from '@/features/lease/listingActions'

interface Props {
  params: Promise<{ id: string }>
}

export default async function BewerkLeaseAanbodPage({ params }: Props) {
  const { id } = await params

  const user = await getAuthUser()
  if (!user) redirect('/login')

  const horse = await getHorse(id)
  if (!horse) notFound()

  const role = await getStableRole(user.id, horse.stableId)
  if (!role) notFound()

  const listing = await getLeaseListingForHorse(id)
  if (!listing) redirect(`/paarden/${id}/lease/nieuw`)

  const action = updateLeaseListing.bind(null, listing.id, id)

  return (
    <main className="page-container">
      <div className="page-header">
        <Link href={`/paarden/${id}?tab=lease`} className="btn-ghost">← {horse.name}</Link>
      </div>

      <div style={{ marginBottom: 'var(--velaro-space-8)' }}>
        <div className="label">Lease-aanbod bewerken</div>
        <h1 className="page-title">{horse.name}</h1>
      </div>

      <LeaseListingForm
        horseId={id}
        action={action}
        defaultValues={{
          leaseType: listing.leaseType,
          daysPerWeek: listing.daysPerWeek?.toString(),
          pricePerMonth: listing.pricePerMonth ? Number(listing.pricePerMonth).toString() : undefined,
          region: listing.region ?? undefined,
          discipline: listing.discipline ?? undefined,
          movable: listing.movable,
          exclusive: listing.exclusive,
          description: listing.description ?? undefined,
        }}
      />
    </main>
  )
}
