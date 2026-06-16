'use client'

import Link from 'next/link'
import SubmitButton from '@/components/SubmitButton'
import { LEASE_TYPE_LABELS, LEASE_TYPE_OPTIES } from './leaseHelpers'
import type { LeaseType } from '@prisma/client'

interface DefaultValues {
  leaseType?: LeaseType
  daysPerWeek?: string
  pricePerMonth?: string
  region?: string
  discipline?: string
  movable?: boolean
  exclusive?: boolean
  description?: string
}

// Formulier voor het aanmaken/bewerken van een lease-aanbod (Lease 03, #62).
// Volgt het bestaande nieuw/bewerken-patroon van de gezondheidsformulieren.
export default function LeaseListingForm({
  horseId,
  action,
  defaultValues,
}: {
  horseId: string
  action: (formData: FormData) => Promise<void>
  defaultValues?: DefaultValues
}) {
  const checkboxStijl = { display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' } as const
  return (
    <form action={action} className="form-card">
      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="leaseType" className="form-label">Leasevorm *</label>
          <select
            id="leaseType"
            name="leaseType"
            className="input"
            required
            defaultValue={defaultValues?.leaseType ?? ''}
          >
            <option value="" disabled>Kies een leasevorm…</option>
            {LEASE_TYPE_OPTIES.map((t) => (
              <option key={t} value={t}>{LEASE_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="pricePerMonth" className="form-label">Prijs per maand (€) *</label>
          <input
            id="pricePerMonth"
            name="pricePerMonth"
            type="number"
            min="0"
            step="0.01"
            className="input"
            required
            defaultValue={defaultValues?.pricePerMonth}
          />
        </div>

        <div className="form-group">
          <label htmlFor="daysPerWeek" className="form-label">Dagen per week</label>
          <input
            id="daysPerWeek"
            name="daysPerWeek"
            type="number"
            min="1"
            max="7"
            className="input"
            placeholder="bij deellease/bijrijden"
            defaultValue={defaultValues?.daysPerWeek}
          />
        </div>

        <div className="form-group">
          <label htmlFor="region" className="form-label">Regio</label>
          <input id="region" name="region" type="text" className="input" placeholder="bv. Gelderland" defaultValue={defaultValues?.region} />
        </div>

        <div className="form-group">
          <label htmlFor="discipline" className="form-label">Discipline</label>
          <input id="discipline" name="discipline" type="text" className="input" placeholder="bv. Dressuur" defaultValue={defaultValues?.discipline} />
        </div>

        <div className="form-group form-grid--full">
          <label htmlFor="description" className="form-label">Omschrijving</label>
          <textarea id="description" name="description" className="input" rows={4} defaultValue={defaultValues?.description} />
        </div>

        <div className="form-group">
          <label style={checkboxStijl}>
            <input type="checkbox" name="movable" defaultChecked={defaultValues?.movable} />
            Mag verplaatst worden
          </label>
        </div>

        <div className="form-group">
          <label style={checkboxStijl}>
            <input type="checkbox" name="exclusive" defaultChecked={defaultValues?.exclusive ?? true} />
            Exclusief (één leaser)
          </label>
        </div>
      </div>

      <div className="action-buttons">
        <SubmitButton label="Opslaan" />
        <Link href={`/paarden/${horseId}?tab=lease`} className="btn-ghost">Annuleren</Link>
      </div>
    </form>
  )
}
