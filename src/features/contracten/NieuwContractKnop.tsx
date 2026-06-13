'use client'

import { useRouter } from 'next/navigation'

// Knop "Nieuw stallingscontract". Wanneer er nog geen eigenaar aan het paard is
// gekoppeld, wordt een melding getoond ("Koppel eerst een eigenaar") en stopt het
// proces. Anders navigeert de knop naar de aanmaak-route.
export default function NieuwContractKnop({
  horseId,
  hasOwners,
}: {
  horseId: string
  hasOwners: boolean
}) {
  const router = useRouter()

  function handleClick() {
    if (!hasOwners) {
      alert('Koppel eerst een eigenaar')
      return
    }
    router.push(`/paarden/${horseId}/contracten/nieuw`)
  }

  return (
    <button type="button" className="btn-primary" onClick={handleClick}>
      Nieuw stallingscontract
    </button>
  )
}
