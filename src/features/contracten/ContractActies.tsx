'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { deleteStallingContract } from './actions'

// Acties per concept-contract in de Contracten-tab: een "Bewerken"-link naar de
// bewerk-route en een "Verwijderen"-knop met bevestigingsdialoog. Wordt alleen
// gerenderd bij status CONCEPT (de aanroeper bepaalt dat).
export default function ContractActies({
  horseId,
  contractId,
}: {
  horseId: string
  contractId: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

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

  return (
    <div className="gezondheid-tabel__acties">
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
      {error && <span className="form-error">{error}</span>}
    </div>
  )
}
