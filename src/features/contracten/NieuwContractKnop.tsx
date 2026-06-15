'use client'

import { useRouter } from 'next/navigation'
import type { ContractPoort } from './relatietypeMatching'

// Knop "Nieuw stallingscontract". De poort (#113) bepaalt of de knop bruikbaar is:
// een contract kan pas worden aangemaakt wanneer relatietype = pensionpaard,
// stallingsvorm ∈ {volledig pension, halfpension} én er een eigenaar gekoppeld is.
// Is de poort dicht, dan is de knop uitgeschakeld met een toelichting eronder zodat
// de gebruiker weet wat er nog ontbreekt.
export default function NieuwContractKnop({
  horseId,
  poort,
}: {
  horseId: string
  poort: ContractPoort
}) {
  const router = useRouter()

  if (!poort.toegestaan) {
    return (
      <div className="nieuw-contract-poort">
        <button type="button" className="btn-primary" disabled title={poort.reden}>
          Nieuw stallingscontract
        </button>
        <span className="form-hint">{poort.reden}</span>
      </div>
    )
  }

  return (
    <button
      type="button"
      className="btn-primary"
      onClick={() => router.push(`/paarden/${horseId}/contracten/nieuw`)}
    >
      Nieuw stallingscontract
    </button>
  )
}
