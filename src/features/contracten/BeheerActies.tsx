'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import {
  beeindigContract,
  legPrijsverlagingVast,
  markeerRetentierecht,
  opschortenContract,
  opzeggenContract,
} from './actions'

// Beheer-acties voor een actief/verlengd stallingscontract (STAL-15, #88), enkel
// voor OWNER/STAFF (de stal). De server-acties dwingen rol én statusmachine nogmaals
// af; deze component verzorgt de interactie en de invoer voor de tijdgebonden/data-
// velden (opzegreden, opschort-einddatum, prijsverlaging, retentierecht, beëindiging).
type Paneel = 'opzeggen' | 'opschorten' | 'prijsverlaging' | 'retentie' | 'beeindigen' | null

export default function BeheerActies({
  horseId,
  contractId,
  retentieActief,
}: {
  horseId: string
  contractId: string
  // Of er momenteel wanbetaling/retentierecht gemarkeerd staat (voor de toggel-tekst).
  retentieActief: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState<Paneel>(null)

  function voerUit(fn: () => Promise<void>, bevestiging?: string) {
    if (bevestiging && !confirm(bevestiging)) return
    setError(null)
    startTransition(async () => {
      try {
        await fn()
        setOpen(null)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'De actie is mislukt.')
      }
    })
  }

  // Bouwt een FormData uit een formulier-submit en roept de bijbehorende actie aan.
  function onSubmit(
    e: React.FormEvent<HTMLFormElement>,
    actie: (horseId: string, contractId: string, fd: FormData) => Promise<void>,
    bevestiging?: string,
  ) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    voerUit(() => actie(horseId, contractId, fd), bevestiging)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn-ghost btn-ghost--sm"
          onClick={() => setOpen(open === 'opzeggen' ? null : 'opzeggen')}
          disabled={pending}
        >
          Opzeggen
        </button>
        <button
          type="button"
          className="btn-ghost btn-ghost--sm"
          onClick={() => setOpen(open === 'opschorten' ? null : 'opschorten')}
          disabled={pending}
        >
          Opschorten
        </button>
        <button
          type="button"
          className="btn-ghost btn-ghost--sm"
          onClick={() => setOpen(open === 'prijsverlaging' ? null : 'prijsverlaging')}
          disabled={pending}
        >
          Prijsverlaging
        </button>
        <button
          type="button"
          className="btn-ghost btn-ghost--sm"
          onClick={() => setOpen(open === 'retentie' ? null : 'retentie')}
          disabled={pending}
        >
          {retentieActief ? 'Retentierecht beheren' : 'Retentierecht'}
        </button>
        <button
          type="button"
          className="btn-ghost btn-ghost--sm"
          onClick={() => setOpen(open === 'beeindigen' ? null : 'beeindigen')}
          disabled={pending}
        >
          Beëindigen
        </button>
      </div>

      {open === 'opzeggen' && (
        <form
          className="form-group"
          onSubmit={(e) =>
            onSubmit(
              e,
              opzeggenContract,
              'Het contract opzeggen? Het systeem berekent de einddatum op basis van de opzegtermijn en de eigenaar ontvangt een melding.',
            )
          }
        >
          <label className="form-label">
            Reden (optioneel)
            <input className="input" name="reden" type="text" />
          </label>
          <button type="submit" className="btn-primary btn-primary--sm" disabled={pending}>
            {pending ? 'Bezig…' : 'Opzegging bevestigen'}
          </button>
        </form>
      )}

      {open === 'opschorten' && (
        <form
          className="form-group"
          onSubmit={(e) =>
            onSubmit(
              e,
              opschortenContract,
              'Het contract opschorten tot de opgegeven einddatum? De eigenaar ontvangt een melding.',
            )
          }
        >
          <label className="form-label">
            Einddatum opschorting
            <input className="input" name="einddatum" type="date" required />
          </label>
          <label className="form-label">
            Reden (optioneel)
            <input className="input" name="reden" type="text" />
          </label>
          <button type="submit" className="btn-primary btn-primary--sm" disabled={pending}>
            {pending ? 'Bezig…' : 'Opschorten'}
          </button>
        </form>
      )}

      {open === 'prijsverlaging' && (
        <form className="form-group" onSubmit={(e) => onSubmit(e, legPrijsverlagingVast)}>
          <label className="form-label">
            Verlaagd bedrag (per maand, €)
            <input className="input" name="bedrag" type="number" min="0" step="0.01" required />
          </label>
          <label className="form-label">
            Startdatum
            <input className="input" name="startdatum" type="date" required />
          </label>
          <label className="form-label">
            Einddatum
            <input className="input" name="einddatum" type="date" required />
          </label>
          <label className="form-label">
            Notitie (optioneel)
            <input className="input" name="notitie" type="text" />
          </label>
          <button type="submit" className="btn-primary btn-primary--sm" disabled={pending}>
            {pending ? 'Bezig…' : 'Prijsverlaging vastleggen'}
          </button>
        </form>
      )}

      {open === 'retentie' && (
        <form className="form-group" onSubmit={(e) => onSubmit(e, markeerRetentierecht)}>
          <input type="hidden" name="actief" value={retentieActief ? 'false' : 'true'} />
          {!retentieActief && (
            <label className="form-label">
              Notitie (optioneel)
              <input className="input" name="notitie" type="text" />
            </label>
          )}
          <button type="submit" className="btn-primary btn-primary--sm" disabled={pending}>
            {pending
              ? 'Bezig…'
              : retentieActief
                ? 'Markering opheffen'
                : 'Wanbetaling/retentierecht markeren'}
          </button>
        </form>
      )}

      {open === 'beeindigen' && (
        <form
          className="form-group"
          onSubmit={(e) =>
            onSubmit(
              e,
              beeindigContract,
              'Het contract direct beëindigen? Deze actie is bedoeld voor overlijden of versnelde beëindiging bij langdurige blessure en kan niet ongedaan worden gemaakt.',
            )
          }
        >
          <label className="form-label">
            Reden
            <select className="input" name="reden" defaultValue="OVERLIJDEN">
              <option value="OVERLIJDEN">Overlijden van het paard</option>
              <option value="BLESSURE">Langdurige blessure (versneld opzegrecht)</option>
            </select>
          </label>
          <label className="form-label">
            Toelichting (optioneel)
            <input className="input" name="toelichting" type="text" />
          </label>
          <button type="submit" className="btn-primary btn-primary--sm" disabled={pending}>
            {pending ? 'Bezig…' : 'Contract beëindigen'}
          </button>
        </form>
      )}

      {error && <span className="form-error">{error}</span>}
    </div>
  )
}
