import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth/session'
import {
  getInvoiceForManagement,
  getFactuurOntvangersVoorStable,
  getFactuurContractenVoorStable,
} from '@/features/facturen/queries'
import {
  werkFactuurkopBij,
  voegFactuurregelToe,
  werkFactuurregelBij,
  verwijderFactuurregel,
  voorvulRegelsUitContract,
} from '@/features/facturen/actions'
import {
  berekenFactuurTotalen,
  formatEuro,
  VAT_RATE_LABEL,
} from '@/features/facturen/berekeningen'
import FactuurKopForm from '@/features/facturen/FactuurKopForm'
import FactuurRegelsBeheer, {
  type RegelWeergave,
} from '@/features/facturen/FactuurRegelsBeheer'

interface Props {
  params: Promise<{ id: string }>
}

// Maakt van een Date een yyyy-mm-dd-string voor een date-input (of leeg).
function naarDatumInput(d: Date | null): string {
  if (!d) return ''
  return d.toISOString().slice(0, 10)
}

// Concept-factuur bewerken ([Fact 03] #148): kop bijwerken, handmatige regels beheren en
// de totalen + btw-overzicht per tarief tonen. Autorisatie via de Fact 02-guard
// (getInvoiceFormanagement → assertCanManageInvoice): geen beheer-rol op de uitgevende
// stal → "Geen toegang".
export default async function FactuurBewerkenPage({ params }: Props) {
  const { id } = await params

  const user = await getAuthUser()
  if (!user) redirect('/login')

  // Dwingt OWNER/STAFF op de uitgevende stal af; gooit anders "Geen toegang".
  const invoice = await getInvoiceForManagement(user.id, id)

  const [ontvangers, contracten] = await Promise.all([
    getFactuurOntvangersVoorStable(user.id, invoice.stableId),
    getFactuurContractenVoorStable(user.id, invoice.stableId),
  ])

  const isConcept = invoice.status === 'CONCEPT'

  // Totalen + btw-overzicht per tarief afleiden uit de huidige regels (server-side, Decimal).
  const totalen = berekenFactuurTotalen(
    invoice.lines.map((l) => ({
      description: l.description,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      vatRate: l.vatRate,
    })),
  )

  const regelsWeergave: RegelWeergave[] = invoice.lines.map((l) => ({
    id: l.id,
    description: l.description,
    quantity: l.quantity.toString(),
    unitPrice: l.unitPrice.toString(),
    vatRate: l.vatRate,
    lineTotal: l.lineTotal.toString(),
  }))

  return (
    <main className="page-container">
      <div className="page-header">
        <div>
          <div className="label">Stalbeheer</div>
          <h1 className="page-title">
            <em>Concept-factuur</em>
          </h1>
        </div>
        <Link href="/stal/contracten" className="btn-ghost">
          ← Stal
        </Link>
      </div>

      {!isConcept ? (
        <div className="empty-state">
          <div className="empty-state__title">Deze factuur is geen concept meer</div>
          <p>
            Een factuur kan alleen worden bewerkt zolang deze de status concept heeft. De
            huidige status is {invoice.status.toLowerCase()}.
          </p>
        </div>
      ) : (
        <>
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Factuurgegevens</span>
              <span className="badge badge-neutral">Concept</span>
            </div>
            <div className="panel-body">
              <FactuurKopForm
                action={werkFactuurkopBij.bind(null, invoice.id)}
                ontvangers={ontvangers}
                contracten={contracten}
                waarden={{
                  recipientUserId: invoice.recipientUserId,
                  contractId: invoice.contractId,
                  invoiceDate: naarDatumInput(invoice.invoiceDate),
                  dueDate: naarDatumInput(invoice.dueDate),
                  notes: invoice.notes,
                }}
              />
            </div>
          </div>

          <div className="panel" style={{ marginTop: 'var(--velaro-space-8)' }}>
            <div className="panel-header">
              <span className="panel-title">Regels</span>
              <span className="badge badge-neutral">{invoice.lines.length}</span>
            </div>
            <div className="panel-body">
              <FactuurRegelsBeheer
                regels={regelsWeergave}
                voegToeAction={voegFactuurregelToe.bind(null, invoice.id)}
                werkBijAction={werkFactuurregelBij.bind(null, invoice.id)}
                verwijderAction={verwijderFactuurregel.bind(null, invoice.id)}
                voorvulAction={voorvulRegelsUitContract.bind(null, invoice.id)}
                kanVoorvullen={Boolean(invoice.contractId) && invoice.lines.length <= 1}
              />
            </div>
          </div>

          <div className="panel" style={{ marginTop: 'var(--velaro-space-8)' }}>
            <div className="panel-header">
              <span className="panel-title">Totalen</span>
            </div>
            <div className="panel-body">
              <table className="gezondheid-tabel">
                <tbody>
                  <tr>
                    <td>Subtotaal (excl. btw)</td>
                    <td>{formatEuro(totalen.subtotal)}</td>
                  </tr>
                  {totalen.btwGroepen.map((groep) => (
                    <tr key={groep.vatRate}>
                      <td className="gezondheid-tabel__muted">
                        Btw {VAT_RATE_LABEL[groep.vatRate]} over{' '}
                        {formatEuro(groep.grondslag)}
                      </td>
                      <td className="gezondheid-tabel__muted">
                        {formatEuro(groep.btwBedrag)}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td>Totale btw</td>
                    <td>{formatEuro(totalen.vatAmount)}</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Totaal (incl. btw)</strong>
                    </td>
                    <td>
                      <strong>{formatEuro(totalen.total)}</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </main>
  )
}
