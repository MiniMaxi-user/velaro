'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { InvoiceStatus } from '@prisma/client'
import { formatDatum } from '@/features/paarden/paardHelpers'
import { formatEuro } from './berekeningen'
import { INVOICE_STATUS_LABEL, INVOICE_STATUS_BADGE } from './factuurStatus'

// Eén overzichtsregel voor het facturen-dashboard (Fact 07, #152). Bevat de velden die
// het overzicht toont; bedragen komen als string binnen (server-side met Decimal berekend,
// hier alleen weergegeven via formatEuro).
export interface FactuurOverzichtRegel {
  id: string
  invoiceNumber: string | null
  status: InvoiceStatus
  recipientName: string | null
  recipientEmail: string | null
  invoiceDate: string | null
  dueDate: string | null
  total: string
  reminderSentAt: string | null
}

// De beschikbare statusfilters. "alle" toont alles; de overige filteren op één status.
type Filter = 'alle' | 'openstaand' | 'betaald' | 'vervallen' | 'concept' | 'geannuleerd'

const FILTERS: { waarde: Filter; label: string }[] = [
  { waarde: 'alle', label: 'Alle' },
  { waarde: 'openstaand', label: 'Openstaand' },
  { waarde: 'betaald', label: 'Betaald' },
  { waarde: 'vervallen', label: 'Vervallen' },
  { waarde: 'concept', label: 'Concept' },
  { waarde: 'geannuleerd', label: 'Geannuleerd' },
]

// Bepaalt of een factuur bij het gekozen filter hoort. "openstaand" = VERZONDEN + VERVALLEN
// (nog te innen); de bron van waarheid is de server-status, dit is enkel een weergavefilter.
function past(status: InvoiceStatus, filter: Filter): boolean {
  switch (filter) {
    case 'alle':
      return true
    case 'openstaand':
      return status === 'VERZONDEN' || status === 'VERVALLEN'
    case 'betaald':
      return status === 'BETAALD'
    case 'vervallen':
      return status === 'VERVALLEN'
    case 'concept':
      return status === 'CONCEPT'
    case 'geannuleerd':
      return status === 'GEANNULEERD'
  }
}

// Client-side filterbaar facturen-overzicht. De volledige (server-gescopete) lijst komt
// binnen; het filter beperkt enkel de weergave. Een rij linkt naar de bestaande
// bewerk-/detailpagina. Nieuwste eerst (de server levert dat al).
export default function FactuurOverzicht({
  facturen,
  legeTekst = 'Nog geen facturen in deze stal.',
}: {
  facturen: FactuurOverzichtRegel[]
  legeTekst?: string
}) {
  const [filter, setFilter] = useState<Filter>('alle')

  const zichtbaar = facturen.filter((f) => past(f.status, filter))

  return (
    <div>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'var(--velaro-space-2)',
          marginBottom: 'var(--velaro-space-4)',
        }}
      >
        {FILTERS.map((f) => (
          <button
            key={f.waarde}
            type="button"
            onClick={() => setFilter(f.waarde)}
            className={filter === f.waarde ? 'btn-primary btn-ghost--sm' : 'btn-ghost btn-ghost--sm'}
          >
            {f.label}
          </button>
        ))}
      </div>

      {zichtbaar.length === 0 ? (
        <div className="gezondheid-leeg">
          {facturen.length === 0 ? legeTekst : 'Geen facturen in deze selectie.'}
        </div>
      ) : (
        <table className="gezondheid-tabel">
          <thead>
            <tr>
              <th>Factuurnummer</th>
              <th>Ontvanger</th>
              <th>Factuurdatum</th>
              <th>Vervaldatum</th>
              <th>Totaal</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {zichtbaar.map((f) => (
              <tr key={f.id}>
                <td>
                  <Link href={`/stal/facturen/${f.id}/bewerken`} className="form-link">
                    {f.invoiceNumber ?? 'Concept'}
                  </Link>
                </td>
                <td className="gezondheid-tabel__muted">
                  {f.recipientName ?? f.recipientEmail ?? '—'}
                </td>
                <td className="gezondheid-tabel__muted">
                  {f.invoiceDate ? formatDatum(new Date(f.invoiceDate)) : '—'}
                </td>
                <td className="gezondheid-tabel__muted">
                  {f.dueDate ? formatDatum(new Date(f.dueDate)) : '—'}
                </td>
                <td className="gezondheid-tabel__muted">{formatEuro(f.total)}</td>
                <td>
                  <span className={`badge ${INVOICE_STATUS_BADGE[f.status]}`}>
                    {INVOICE_STATUS_LABEL[f.status]}
                  </span>
                  {f.reminderSentAt && (
                    <span className="badge badge-warning" style={{ marginLeft: 'var(--velaro-space-2)' }}>
                      Herinnerd {formatDatum(new Date(f.reminderSentAt))}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
