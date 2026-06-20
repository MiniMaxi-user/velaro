'use client'

import { useEffect, useRef } from 'react'

// Auto-startende lease-opstelstap ([Unify 04] #130, bugfix #138).
//
// De "Nieuw contract"-dropdown routeert een gekozen leasevorm naar
// /paarden/[id]/contracten/nieuw?family=LEASE&type=<leaseType>. Daar maakte de pagina
// het concept-leasecontract eerder al tijdens de render aan via een server action met
// `revalidatePath` — wat Next.js tijdens een render niet toestaat en de pagina liet
// crashen. Nu draait die action pas bij het submitten van dit formulier (buiten de
// render), waar `revalidatePath` en `redirect` wél zijn toegestaan.
//
// Het formulier submit automatisch bij het laden, zodat de gebruiker — net als bij de
// stalling-flow — zonder extra klik in de bewerk-stepper terechtkomt. De `action`
// (createLeaseContract, gebonden aan horseId + leasevorm) maakt het concept aan en
// redirect naar /paarden/[id]/contracten/[contractId]/bewerken.
export default function LeaseContractStart({
  action,
}: {
  action: (formData: FormData) => void | Promise<void>
}) {
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    formRef.current?.requestSubmit()
  }, [])

  return (
    <main className="page-container">
      <form ref={formRef} action={action}>
        <div className="panel">
          <div className="panel-body">
            <div className="gezondheid-leeg">
              Leasecontract wordt voorbereid…
              {/* Fallback wanneer JavaScript uit staat of het auto-submit niet draait. */}
              <div style={{ marginTop: 'var(--velaro-space-4)' }}>
                <button type="submit" className="btn-primary">
                  Doorgaan
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </main>
  )
}
