import { prisma } from '@/lib/prisma'
import { getStableRole } from '@/lib/auth/authorization'

// ── Factuur-autorisatie ([Fact 02] #147) ─────────────────────────────────────
// Autorisatie is kernlogica die wij server-side in de app-laag afdwingen (CLAUDE.md),
// niet uitbesteed aan Supabase. Deze guards spiegelen het patroon van de contract-
// module (assertCanManageContract-stijl via getStableRole) en zijn herbruikbaar door
// de latere Fact-stories (Fact 03 concept opstellen, Fact 07 overzicht) zodat de
// regels niet gedupliceerd worden.
//
// Beheer (facturen opstellen/inzien/bewerken voor een stal) is voorbehouden aan
// OWNER en STAFF van de uitgevende stal. Een gebruiker zonder stalrol op die stal —
// inclusief een paardeigenaar/leaser — wordt geweigerd; die heeft enkel inzage in zijn
// eigen verzonden facturen (zie queries.ts: getInvoicesForRecipient).

/**
 * Dwingt af dat de gebruiker een beheerrol (OWNER of STAFF) heeft op de opgegeven
 * stal. Anders een fout ("Geen toegang"). Gebruikt door beheer-queries en latere
 * beheeracties die op stal-niveau werken.
 */
export async function assertCanManageInvoicesForStable(
  userId: string,
  stableId: string,
): Promise<void> {
  const role = await getStableRole(userId, stableId)
  if (role !== 'OWNER' && role !== 'STAFF') {
    throw new Error('Geen toegang')
  }
}

/**
 * Dwingt af dat de gebruiker een beheerrol (OWNER of STAFF) heeft op de stal van de
 * opgegeven factuur. Geeft de factuur (met regels, ontvanger en bron-contract) terug
 * zodat de aanroeper meteen verder kan. Onbekende factuur of geen beheerrol op de
 * uitgevende stal → fout ("Geen toegang") — server-side afgedwongen, niet alleen in
 * de UI.
 */
export async function assertCanManageInvoice(userId: string, invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      lines: { orderBy: { position: 'asc' } },
      recipient: { select: { id: true, name: true, email: true } },
      contract: { select: { id: true, horseId: true } },
    },
  })
  if (!invoice) throw new Error('Geen toegang')

  await assertCanManageInvoicesForStable(userId, invoice.stableId)
  return invoice
}
