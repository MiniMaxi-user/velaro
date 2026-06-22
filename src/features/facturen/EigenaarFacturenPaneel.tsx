'use client'

import { useState, useTransition } from 'react'
import type { InvoiceStatus } from '@prisma/client'
import { formatEuro } from './berekeningen'
import { INVOICE_STATUS_LABEL, INVOICE_STATUS_BADGE } from './factuurStatus'

// Eén read-only factuurregel voor de eigenaar/leaser (Fact 07, #152).
export interface EigenaarFactuurRegel {
  id: string
  invoiceNumber: string | null
  status: InvoiceStatus
  stableName: string
  invoiceDate: string | null
  dueDate: string | null
  total: string
}

function formatDatum(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

// "Mijn facturen"-paneel op het eigenaar-dashboard: uitsluitend de eigen, niet-CONCEPT
// facturen (de query sluit concepten uit). Read-only — de eigenaar beheert geen status —
// met een "PDF openen"-knop per factuur die de signed URL ophaalt. Bron van waarheid is de
// server; de client houdt enkel de laad-/foutstatus bij.
export default function EigenaarFacturenPaneel({
  facturen,
  pdfUrlAction,
}: {
  facturen: EigenaarFactuurRegel[]
  pdfUrlAction: (invoiceId: string) => Promise<string | null>
}) {
  const [pending, startTransition] = useTransition()
  const [bezigId, setBezigId] = useState<string | null>(null)
  const [fout, setFout] = useState<string | null>(null)

  function openPdf(invoiceId: string) {
    setFout(null)
    setBezigId(invoiceId)
    startTransition(async () => {
      try {
        const url = await pdfUrlAction(invoiceId)
        if (url) {
          window.open(url, '_blank', 'noopener')
        } else {
          setFout('De PDF is nog niet beschikbaar.')
        }
      } finally {
        setBezigId(null)
      }
    })
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">Mijn facturen</span>
        <span className="badge badge-neutral">{facturen.length}</span>
      </div>
      <div className="panel-body">
        {facturen.length === 0 ? (
          <div className="gezondheid-leeg">Je hebt nog geen facturen ontvangen.</div>
        ) : (
          <table className="gezondheid-tabel">
            <thead>
              <tr>
                <th>Factuurnummer</th>
                <th>Stal</th>
                <th>Factuurdatum</th>
                <th>Vervaldatum</th>
                <th>Totaal</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {facturen.map((f) => (
                <tr key={f.id}>
                  <td>{f.invoiceNumber ?? '—'}</td>
                  <td className="gezondheid-tabel__muted">{f.stableName}</td>
                  <td className="gezondheid-tabel__muted">{formatDatum(f.invoiceDate)}</td>
                  <td className="gezondheid-tabel__muted">{formatDatum(f.dueDate)}</td>
                  <td className="gezondheid-tabel__muted">{formatEuro(f.total)}</td>
                  <td>
                    <span className={`badge ${INVOICE_STATUS_BADGE[f.status]}`}>
                      {INVOICE_STATUS_LABEL[f.status]}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn-ghost btn-ghost--sm"
                      onClick={() => openPdf(f.id)}
                      disabled={pending && bezigId === f.id}
                    >
                      {pending && bezigId === f.id ? 'PDF openen…' : 'PDF openen'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {fout && (
          <p className="form-help" style={{ marginTop: 'var(--velaro-space-2)' }}>
            {fout}
          </p>
        )}
      </div>
    </div>
  )
}
