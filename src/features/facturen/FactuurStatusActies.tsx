'use client'

import { useState, useTransition } from 'react'
import type { InvoiceStatus } from '@prisma/client'
import { isGeldigeStatusovergang } from './factuurStatus'

// Statusbeheer-knoppen op de detail-/bewerkpagina van een definitieve factuur (Fact 07,
// #152). Toont uitsluitend de knoppen voor de geldige overgangen (centrale validatie in
// factuurStatus.ts); de daadwerkelijke overgang wordt server-side opnieuw gevalideerd via
// de meegegeven server actions. De client houdt enkel de laad-/foutstatus bij.
//
// - "Markeren als betaald": zichtbaar wanneer VERZONDEN/VERVALLEN → BETAALD geldig is.
// - "Annuleren": zichtbaar wanneer → GEANNULEERD geldig is (niet vanuit BETAALD).
// - "Markeren als herinnerd": alleen bij een VERVALLEN-factuur (administratieve markering).
export default function FactuurStatusActies({
  status,
  reminderSentAt,
  betaaldAction,
  annuleerAction,
  herinnerdAction,
}: {
  status: InvoiceStatus
  reminderSentAt: string | null
  betaaldAction: () => Promise<void>
  annuleerAction: () => Promise<void>
  herinnerdAction: () => Promise<void>
}) {
  const [pending, startTransition] = useTransition()
  const [fout, setFout] = useState<string | null>(null)

  const kanBetaald = isGeldigeStatusovergang(status, 'BETAALD')
  const kanAnnuleren = isGeldigeStatusovergang(status, 'GEANNULEERD')
  const kanHerinneren = status === 'VERVALLEN'

  function voerUit(action: () => Promise<void>) {
    setFout(null)
    startTransition(async () => {
      try {
        await action()
      } catch (e) {
        setFout(e instanceof Error ? e.message : 'Er ging iets mis.')
      }
    })
  }

  if (!kanBetaald && !kanAnnuleren && !kanHerinneren) {
    return (
      <p className="form-help">
        Voor deze factuur zijn geen statusacties meer beschikbaar.
      </p>
    )
  }

  return (
    <div>
      <div className="action-buttons" style={{ marginTop: 0, flexWrap: 'wrap' }}>
        {kanBetaald && (
          <button
            type="button"
            className="btn-primary"
            onClick={() => voerUit(betaaldAction)}
            disabled={pending}
          >
            {pending ? 'Bezig…' : 'Markeren als betaald'}
          </button>
        )}
        {kanHerinneren && (
          <button
            type="button"
            className="btn-ghost"
            onClick={() => voerUit(herinnerdAction)}
            disabled={pending}
          >
            {pending ? 'Bezig…' : 'Markeren als herinnerd'}
          </button>
        )}
        {kanAnnuleren && (
          <button
            type="button"
            className="btn-ghost"
            onClick={() => voerUit(annuleerAction)}
            disabled={pending}
          >
            {pending ? 'Bezig…' : 'Annuleren'}
          </button>
        )}
      </div>
      {reminderSentAt && (
        <p className="form-help" style={{ marginTop: 'var(--velaro-space-2)' }}>
          Er is een herinnering genoteerd op {new Date(reminderSentAt).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}.
        </p>
      )}
      {fout && (
        <p className="form-help" style={{ marginTop: 'var(--velaro-space-2)', color: 'var(--velaro-color-danger)' }}>
          {fout}
        </p>
      )}
    </div>
  )
}
