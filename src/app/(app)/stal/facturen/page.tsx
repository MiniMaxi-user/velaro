import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth/session'
import { getUserStable } from '@/features/paarden/queries'
import { getMemberships, isPlatformAdmin } from '@/lib/auth/authorization'
import { getActiveStableId, ALLE_STALLEN } from '@/lib/active-stable'
import { getInvoicesForStable } from '@/features/facturen/queries'
import { verwerkVervallenFacturen } from '@/features/facturen/actions'
import {
  formatEuro,
  berekenFactuurSamenvatting,
} from '@/features/facturen/berekeningen'
import FactuurOverzicht, {
  type FactuurOverzichtRegel,
} from '@/features/facturen/FactuurOverzicht'

// Het type van één factuur zoals getInvoicesForStable die levert (incl. ontvanger).
type StalFactuur = Awaited<ReturnType<typeof getInvoicesForStable>>[number]

// Mapt een opgehaalde factuur naar een overzichtsregel (string-bedragen/-datums voor het
// client-component; de berekening blijft server-side met Decimal).
function naarRegel(factuur: StalFactuur): FactuurOverzichtRegel {
  return {
    id: factuur.id,
    invoiceNumber: factuur.invoiceNumber,
    status: factuur.status,
    recipientName: factuur.recipient?.name ?? null,
    recipientEmail: factuur.recipient?.email ?? null,
    invoiceDate: factuur.invoiceDate ? factuur.invoiceDate.toISOString() : null,
    dueDate: factuur.dueDate ? factuur.dueDate.toISOString() : null,
    total: factuur.total.toString(),
    reminderSentAt: factuur.reminderSentAt ? factuur.reminderSentAt.toISOString() : null,
  }
}

// Toont de samenvattende cijfers (openstaand bedrag, betaald, omzet) van één stal.
function Samenvatting({ facturen }: { facturen: StalFactuur[] }) {
  const s = berekenFactuurSamenvatting(facturen)
  return (
    <div className="detail-fields" style={{ marginBottom: 'var(--velaro-space-4)' }}>
      <div className="detail-field">
        <div className="detail-field-label">Openstaand ({s.openstaandAantal})</div>
        <div className="detail-field-value">{formatEuro(s.openstaandBedrag)}</div>
      </div>
      <div className="detail-field">
        <div className="detail-field-label">Betaald ({s.betaaldAantal})</div>
        <div className="detail-field-value">{formatEuro(s.betaaldBedrag)}</div>
      </div>
      <div className="detail-field">
        <div className="detail-field-label">Omzet</div>
        <div className="detail-field-value">{formatEuro(s.omzetBedrag)}</div>
      </div>
    </div>
  )
}

// Facturen-overzicht voor OWNER/STAFF (Fact 07, #152). Spiegelt stal/contracten/page.tsx:
// auth-guards (niet ingelogd → /login, platform-admin → /admin, geen stalrol → /eigenaar),
// een ALLE_STALLEN-modus met een paneel per stal, en lazy verwerking van tijdgebonden
// overgangen — hier het automatisch op VERVALLEN zetten van verzonden facturen waarvan de
// vervaldatum is verstreken. De queries en autorisatie komen uit Fact 02.
export default async function StalFacturenPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  // Platform-admins hebben hun eigen omgeving; paardeigenaren zien hun facturen op het
  // eigenaar-dashboard. Deze pagina is voor stalleden (OWNER/STAFF).
  if (await isPlatformAdmin(user.id)) redirect('/admin')

  const activeStableId = await getActiveStableId(user.id)
  const alleStallen = activeStableId === ALLE_STALLEN

  // Modus: alle stallen van de gebruiker — één overzicht per stal.
  if (alleStallen) {
    const memberships = await getMemberships(user.id)
    if (memberships.length === 0) redirect('/eigenaar')

    let facturenPerStal = await Promise.all(
      memberships.map((m) => getInvoicesForStable(user.id, m.stableId)),
    )

    // Lazy auto-VERVALLEN: bij paginabezoek worden VERZONDEN-facturen met een verstreken
    // vervaldatum naar VERVALLEN gezet (idempotent). Bij wijziging opnieuw ophalen zodat de
    // overzichten en samenvattingen kloppen.
    const vervallen = await verwerkVervallenFacturen(facturenPerStal.flat())
    if (vervallen > 0) {
      facturenPerStal = await Promise.all(
        memberships.map((m) => getInvoicesForStable(user.id, m.stableId)),
      )
    }

    return (
      <main className="page-container">
        <div className="page-header">
          <div>
            <div className="label">Stalbeheer</div>
            <h1 className="page-title">
              <em>Facturen</em> — Alle stallen
            </h1>
          </div>
          <Link href="/stal/facturen/nieuw" className="btn-primary">
            Nieuwe factuur
          </Link>
        </div>

        {memberships.map((m, index) => (
          <div key={m.stableId} style={{ marginBottom: 'var(--velaro-space-8)' }}>
            <div className="panel">
              <div className="panel-header">
                <span className="panel-title">{m.stable.name}</span>
                <span className="badge badge-neutral">{facturenPerStal[index].length}</span>
              </div>
              <div className="panel-body">
                <Samenvatting facturen={facturenPerStal[index]} />
                <FactuurOverzicht facturen={facturenPerStal[index].map(naarRegel)} />
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
    // Geen stalrol: paardeigenaar ziet zijn facturen op het eigenaar-dashboard.
    redirect('/eigenaar')
  }

  let facturen = await getInvoicesForStable(user.id, stable.id)

  // Lazy auto-VERVALLEN — zie toelichting hierboven.
  const vervallen = await verwerkVervallenFacturen(facturen)
  if (vervallen > 0) {
    facturen = await getInvoicesForStable(user.id, stable.id)
  }

  return (
    <main className="page-container">
      <div className="page-header">
        <div>
          <div className="label">Stalbeheer</div>
          <h1 className="page-title">
            <em>Facturen</em> — {stable.name}
          </h1>
        </div>
        <Link href="/stal/facturen/nieuw" className="btn-primary">
          Nieuwe factuur
        </Link>
      </div>

      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Facturen</span>
          <span className="badge badge-neutral">{facturen.length}</span>
        </div>
        <div className="panel-body">
          <Samenvatting facturen={facturen} />
          <FactuurOverzicht facturen={facturen.map(naarRegel)} />
        </div>
      </div>
    </main>
  )
}
