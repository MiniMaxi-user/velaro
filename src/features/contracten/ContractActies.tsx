'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import {
  createNewVersion,
  deleteStallingContract,
  offerContract,
} from './actions'
import type { OntbrekendBlok } from './aanbiedValidatie'
import type { ContractStatus } from '@prisma/client'

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
}: {
  horseId: string
  contractId: string
  status: ContractStatus
  heeftWederpartij: boolean
  ontbrekendeVelden: OntbrekendBlok[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const compleet = ontbrekendeVelden.length === 0 && heeftWederpartij
  const aanbiedenDisabled = pending || !compleet

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
        {error && <span className="form-error">{error}</span>}
      </div>
    )
  }

  // Concept-acties.
  if (status !== 'CONCEPT') return null

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
        onClick={handleDelete}
        disabled={pending}
      >
        {pending ? 'Bezig…' : 'Verwijderen'}
      </button>
      {!compleet && (
        <div className="form-hint">
          {!heeftWederpartij && <div>Kies eerst een wederpartij (paardeigenaar).</div>}
          {ontbrekendeVelden.length > 0 && (
            <div>
              Nog niet compleet — vul aan:{' '}
              {ontbrekendeVelden
                .map((b) => `${b.blok} (${b.velden.join(', ')})`)
                .join('; ')}
              .
            </div>
          )}
        </div>
      )}
      {error && <span className="form-error">{error}</span>}
    </div>
  )
}
