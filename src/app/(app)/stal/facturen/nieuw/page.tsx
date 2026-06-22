import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth/session'
import { isPlatformAdmin } from '@/lib/auth/authorization'
import { getActiveStableId, ALLE_STALLEN } from '@/lib/active-stable'
import { getUserStable } from '@/features/paarden/queries'
import {
  getFactuurOntvangersVoorStable,
  getFactuurContractenVoorStable,
} from '@/features/facturen/queries'
import { maakConceptFactuur } from '@/features/facturen/actions'
import FactuurAanmaakForm from '@/features/facturen/FactuurAanmaakForm'

// Concept-factuur aanmaken ([Fact 03] #148). Voor OWNER/STAFF van de actieve stal.
// Spiegelt de stal/contracten-guards: platform-admin → /admin, eigenaar zonder stalrol →
// /eigenaar. In de "alle stallen"-modus moet eerst een specifieke stal gekozen worden.
export default async function NieuweFactuurPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  if (await isPlatformAdmin(user.id)) redirect('/admin')

  const activeStableId = await getActiveStableId(user.id)
  if (!activeStableId || activeStableId === ALLE_STALLEN) {
    // Een factuur hoort bij één uitgevende stal; kies eerst een specifieke stal.
    redirect('/stal/contracten')
  }

  const stable = await getUserStable(user.id)
  if (!stable) redirect('/eigenaar')

  // De queries dwingen zelf de beheer-rol af (Fact 02-guard); een gebruiker zonder
  // OWNER/STAFF-rol op deze stal krijgt "Geen toegang".
  const [ontvangers, contracten] = await Promise.all([
    getFactuurOntvangersVoorStable(user.id, stable.id),
    getFactuurContractenVoorStable(user.id, stable.id),
  ])

  return (
    <main className="page-container">
      <div className="page-header">
        <div>
          <div className="label">Stalbeheer</div>
          <h1 className="page-title">
            <em>Nieuwe factuur</em> — {stable.name}
          </h1>
        </div>
        <Link href="/stal/contracten" className="btn-ghost">
          ← Stal
        </Link>
      </div>

      {ontvangers.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__title">Nog geen mogelijke ontvangers</div>
          <p>
            Er zijn nog geen paardeigenaren of leasers gekoppeld aan deze stal. Koppel
            eerst een eigenaar of leaser aan een paard voordat u een factuur opstelt.
          </p>
        </div>
      ) : (
        <FactuurAanmaakForm
          action={maakConceptFactuur}
          ontvangers={ontvangers}
          contracten={contracten}
        />
      )}
    </main>
  )
}
