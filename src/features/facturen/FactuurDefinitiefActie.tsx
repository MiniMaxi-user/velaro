'use client'

import { useState, useTransition } from 'react'
import SubmitButton from '@/components/SubmitButton'

// UI-trigger voor het definitief maken van een concept-factuur ([Fact 05] #150).
// Toont — bij een concept met minimaal één regel — een knop "Factuur definitief maken"
// (server action). Bij een al definitieve factuur toont het component het toegekende
// factuurnummer en een knop "PDF openen" die de signed URL ophaalt (server action) en
// in een nieuw tabblad opent. Bron van waarheid is de server; de client houdt enkel de
// open-/laad-status bij.
export default function FactuurDefinitiefActie({
  isConcept,
  heeftRegels,
  invoiceNumber,
  definitiefAction,
  pdfUrlAction,
}: {
  isConcept: boolean
  heeftRegels: boolean
  invoiceNumber: string | null
  definitiefAction: () => Promise<void>
  pdfUrlAction: () => Promise<string | null>
}) {
  const [pending, startTransition] = useTransition()
  const [fout, setFout] = useState<string | null>(null)

  function openPdf() {
    setFout(null)
    startTransition(async () => {
      const url = await pdfUrlAction()
      if (url) {
        window.open(url, '_blank', 'noopener')
      } else {
        setFout('De PDF is nog niet beschikbaar.')
      }
    })
  }

  if (isConcept) {
    return (
      <div>
        <p className="form-help" style={{ marginBottom: 'var(--velaro-space-4)' }}>
          Bij het definitief maken krijgt de factuur een uniek, opvolgend factuurnummer en
          wordt er een PDF gegenereerd. Een definitieve factuur kan niet meer worden
          gewijzigd.
        </p>
        {heeftRegels ? (
          <form action={definitiefAction}>
            <SubmitButton
              label="Factuur definitief maken"
              loadingLabel="Bezig met definitief maken…"
            />
          </form>
        ) : (
          <p className="form-help" style={{ marginTop: 'var(--velaro-space-2)' }}>
            Voeg eerst minimaal één regel toe.
          </p>
        )}
      </div>
    )
  }

  return (
    <div>
      {invoiceNumber && (
        <p style={{ marginBottom: 'var(--velaro-space-4)' }}>
          Factuurnummer: <strong>{invoiceNumber}</strong>
        </p>
      )}
      <div className="action-buttons" style={{ marginTop: 0 }}>
        <button type="button" className="btn-primary" onClick={openPdf} disabled={pending}>
          {pending ? 'PDF openen…' : 'PDF openen'}
        </button>
      </div>
      {fout && (
        <p className="form-help" style={{ marginTop: 'var(--velaro-space-2)' }}>
          {fout}
        </p>
      )}
    </div>
  )
}
