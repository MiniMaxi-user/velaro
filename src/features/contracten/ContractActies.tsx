'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import {
  createNewVersion,
  deleteStallingContract,
  getContractPdfUrlVoorStaf,
  offerContract,
  previewContractPdf,
} from './actions'
import type { OntbrekendBlok } from './aanbiedValidatie'
import VerlengActies from './VerlengActies'
import BeheerActies from './BeheerActies'
import type { ContractStatus } from '@prisma/client'

// Verleng-context voor een actief/verlengd contract met expliciete verlenging
// (STAL-14, #87). Wordt door de aanroeper (server) berekend en doorgegeven zodat de
// stal-zijde de bevestig-actie kan tonen. Null wanneer er geen expliciete verlenging
// te bevestigen is.
export type VerlengContext = {
  doorStal: boolean
  doorEigenaar: boolean
  nieuweEinddatum: string | null
}

// Acties per contract in de Contracten-tab. Bij status CONCEPT: "Aanbieden",
// "Bewerken" en "Verwijderen"; de "Aanbieden"-knop is geblokkeerd zolang verplichte
// velden ontbreken en toont dan welke blokken nog incompleet zijn — dezelfde set
// die de server afdwingt. Bij status AANGEBODEN of AFGEWEZEN (STAL-11, #84):
// "Nieuwe versie maken", waarmee de huidige versie wordt vervangen en een nieuwe
// concept-versie ontstaat. Wordt uitsluitend voor OWNER/STAFF gerenderd (alleen zij
// zien dit paneel); de server dwingt rol én status nogmaals af.
export default function ContractActies({
  horseId,
  contractId,
  status,
  heeftWederpartij,
  ontbrekendeVelden,
  verleng = null,
  retentieActief = false,
}: {
  horseId: string
  contractId: string
  status: ContractStatus
  heeftWederpartij: boolean
  ontbrekendeVelden: OntbrekendBlok[]
  verleng?: VerlengContext | null
  // Of er momenteel wanbetaling/retentierecht gemarkeerd staat (STAL-15, #88).
  retentieActief?: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const compleet = ontbrekendeVelden.length === 0 && heeftWederpartij
  const aanbiedenDisabled = pending || !compleet

  // Compacte reden-omschrijving voor de "Incompleet"-badge (#122): de details
  // verhuizen naar de tooltip i.p.v. een lange validatietekst in de kolom.
  const onvolledigRedenen: string[] = []
  if (!heeftWederpartij) onvolledigRedenen.push('Kies eerst een wederpartij (paardeigenaar)')
  for (const blok of ontbrekendeVelden) {
    onvolledigRedenen.push(`${blok.blok}: ${blok.velden.join(', ')}`)
  }
  const onvolledigTitel = `Nog niet compleet — ${onvolledigRedenen.join('; ')}.`

  // Opent een PDF-buffer (base64) in een nieuw tabblad via een object-URL. Gebruikt
  // voor de in-memory preview (STAL-12), die niet in Supabase Storage wordt opgeslagen.
  function openBase64Pdf(base64: string) {
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }))
    window.open(url, '_blank')
    // Geef de object-URL na een ruime marge weer vrij.
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  function handlePreview() {
    setError(null)
    startTransition(async () => {
      try {
        const base64 = await previewContractPdf(horseId, contractId)
        openBase64Pdf(base64)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Preview genereren is mislukt.')
      }
    })
  }

  function handleOpenPdf() {
    setError(null)
    startTransition(async () => {
      try {
        const url = await getContractPdfUrlVoorStaf(horseId, contractId)
        if (url) window.open(url, '_blank')
        else setError('Er is nog geen opgeslagen PDF voor deze versie.')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'PDF openen is mislukt.')
      }
    })
  }

  function handleDelete() {
    if (!confirm('Weet je zeker dat je dit concept-contract wilt verwijderen?')) {
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        await deleteStallingContract(horseId, contractId)
        router.refresh()
      } catch {
        setError('Verwijderen is mislukt.')
      }
    })
  }

  function handleOffer() {
    if (
      !confirm(
        'Het contract aanbieden aan de paardeigenaar? De eigenaar ontvangt hiervan een melding.',
      )
    ) {
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        await offerContract(horseId, contractId)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Aanbieden is mislukt.')
      }
    })
  }

  function handleNewVersion() {
    if (
      !confirm(
        'Een nieuwe versie maken vervangt de huidige versie en maakt een bewerkbaar concept aan met dezelfde voorwaarden. Doorgaan?',
      )
    ) {
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        await createNewVersion(horseId, contractId)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Nieuwe versie maken is mislukt.')
      }
    })
  }

  // Knop om de opgeslagen contract-PDF van deze versie te openen (STAL-12). Voor elke
  // versie met een opgeslagen document (alle niet-CONCEPT-statussen).
  const pdfOpenKnop = (
    <button
      type="button"
      className="btn-ghost btn-ghost--sm"
      onClick={handleOpenPdf}
      disabled={pending}
    >
      {pending ? 'Bezig…' : 'PDF openen'}
    </button>
  )

  // Versionering (STAL-11): alleen vanuit AANGEBODEN of AFGEWEZEN.
  if (status === 'AANGEBODEN' || status === 'AFGEWEZEN') {
    return (
      <div className="gezondheid-tabel__acties">
        <button
          type="button"
          className="btn-primary btn-primary--sm"
          onClick={handleNewVersion}
          disabled={pending}
        >
          {pending ? 'Bezig…' : 'Nieuwe versie maken'}
        </button>
        {pdfOpenKnop}
        {error && <span className="form-error">{error}</span>}
      </div>
    )
  }

  // Concept-acties.
  if (status !== 'CONCEPT') {
    // GEACCEPTEERD / ACTIEF / VERLENGD / VERVANGEN: de opgeslagen PDF openen, plus —
    // bij expliciete verlenging op een actief/verlengd contract — de bevestig-actie
    // van de stal (STAL-14, #87).
    return (
      <div className="gezondheid-tabel__acties">
        {pdfOpenKnop}
        {verleng && (
          <VerlengActies
            contractId={contractId}
            partij="STAL"
            doorStal={verleng.doorStal}
            doorEigenaar={verleng.doorEigenaar}
            nieuweEinddatum={verleng.nieuweEinddatum}
          />
        )}
        {/* Beheer-acties (STAL-15, #88): opzeggen, opschorten, prijsverlaging,
            retentierecht en beëindigen — alleen op een actief/verlengd contract. */}
        {(status === 'ACTIEF' || status === 'VERLENGD') && (
          <BeheerActies
            horseId={horseId}
            contractId={contractId}
            retentieActief={retentieActief}
          />
        )}
        {error && <span className="form-error">{error}</span>}
      </div>
    )
  }

  return (
    <div className="gezondheid-tabel__acties">
      <button
        type="button"
        className="btn-primary btn-primary--sm"
        onClick={handleOffer}
        disabled={aanbiedenDisabled}
        title={
          compleet
            ? undefined
            : 'Vul eerst de verplichte velden in voordat je kunt aanbieden.'
        }
      >
        {pending ? 'Bezig…' : 'Aanbieden'}
      </button>
      <Link
        href={`/paarden/${horseId}/contracten/${contractId}/bewerken`}
        className="btn-ghost btn-ghost--sm"
      >
        Bewerken
      </Link>
      <button
        type="button"
        className="btn-ghost btn-ghost--sm"
        onClick={handlePreview}
        disabled={pending}
      >
        {pending ? 'Bezig…' : 'Preview-PDF'}
      </button>
      <button
        type="button"
        className="btn-ghost btn-ghost--sm"
        onClick={handleDelete}
        disabled={pending}
      >
        {pending ? 'Bezig…' : 'Verwijderen'}
      </button>
      {!compleet && (
        <span className="badge badge-warning" title={onvolledigTitel}>
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ marginRight: 4 }}>
            <path d="M7 1.5 13 12H1L7 1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
            <path d="M7 6v2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            <circle cx="7" cy="10.5" r="0.7" fill="currentColor" />
          </svg>
          Incompleet
        </span>
      )}
      {error && <span className="form-error">{error}</span>}
    </div>
  )
}
