'use client'

import Link from 'next/link'
import SubmitButton from '@/components/SubmitButton'
import { VAT_RATES, VAT_RATE_LABEL } from './berekeningen'
import type { FactuurOntvangerKeuze, FactuurContractKeuze } from './queries'

// Aanmaak-formulier voor een concept-factuur ([Fact 03] #148). Twee-staps-flow: hier
// worden de factuurkop én de verplichte eerste regel ingevoerd; verdere regels beheert de
// gebruiker daarna op de bewerk-pagina. De server is de bron van waarheid: validatie en
// de definitieve berekening gebeuren server-side bij opslaan.
export default function FactuurAanmaakForm({
  action,
  ontvangers,
  contracten,
}: {
  action: (formData: FormData) => Promise<void>
  ontvangers: FactuurOntvangerKeuze[]
  contracten: FactuurContractKeuze[]
}) {
  return (
    <form action={action} className="form-card">
      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="recipientUserId" className="form-label">
            Ontvanger *
          </label>
          <select id="recipientUserId" name="recipientUserId" className="input" required defaultValue="">
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
          <select id="contractId" name="contractId" className="input" defaultValue="">
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
          <input id="invoiceDate" name="invoiceDate" type="date" className="input" />
        </div>

        <div className="form-group">
          <label htmlFor="dueDate" className="form-label">
            Vervaldatum
          </label>
          <input id="dueDate" name="dueDate" type="date" className="input" />
        </div>

        <div className="form-group form-grid--full">
          <label htmlFor="notes" className="form-label">
            Opmerking
          </label>
          <textarea id="notes" name="notes" className="input" rows={2} />
        </div>
      </div>

      <div className="panel" style={{ marginTop: 'var(--velaro-space-4)' }}>
        <div className="panel-header">
          <span className="panel-title">Eerste regel</span>
        </div>
        <div className="panel-body">
          <div className="form-grid">
            <div className="form-group form-grid--full">
              <label htmlFor="description" className="form-label">
                Omschrijving *
              </label>
              <input
                id="description"
                name="description"
                type="text"
                className="input"
                placeholder="bv. Stalling juni 2026"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="quantity" className="form-label">
                Aantal *
              </label>
              <input
                id="quantity"
                name="quantity"
                type="number"
                step="0.01"
                min="0.01"
                className="input"
                defaultValue="1"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="unitPrice" className="form-label">
                Stuksprijs excl. btw (€) *
              </label>
              <input
                id="unitPrice"
                name="unitPrice"
                type="number"
                step="0.01"
                min="0"
                className="input"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="vatRate" className="form-label">
                Btw-tarief *
              </label>
              <select id="vatRate" name="vatRate" className="input" required defaultValue="HOOG">
                {VAT_RATES.map((r) => (
                  <option key={r} value={r}>
                    {VAT_RATE_LABEL[r]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="action-buttons">
        <SubmitButton label="Concept opslaan" />
        <Link href="/stal/contracten" className="btn-ghost">
          Annuleren
        </Link>
      </div>
    </form>
  )
}
