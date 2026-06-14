'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { bevestigVerlenging } from './actions'

// Verleng-bevestigknop voor expliciete verlenging (STAL-14, #87). Wordt zowel in de
// stal-weergave (paardprofiel) als in de eigenaar-weergave getoond. De server-actie
// `bevestigVerlenging` autoriseert beide partijen (stalrol of gekoppelde eigenaar) en
// verlengt pas wanneer BEIDE partijen voor de huidige ronde hebben bevestigd. Deze
// component toont de bevestig-status en de eigen bevestig-actie; de partij-rol
// (`partij`) bepaalt alleen welke labels worden getoond.
export default function VerlengActies({
  contractId,
  partij,
  doorStal,
  doorEigenaar,
  nieuweEinddatum,
}: {
  contractId: string
  partij: 'STAL' | 'EIGENAAR'
  doorStal: boolean
  doorEigenaar: boolean
  // Geformatteerde nieuwe einddatum (nl), enkel ter informatie in de bevestigtekst.
  nieuweEinddatum: string | null
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Heeft de huidige partij zelf al bevestigd?
  const eigenBevestiging = partij === 'STAL' ? doorStal : doorEigenaar
  const anderBevestigd = partij === 'STAL' ? doorEigenaar : doorStal
  const andereLabel = partij === 'STAL' ? 'de eigenaar' : 'de stal'

  function handleBevestig() {
    if (
      !confirm(
        nieuweEinddatum
          ? `Het stallingscontract verlengen tot ${nieuweEinddatum}? Het wordt pas verlengd wanneer beide partijen bevestigen.`
          : 'De verlenging van dit stallingscontract bevestigen? Het wordt pas verlengd wanneer beide partijen bevestigen.',
      )
    ) {
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        await bevestigVerlenging(contractId)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Verlengen bevestigen is mislukt.')
      }
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {eigenBevestiging ? (
          <span className="badge badge-success">Verlenging bevestigd</span>
        ) : (
          <button
            type="button"
            className="btn-primary btn-primary--sm"
            onClick={handleBevestig}
            disabled={pending}
          >
            {pending ? 'Bezig…' : 'Verlenging bevestigen'}
          </button>
        )}
        {eigenBevestiging && !anderBevestigd && (
          <span className="gezondheid-tabel__muted">
            Wacht op bevestiging van {andereLabel}.
          </span>
        )}
      </div>
      {error && <span className="form-error">{error}</span>}
    </div>
  )
}
