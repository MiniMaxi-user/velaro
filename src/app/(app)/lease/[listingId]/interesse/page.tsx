import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth/session'
import { getActiveLeaseListingDetail } from '@/features/lease/marktplaatsQueries'
import { startInquiry } from '@/features/lease/inquiryActions'
import { LEASE_TYPE_LABELS } from '@/features/lease/leaseHelpers'
import SubmitButton from '@/components/SubmitButton'

interface Props {
  params: Promise<{ listingId: string }>
}

export default async function InteresseTonenPage({ params }: Props) {
  const { listingId } = await params

  const user = await getAuthUser()
  if (!user) redirect('/login')

  const listing = await getActiveLeaseListingDetail(listingId)
  if (!listing) notFound()

  const action = startInquiry.bind(null, listingId)

  return (
    <main className="page-container">
      <div className="page-header">
        <Link href={`/lease/${listingId}`} className="btn-ghost">← {listing.horse.name}</Link>
      </div>

      <div style={{ marginBottom: 'var(--velaro-space-8)' }}>
        <div className="label">Interesse tonen</div>
        <h1 className="page-title">
          {listing.horse.name} <em>— {LEASE_TYPE_LABELS[listing.leaseType]}</em>
        </h1>
      </div>

      <form action={action} className="form-card">
        <div className="form-group">
          <label htmlFor="body" className="form-label">Bericht aan de aanbieder *</label>
          <textarea
            id="body"
            name="body"
            className="input"
            rows={5}
            required
            placeholder="Stel je kort voor en vertel waarom je interesse hebt…"
          />
        </div>
        <div className="action-buttons">
          <SubmitButton label="Versturen" />
          <Link href={`/lease/${listingId}`} className="btn-ghost">Annuleren</Link>
        </div>
      </form>
    </main>
  )
}
