'use client'

import { useState } from 'react'
import type { VatRate } from '@prisma/client'
import SubmitButton from '@/components/SubmitButton'
import { VAT_RATES, VAT_RATE_LABEL, formatEuro } from './berekeningen'

export interface RegelWeergave {
  id: string
  description: string
  quantity: string
  unitPrice: string
  vatRate: VatRate
  lineTotal: string
}

// Regelbeheer voor een concept-factuur ([Fact 03] #148): regels tonen, toevoegen,
// inline bewerken en verwijderen. Elke mutatie loopt via een server action (bron van
// waarheid is de server); de definitieve berekening/validatie gebeurt server-side. De
// client houdt enkel bij welke rij in bewerkmodus staat.
export default function FactuurRegelsBeheer({
  regels,
  voegToeAction,
  werkBijAction,
  verwijderAction,
  voorvulAction,
  kanVoorvullen = false,
}: {
  regels: RegelWeergave[]
  voegToeAction: (formData: FormData) => Promise<void>
  werkBijAction: (lineId: string, formData: FormData) => Promise<void>
  verwijderAction: (lineId: string) => Promise<void>
  // Voorvullen uit het gekoppelde contract ([Fact 04] #149). Optioneel: alleen
  // beschikbaar wanneer er een bron-contract gekoppeld is én de factuur nog "vers" is.
  voorvulAction?: () => Promise<void>
  kanVoorvullen?: boolean
}) {
  const [bewerktId, setBewerktId] = useState<string | null>(null)
  const kanVerwijderen = regels.length > 1

  return (
    <div>
      {voorvulAction && kanVoorvullen ? (
        <form action={voorvulAction} style={{ marginBottom: 'var(--velaro-space-4)' }}>
          <SubmitButton
            label="Regels voorvullen uit contract"
            loadingLabel="Bezig met voorvullen…"
          />
        </form>
      ) : null}

      <table className="gezondheid-tabel">
        <thead>
          <tr>
            <th>Omschrijving</th>
            <th>Aantal</th>
            <th>Stuksprijs</th>
            <th>Btw</th>
            <th>Regelbedrag</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {regels.map((regel) =>
            bewerktId === regel.id ? (
              <tr key={regel.id}>
                <td colSpan={6}>
                  <form
                    action={werkBijAction.bind(null, regel.id)}
                    className="form-grid"
                    style={{ alignItems: 'end' }}
                  >
                    <div className="form-group form-grid--full">
                      <label className="form-label">Omschrijving *</label>
                      <input
                        name="description"
                        type="text"
                        className="input"
                        defaultValue={regel.description}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Aantal *</label>
                      <input
                        name="quantity"
                        type="number"
                        step="0.01"
                        min="0.01"
                        className="input"
                        defaultValue={regel.quantity}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Stuksprijs excl. btw (€) *</label>
                      <input
                        name="unitPrice"
                        type="number"
                        step="0.01"
                        min="0"
                        className="input"
                        defaultValue={regel.unitPrice}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Btw-tarief *</label>
                      <select
                        name="vatRate"
                        className="input"
                        defaultValue={regel.vatRate}
                        required
                      >
                        {VAT_RATES.map((r) => (
                          <option key={r} value={r}>
                            {VAT_RATE_LABEL[r]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group form-grid--full">
                      <div className="action-buttons">
                        <SubmitButton label="Regel opslaan" />
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => setBewerktId(null)}
                        >
                          Annuleren
                        </button>
                      </div>
                    </div>
                  </form>
                </td>
              </tr>
            ) : (
              <tr key={regel.id}>
                <td>{regel.description}</td>
                <td className="gezondheid-tabel__muted">{regel.quantity}</td>
                <td className="gezondheid-tabel__muted">{formatEuro(regel.unitPrice)}</td>
                <td className="gezondheid-tabel__muted">{VAT_RATE_LABEL[regel.vatRate]}</td>
                <td>{formatEuro(regel.lineTotal)}</td>
                <td>
                  <div className="action-buttons" style={{ marginTop: 0 }}>
                    <button
                      type="button"
                      className="btn-ghost btn-danger--sm"
                      onClick={() => setBewerktId(regel.id)}
                    >
                      Bewerken
                    </button>
                    {kanVerwijderen ? (
                      <form action={verwijderAction.bind(null, regel.id)}>
                        <SubmitButton label="Verwijderen" loadingLabel="Bezig…" />
                      </form>
                    ) : null}
                  </div>
                </td>
              </tr>
            ),
          )}
        </tbody>
      </table>

      <div className="panel" style={{ marginTop: 'var(--velaro-space-4)' }}>
        <div className="panel-header">
          <span className="panel-title">Regel toevoegen</span>
        </div>
        <div className="panel-body">
          <form action={voegToeAction} className="form-grid" style={{ alignItems: 'end' }}>
            <div className="form-group form-grid--full">
              <label className="form-label">Omschrijving *</label>
              <input
                name="description"
                type="text"
                className="input"
                placeholder="bv. Extra rijbak-gebruik"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Aantal *</label>
              <input
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
              <label className="form-label">Stuksprijs excl. btw (€) *</label>
              <input
                name="unitPrice"
                type="number"
                step="0.01"
                min="0"
                className="input"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Btw-tarief *</label>
              <select name="vatRate" className="input" defaultValue="HOOG" required>
                {VAT_RATES.map((r) => (
                  <option key={r} value={r}>
                    {VAT_RATE_LABEL[r]}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group form-grid--full">
              <SubmitButton label="Regel toevoegen" />
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
