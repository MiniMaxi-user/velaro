'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { signLeaseContract } from './actions'
import { formatDatum } from '@/features/paarden/paardHelpers'

// Eén ondertekening-status per partij (spiegelt Ondertekening uit leaseContractConfig).
type Ondertekend = { naam: string; datum: string } | null

// Ondertekening-blokken voor een aangeboden leasecontract binnen de unified
// contractweergave ([Unify 06] #132). Vervangt de losse /lease/[id]/contract-pagina
// voor het ondertekenen. Toont per partij (stal / leaser / voogd) of er al getekend
// is, en een teken-formulier voor de partijen die de huidige gebruiker mag tekenen.
// De daadwerkelijke per-partij-autorisatie + de meeverzekerd-gate + de activatie
// (→ 1:1 Lease) worden server-side in signLeaseContract afgedwongen; deze component
// verzorgt enkel de interactie, de onomkeerbaarheid-bevestiging en de disclaimer.
export default function LeaseOndertekenActies({
  horseId,
  contractId,
  ondertekening,
  minderjarig,
  magStal,
  magLeaser,
}: {
  horseId: string
  contractId: string
  ondertekening: { stal: Ondertekend; leaser: Ondertekend; voogd: Ondertekend }
  // Of de berijder minderjarig is — dan is het voogd-blok vereist voor volledigheid.
  minderjarig: boolean
  // Of de huidige gebruiker het stal-blok (OWNER/STAFF) mag tekenen.
  magStal: boolean
  // Of de huidige gebruiker het leaser-/voogd-blok (wederpartij) mag tekenen.
  magLeaser: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function teken(partij: 'stal' | 'leaser' | 'voogd', formData: FormData) {
    if (
      !confirm(
        'Ondertekenen is onomkeerbaar. Zodra alle partijen hebben getekend, wordt de lease actief. Doorgaan?',
      )
    ) {
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        await signLeaseContract(horseId, contractId, partij, formData)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Ondertekenen is mislukt.')
      }
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Disclaimer-banner (blijft in de lease-ondertekenweergave aanwezig). */}
      <div className="form-feedback form-feedback--error">
        Geen juridisch advies — laat dit contract juridisch toetsen vóór gebruik.
      </div>

      <OndertekenBlok
        titel="Stal"
        ondertekening={ondertekening.stal}
        magTekenen={magStal}
        pending={pending}
        onTeken={(fd) => teken('stal', fd)}
      />
      <OndertekenBlok
        titel="Leaser"
        ondertekening={ondertekening.leaser}
        magTekenen={magLeaser}
        pending={pending}
        onTeken={(fd) => teken('leaser', fd)}
      />
      {minderjarig && (
        <OndertekenBlok
          titel="Ouder / voogd"
          ondertekening={ondertekening.voogd}
          magTekenen={magLeaser}
          pending={pending}
          onTeken={(fd) => teken('voogd', fd)}
        />
      )}

      <p style={{ fontSize: 'var(--velaro-text-sm)', color: 'var(--velaro-color-muted)', margin: 0 }}>
        Ondertekenen is onomkeerbaar. Zodra de stal en de leaser
        {minderjarig ? ' en de ouder/voogd' : ''} hebben getekend, wordt de lease actief.
      </p>

      {error && <span className="form-error">{error}</span>}
    </div>
  )
}

function OndertekenBlok({
  titel,
  ondertekening,
  magTekenen,
  pending,
  onTeken,
}: {
  titel: string
  ondertekening: Ondertekend
  magTekenen: boolean
  pending: boolean
  onTeken: (formData: FormData) => void
}) {
  return (
    <div style={{ paddingTop: 12, borderTop: '1px solid var(--velaro-color-border)' }}>
      <div className="label" style={{ marginBottom: 6 }}>
        {titel}
      </div>
      {ondertekening ? (
        <div style={{ fontSize: 'var(--velaro-text-sm)' }}>
          <span className="badge badge-success">Ondertekend</span>
          <div style={{ marginTop: 4, color: 'var(--velaro-color-muted)' }}>
            {ondertekening.naam} · {formatDatum(new Date(ondertekening.datum))}
          </div>
        </div>
      ) : magTekenen ? (
        <form
          action={onTeken}
          style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
        >
          <input
            name="naam"
            className="input"
            placeholder="Naam ter ondertekening"
            required
            disabled={pending}
          />
          <button type="submit" className="btn-primary btn-primary--sm" disabled={pending}>
            {pending ? 'Bezig…' : 'Onderteken'}
          </button>
        </form>
      ) : (
        <span className="badge badge-neutral">Nog niet ondertekend</span>
      )}
    </div>
  )
}
