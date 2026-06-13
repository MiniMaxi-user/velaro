'use client'

import Link from 'next/link'
import SubmitButton from '@/components/SubmitButton'

type OwnerOption = { userId: string; label: string }

export default function ContractForm({
  horseId,
  action,
  owners,
}: {
  horseId: string
  action: (formData: FormData) => Promise<void>
  owners: OwnerOption[]
}) {
  return (
    <form action={action} className="form-card">
      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="type" className="form-label">Type contract</label>
          <input
            id="type"
            type="text"
            className="input"
            value="Stalling — Full pension"
            readOnly
            disabled
          />
        </div>

        <div className="form-group">
          <label htmlFor="counterpartyUserId" className="form-label">Wederpartij (eigenaar) *</label>
          <select
            id="counterpartyUserId"
            name="counterpartyUserId"
            className="input"
            required
            defaultValue={owners.length === 1 ? owners[0].userId : ''}
          >
            <option value="" disabled>
              Kies een eigenaar
            </option>
            {owners.map((o) => (
              <option key={o.userId} value={o.userId}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="startDate" className="form-label">Ingangsdatum</label>
          <input id="startDate" name="startDate" type="date" className="input" />
        </div>
      </div>

      <div className="action-buttons">
        <SubmitButton label="Concept aanmaken" />
        <Link href={`/paarden/${horseId}?tab=contracten`} className="btn-ghost">Annuleren</Link>
      </div>
    </form>
  )
}
