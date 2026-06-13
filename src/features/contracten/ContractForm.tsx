'use client'

import Link from 'next/link'
import SubmitButton from '@/components/SubmitButton'
import { BOXTYPE_OPTIES, BOXTYPE_LABELS, type HuisvestingConfig } from './huisvesting'

type OwnerOption = { userId: string; label: string }

export default function ContractForm({
  horseId,
  action,
  owners,
  defaultCounterpartyUserId,
  defaultStartDate,
  huisvesting,
  submitLabel = 'Concept aanmaken',
}: {
  horseId: string
  action: (formData: FormData) => Promise<void>
  owners: OwnerOption[]
  defaultCounterpartyUserId?: string
  defaultStartDate?: string
  // Wanneer meegegeven, toont het formulier de sectie "Huisvesting & verzorging".
  // Op het bewerkscherm vullen we boxNumber voor uit het paardprofiel (overschrijfbaar).
  huisvesting?: HuisvestingConfig
  submitLabel?: string
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
            defaultValue={
              defaultCounterpartyUserId ??
              (owners.length === 1 ? owners[0].userId : '')
            }
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
          <input
            id="startDate"
            name="startDate"
            type="date"
            className="input"
            defaultValue={defaultStartDate}
          />
        </div>
      </div>

      {huisvesting && (
        <div className="form-section" style={{ marginTop: 'var(--velaro-space-6)' }}>
          <div className="form-section-title">Huisvesting &amp; verzorging</div>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="boxtype" className="form-label">Boxtype</label>
              <select
                id="boxtype"
                name="boxtype"
                className="input"
                defaultValue={huisvesting.boxtype ?? ''}
              >
                <option value="">Niet opgegeven</option>
                {BOXTYPE_OPTIES.map((opt) => (
                  <option key={opt} value={opt}>
                    {BOXTYPE_LABELS[opt]}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="boxNumber" className="form-label">Stalplek / boxnummer</label>
              <input
                id="boxNumber"
                name="boxNumber"
                type="text"
                className="input"
                defaultValue={huisvesting.boxNumber ?? ''}
              />
            </div>

            <div className="form-group">
              <label htmlFor="beddingtype" className="form-label">Beddingtype</label>
              <input
                id="beddingtype"
                name="beddingtype"
                type="text"
                className="input"
                placeholder="bijv. stro, vlas, zaagsel"
                defaultValue={huisvesting.beddingtype ?? ''}
              />
            </div>

            <div className="form-group">
              <label htmlFor="toezicht" className="form-label">Toezicht / verzorging</label>
              <input
                id="toezicht"
                name="toezicht"
                type="text"
                className="input"
                placeholder="bijv. dagelijkse controle"
                defaultValue={huisvesting.toezicht ?? ''}
              />
            </div>

            <div className="form-group">
              <label className="profiel-checkbox-label">
                <input
                  className="profiel-checkbox"
                  type="checkbox"
                  name="uitmesten"
                  value="true"
                  defaultChecked={huisvesting.uitmesten}
                />
                <span>Uitmesten door de stal</span>
              </label>
            </div>

            <div className="form-group">
              <label className="profiel-checkbox-label">
                <input
                  className="profiel-checkbox"
                  type="checkbox"
                  name="opstrooien"
                  value="true"
                  defaultChecked={huisvesting.opstrooien}
                />
                <span>Opstrooien door de stal</span>
              </label>
            </div>
          </div>
        </div>
      )}

      <div className="action-buttons">
        <SubmitButton label={submitLabel} />
        <Link href={`/paarden/${horseId}?tab=contracten`} className="btn-ghost">Annuleren</Link>
      </div>
    </form>
  )
}
