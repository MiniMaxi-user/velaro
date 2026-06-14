import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth/session'
import { getUserStable } from '@/features/paarden/queries'
import { getMemberships, isPlatformAdmin } from '@/lib/auth/authorization'
import { getActiveStableId, ALLE_STALLEN } from '@/lib/active-stable'
import { getContractsForStable } from '@/features/contracten/queries'
import { verwerkStilzwijgendeVerlengingen } from '@/features/contracten/actions'
import ContractOverzicht from '@/features/contracten/ContractOverzicht'

// Contract-dashboard voor OWNER/STAFF (STAL-13, #86). Overzicht van alle
// stallingscontracten van de actieve stal — of, in "alle stallen"-modus, per stal —
// met paard, wederpartij, status, ingangs-/einddatum en de eerstvolgende openstaande
// actie. Lees-/overzichtsstory: hier wordt alleen gesignaleerd, niet gehandeld.
export default async function StalContractenPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  // Platform admins hebben hun eigen omgeving; paardeigenaren zien hun contracten op
  // het eigenaar-dashboard. Deze pagina is voor stalleden (OWNER/STAFF).
  if (await isPlatformAdmin(user.id)) redirect('/admin')

  const activeStableId = await getActiveStableId(user.id)
  const alleStallen = activeStableId === ALLE_STALLEN

  // Modus: alle stallen van de gebruiker — één overzicht per stal.
  if (alleStallen) {
    const memberships = await getMemberships(user.id)
    if (memberships.length === 0) redirect('/eigenaar')

    let contractenPerStal = await Promise.all(
      memberships.map((m) => getContractsForStable(m.stableId)),
    )

    // Lazy stilzwijgende verlenging (STAL-14, #87): bij paginabezoek verlengen
    // contracten waarvan het verlengmoment bereikt is. Idempotent; bij wijziging
    // opnieuw ophalen zodat de overzichten de nieuwe status/einddatum tonen.
    const verlengd = await verwerkStilzwijgendeVerlengingen(
      contractenPerStal.flat().map((c) => c.id),
    )
    if (verlengd > 0) {
      contractenPerStal = await Promise.all(
        memberships.map((m) => getContractsForStable(m.stableId)),
      )
    }

    return (
      <main className="page-container">
        <div className="page-header">
          <div>
            <div className="label">Stalbeheer</div>
            <h1 className="page-title">
              <em>Contracten</em> — Alle stallen
            </h1>
          </div>
          <Link href="/stal" className="btn-ghost">
            ← Stal
          </Link>
        </div>

        {memberships.map((m, index) => (
          <div key={m.stableId} style={{ marginBottom: 'var(--velaro-space-8)' }}>
            <div className="panel">
              <div className="panel-header">
                <span className="panel-title">{m.stable.name}</span>
                <span className="badge badge-neutral">
                  {contractenPerStal[index].length}
                </span>
              </div>
              <div className="panel-body">
                <ContractOverzicht
                  contracts={contractenPerStal[index]}
                  rol="STAL"
                  legeTekst="Nog geen stallingscontracten in deze stal."
                />
              </div>
            </div>
          </div>
        ))}
      </main>
    )
  }

  // Modus: specifieke actieve stal.
  const stable = await getUserStable(user.id)
  if (!stable) {
    // Geen stalrol: paardeigenaar ziet zijn contracten op het eigenaar-dashboard.
    redirect('/eigenaar')
  }

  let contracts = await getContractsForStable(stable.id)

  // Lazy stilzwijgende verlenging (STAL-14, #87) — zie toelichting hierboven.
  const verlengd = await verwerkStilzwijgendeVerlengingen(contracts.map((c) => c.id))
  if (verlengd > 0) {
    contracts = await getContractsForStable(stable.id)
  }

  return (
    <main className="page-container">
      <div className="page-header">
        <div>
          <div className="label">Stalbeheer</div>
          <h1 className="page-title">
            <em>Contracten</em> — {stable.name}
          </h1>
        </div>
        <Link href="/stal" className="btn-ghost">
          ← Stal
        </Link>
      </div>

      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Stallingscontracten</span>
          <span className="badge badge-neutral">{contracts.length}</span>
        </div>
        <div className="panel-body">
          <ContractOverzicht
            contracts={contracts}
            rol="STAL"
            legeTekst="Nog geen stallingscontracten in deze stal."
          />
        </div>
      </div>
    </main>
  )
}
