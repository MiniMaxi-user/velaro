'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toggleLeaseListingActive, deleteLeaseListing } from './listingActions'
import { LEASE_TYPE_LABELS } from './leaseHelpers'
import type { LeaseType } from '@prisma/client'

// Plat (serialiseerbaar) beeld van een lease-aanbod voor de client. Decimal wordt
// vóór doorgifte naar number omgezet.
export type LeaseListingView = {
  id: string
  leaseType: LeaseType
  daysPerWeek: number | null
  pricePerMonth: number | null
  region: string | null
  discipline: string | null
  movable: boolean
  exclusive: boolean
  description: string | null
  isActive: boolean
}

function euro(n: number | null): string {
  if (n === null) return '—'
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
  }).format(n)
}

function Veld({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="detail-field">
      <div className="detail-field-label">{label}</div>
      <div className="detail-field-value">{children}</div>
    </div>
  )
}

// Lease-aanbod beheren vanaf het paardprofiel (Lease 03, #62). Toont het bestaande
// aanbod met (de)activeer-toggle, bewerken en verwijderen — of een lege staat met
// een knop om een aanbod te plaatsen.
export default function LeaseListingPanel({
  horseId,
  listing,
}: {
  horseId: string
  listing: LeaseListingView | null
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  if (!listing) {
    return (
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Lease-aanbod</span>
        </div>
        <div className="panel-body">
          <div className="empty-state">
            <div className="empty-state__title">Nog geen lease-aanbod</div>
            <p style={{ color: 'var(--velaro-color-muted)', marginTop: 8 }}>
              Plaats dit paard op de lease-marktplaats om geïnteresseerde leasers te bereiken.
            </p>
            <div style={{ marginTop: 16 }}>
              <Link href={`/paarden/${horseId}/lease/nieuw`} className="btn-primary">
                + Plaats lease-aanbod
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  function handleToggle() {
    setError(null)
    start(async () => {
      const result = await toggleLeaseListingActive(listing!.id, horseId, !listing!.isActive)
      if (result?.error) setError(result.error)
      else router.refresh()
    })
  }

  function handleDelete() {
    if (!confirm('Dit lease-aanbod verwijderen?')) return
    setError(null)
    start(async () => {
      const result = await deleteLeaseListing(listing!.id, horseId)
      if (result?.error) setError(result.error)
      else router.refresh()
    })
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">Lease-aanbod</span>
        <span className={`badge ${listing.isActive ? 'badge-success' : 'badge-neutral'}`}>
          {listing.isActive ? 'Actief' : 'Inactief'}
        </span>
      </div>
      <div className="panel-body">
        <div className="detail-fields">
          <Veld label="Leasevorm">
            <span className="badge badge-gold">{LEASE_TYPE_LABELS[listing.leaseType]}</span>
          </Veld>
          <Veld label="Prijs per maand">{euro(listing.pricePerMonth)}</Veld>
          <Veld label="Dagen per week">{listing.daysPerWeek ?? '—'}</Veld>
          <Veld label="Regio">{listing.region ?? '—'}</Veld>
          <Veld label="Discipline">{listing.discipline ?? '—'}</Veld>
          <Veld label="Mag verplaatst worden">{listing.movable ? 'Ja' : 'Nee'}</Veld>
          <Veld label="Gebruik">{listing.exclusive ? 'Exclusief' : 'Gedeeld'}</Veld>
        </div>

        {listing.description && (
          <p style={{ marginTop: 12, color: 'var(--velaro-color-muted)' }}>{listing.description}</p>
        )}

        {error && (
          <span className="form-error" style={{ display: 'block', marginTop: 12 }}>{error}</span>
        )}

        <div className="action-buttons" style={{ marginTop: 16 }}>
          <Link href={`/paarden/${horseId}/lease/bewerken`} className="btn-secondary">Bewerken</Link>
          <button type="button" className="btn-ghost" onClick={handleToggle} disabled={pending}>
            {listing.isActive ? 'Op inactief zetten' : 'Activeren'}
          </button>
          <button type="button" className="btn-ghost" onClick={handleDelete} disabled={pending}>
            Verwijderen
          </button>
        </div>
      </div>
    </div>
  )
}
