'use client'

import { useRouter } from 'next/navigation'
import type { ContractPoort } from './relatietypeMatching'

// Knop "Nieuw stallingscontract". De poort (#113) bepaalt of de knop bruikbaar is:
// een contract kan pas worden aangemaakt wanneer relatietype = pensionpaard,
// stallingsvorm ∈ {volledig pension, halfpension} én er een eigenaar gekoppeld is.
//
// Is de poort dicht, dan tonen we een korte vaste melding met een i-icoon; de
// concrete reden (variabele lengte) zit in een hover/focus-tooltip (#115). Zo blijft
// de layout stabiel en staat de knop altijd rechts.
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
      <div className="contract-poort">
        <span className="contract-poort__melding">
          Contract aanmaken niet mogelijk
          <span className="info-tip" tabIndex={0} role="note" aria-label={poort.reden}>
            <span className="info-tip__icon" aria-hidden="true">i</span>
            <span className="info-tip__bubble" role="tooltip">
              {poort.reden}
            </span>
          </span>
        </span>
        <button type="button" className="btn-primary" disabled>
          Nieuw stallingscontract
        </button>
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
