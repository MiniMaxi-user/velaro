'use client'

import SubmitButton from '@/components/SubmitButton'
import type { FactuurOntvangerKeuze, FactuurContractKeuze } from './queries'

interface KopWaarden {
  recipientUserId: string | null
  contractId: string | null
  invoiceDate: string | null
  dueDate: string | null
  notes: string | null
}

// Bewerkt de factuurkop (ontvanger, bron-contract, datums, opmerking) van een
// concept-factuur ([Fact 03] #148). Mutatie loopt via een server action; validatie
// server-side.
export default function FactuurKopForm({
  action,
  ontvangers,
  contracten,
  waarden,
}: {
  action: (formData: FormData) => Promise<void>
  ontvangers: FactuurOntvangerKeuze[]
  contracten: FactuurContractKeuze[]
  waarden: KopWaarden
}) {
  return (
    <form action={action} className="form-card">
      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="recipientUserId" className="form-label">
            Ontvanger *
          </label>
          <select
            id="recipientUserId"
            name="recipientUserId"
            className="input"
            required
            defaultValue={waarden.recipientUserId ?? ''}
          >
            <option value="" disabled>
              Kies een ontvanger…
            </option>
            {ontvangers.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name ? `${o.name} (${o.email})` : o.email}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="contractId" className="form-label">
            Bron-contract (optioneel)
          </label>
          <select
            id="contractId"
            name="contractId"
            className="input"
            defaultValue={waarden.contractId ?? ''}
          >
            <option value="">Geen contract koppelen</option>
            {contracten.map((c) => (
              <option key={c.id} value={c.id}>
                {c.horseName}
                {c.counterpartyName ? ` — ${c.counterpartyName}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="invoiceDate" className="form-label">
            Factuurdatum
          </label>
          <input
            id="invoiceDate"
            name="invoiceDate"
            type="date"
            className="input"
            defaultValue={waarden.invoiceDate ?? ''}
          />
        </div>

        <div className="form-group">
          <label htmlFor="dueDate" className="form-label">
            Vervaldatum
          </label>
          <input
            id="dueDate"
            name="dueDate"
            type="date"
            className="input"
            defaultValue={waarden.dueDate ?? ''}
          />
        </div>

        <div className="form-group form-grid--full">
          <label htmlFor="notes" className="form-label">
            Opmerking
          </label>
          <textarea
            id="notes"
            name="notes"
            className="input"
            rows={2}
            defaultValue={waarden.notes ?? ''}
          />
        </div>
      </div>

      <div className="action-buttons">
        <SubmitButton label="Kop opslaan" />
      </div>
    </form>
  )
}
