import { prisma } from '@/lib/prisma'
import { getMemberships } from '@/lib/auth/authorization'
import { ALLE_STALLEN } from '@/lib/active-stable'
import {
  assertCanManageInvoicesForStable,
  assertCanManageInvoice,
} from './authorization'
import { getSignedUrlVoorFactuurPdf } from './facturenStorage'

// ── Factuur-inzage & -scoping ([Fact 02] #147) ───────────────────────────────
// Fundament-laag (queries + guards) waarop Fact 03/05/07 voortbouwen. Autorisatie is
// kernlogica die wij server-side afdwingen (CLAUDE.md). Patroon gespiegeld op de
// contract-module (src/features/contracten/queries.ts):
//   - Stal-scoping op stableId (getContractsForStable)
//   - Eigenaar-inzage op recipient + status != CONCEPT (getContractsForEigenaar)
//   - Signed-URL-inzage met door de aanroeper afgedwongen autorisatie (getBijlagenMetUrls)
//
// Deze story voegt géén UI toe; de helpers worden door latere Fact-stories hergebruikt.

// Re-export de guards zodat beheeracties (Fact 03/07) één importpad hebben.
export {
  assertCanManageInvoicesForStable,
  assertCanManageInvoice,
} from './authorization'

// ── Beheer (OWNER/STAFF) ─────────────────────────────────────────────────────

// Haalt de facturen van één stal op voor het stal-overzicht (beheer). Dwingt eerst
// af dat de gebruiker OWNER/STAFF van die stal is; daarna uitsluitend facturen met die
// stableId (alle statussen, inclusief eigen concepten). Inclusief ontvanger en
// bron-contract voor de overzichtsregels. Nieuwste eerst.
export async function getInvoicesForStable(userId: string, stableId: string) {
  await assertCanManageInvoicesForStable(userId, stableId)
  return prisma.invoice.findMany({
    where: { stableId },
    include: {
      recipient: { select: { id: true, name: true, email: true } },
      contract: { select: { id: true, horseId: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

// Haalt de facturen op voor de "alle stallen"-modus (ALLE_STALLEN-schildwacht). Beperkt
// tot de stallen waar de gebruiker OWNER/STAFF van is (memberships) — nooit een
// ongefilterde lijst. Lege memberships → lege lijst. Inclusief ontvanger en
// bron-contract. Nieuwste eerst.
export async function getInvoicesForAllStables(userId: string) {
  const memberships = await getMemberships(userId)
  const stableIds = memberships.map((m) => m.stableId)
  if (stableIds.length === 0) return []
  return prisma.invoice.findMany({
    where: { stableId: { in: stableIds } },
    include: {
      recipient: { select: { id: true, name: true, email: true } },
      contract: { select: { id: true, horseId: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

// Haalt de facturen op voor de actieve-stal-context. Bij de ALLE_STALLEN-schildwacht
// wordt beperkt tot de eigen stallen (memberships); anders één specifieke stal met
// beheer-autorisatie. Centrale ingang voor het latere stal-overzicht (Fact 07).
export async function getInvoicesForActiveStable(
  userId: string,
  activeStableId: string,
) {
  if (activeStableId === ALLE_STALLEN) {
    return getInvoicesForAllStables(userId)
  }
  return getInvoicesForStable(userId, activeStableId)
}

// Haalt één factuur (met regels) voor beheer op en dwingt de stal-scoping af: is de
// factuur niet van een stal waar de gebruiker OWNER/STAFF van is, dan een fout
// ("Geen toegang") — de factuur wordt nooit teruggegeven.
export async function getInvoiceForManagement(userId: string, invoiceId: string) {
  return assertCanManageInvoice(userId, invoiceId)
}

// ── Inzage (paardeigenaar / leaser) ──────────────────────────────────────────

// Haalt de facturen op waarvan de opgegeven gebruiker de ontvanger is (eigenaar-
// weergave, /eigenaar). Server-side afgedwongen autorisatie: uitsluitend
// recipientUserId = userId EN status != CONCEPT — concepten mogen de ontvanger nooit
// bereiken. Inclusief de regels en de stal (afzender) voor weergave. Nieuwste eerst.
// De leaser volgt dezelfde regel: zolang hij als recipientUserId op de factuur staat,
// is geen aparte lease-check nodig.
export async function getInvoicesForRecipient(userId: string) {
  return prisma.invoice.findMany({
    where: {
      recipientUserId: userId,
      status: { not: 'CONCEPT' },
    },
    include: {
      lines: { orderBy: { position: 'asc' } },
      stable: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

// Haalt één factuur read-only voor de ontvanger op en dwingt dezelfde twee filters af
// (recipientUserId = userId EN status != CONCEPT). Een factuur van een andere
// ontvanger, of een eigen factuur die nog CONCEPT is, wordt niet teruggegeven (null),
// zodat de eigenaar/leaser deze nooit kan opvragen.
export async function getInvoiceForRecipient(userId: string, invoiceId: string) {
  return prisma.invoice.findFirst({
    where: {
      id: invoiceId,
      recipientUserId: userId,
      status: { not: 'CONCEPT' },
    },
    include: {
      lines: { orderBy: { position: 'asc' } },
      stable: { select: { id: true, name: true } },
    },
  })
}

// ── Keuzelijsten voor het opstellen van een concept-factuur ([Fact 03] #148) ─
// Gescoped op de actieve stal en achter de beheer-guard. Levert de mogelijke
// ontvangers (eigenaren + leasers van paarden van de stal) en de bron-contracten,
// zodat de aanmaak-flow dezelfde scoping volgt als de contract-module. De daadwerkelijke
// validatie van de gekozen ontvanger/contract gebeurt nogmaals server-side bij opslaan.

export interface FactuurOntvangerKeuze {
  id: string
  name: string | null
  email: string
}

// Haalt de mogelijke factuur-ontvangers van één stal op: alle gebruikers die eigenaar
// (HorsePerson.isOwner) of leaser (Lease) zijn van een paard dat in deze stal staat.
// Dwingt eerst de beheer-rol af. Gesorteerd op naam/e-mail, ontdubbeld.
export async function getFactuurOntvangersVoorStable(
  userId: string,
  stableId: string,
): Promise<FactuurOntvangerKeuze[]> {
  await assertCanManageInvoicesForStable(userId, stableId)

  const [eigenaren, leasers] = await Promise.all([
    prisma.horsePerson.findMany({
      where: { isOwner: true, horse: { stableId } },
      select: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.lease.findMany({
      where: { horse: { stableId } },
      select: { leaser: { select: { id: true, name: true, email: true } } },
    }),
  ])

  const perId = new Map<string, FactuurOntvangerKeuze>()
  for (const rij of eigenaren) {
    perId.set(rij.user.id, rij.user)
  }
  for (const rij of leasers) {
    perId.set(rij.leaser.id, rij.leaser)
  }

  return Array.from(perId.values()).sort((a, b) =>
    (a.name ?? a.email).localeCompare(b.name ?? b.email, 'nl'),
  )
}

// Controleert of een gekozen gebruiker een geldige ontvanger is voor de opgegeven stal
// (eigenaar of leaser van een paard van die stal). Server-side validatie bij opslaan.
export async function isGeldigeFactuurOntvanger(
  stableId: string,
  recipientUserId: string,
): Promise<boolean> {
  const [isEigenaar, isLeaser] = await Promise.all([
    prisma.horsePerson.findFirst({
      where: { userId: recipientUserId, isOwner: true, horse: { stableId } },
      select: { id: true },
    }),
    prisma.lease.findFirst({
      where: { leaserUserId: recipientUserId, horse: { stableId } },
      select: { id: true },
    }),
  ])
  return Boolean(isEigenaar) || Boolean(isLeaser)
}

export interface FactuurContractKeuze {
  id: string
  horseName: string
  counterpartyName: string | null
}

// Haalt de contracten van één stal op als optionele bron-koppeling. Achter de
// beheer-guard, gescoped op de actieve stal. Het voorvullen vanuit het contract is
// Fact 04; hier alleen de koppeling.
export async function getFactuurContractenVoorStable(
  userId: string,
  stableId: string,
): Promise<FactuurContractKeuze[]> {
  await assertCanManageInvoicesForStable(userId, stableId)

  const contracten = await prisma.contract.findMany({
    where: { stableId },
    select: {
      id: true,
      horse: { select: { name: true } },
      counterparty: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return contracten.map((c) => ({
    id: c.id,
    horseName: c.horse?.name ?? '—',
    counterpartyName: c.counterparty?.name ?? null,
  }))
}

// Controleert of een gekozen contract bij de opgegeven stal hoort. Server-side
// validatie bij opslaan; voorkomt het koppelen van een contract van een andere stal.
export async function isContractVanStable(
  stableId: string,
  contractId: string,
): Promise<boolean> {
  const contract = await prisma.contract.findFirst({
    where: { id: contractId, stableId },
    select: { id: true },
  })
  return Boolean(contract)
}

// ── Factuur-PDF-inzage via signed URL ─────────────────────────────────────────

// Geeft een tijdelijke (signed) URL terug voor de PDF van een factuur, met dezelfde
// leesrechten als de eigenaar-weergave/het stal-beheer. De autorisatie wordt eerst
// afgedwongen, daarna genereert de helper enkel de signed URL — exact het patroon van
// getBijlagenMetUrls.
//
// - Een ontvanger (eigenaar/leaser) ziet zijn eigen, niet-CONCEPT factuur.
// - Een OWNER/STAFF van de uitgevende stal ziet elke factuur van die stal.
// - Andere gebruikers → fout ("Geen toegang").
//
// Het opslagpad (storagePath) wordt door Fact 05 ingevuld en als parameter
// meegegeven; is er (nog) geen PDF, dan null.
export async function getSignedUrlVoorFactuur(
  userId: string,
  invoiceId: string,
  storagePath: string | null | undefined,
): Promise<string | null> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { stableId: true, recipientUserId: true, status: true },
  })
  if (!invoice) throw new Error('Geen toegang')

  const isOntvanger =
    invoice.recipientUserId === userId && invoice.status !== 'CONCEPT'

  if (!isOntvanger) {
    // Geen (geldige) ontvanger → enkel beheer (OWNER/STAFF van de stal) mag inzien;
    // gooit "Geen toegang" wanneer dat ook niet zo is.
    await assertCanManageInvoicesForStable(userId, invoice.stableId)
  }

  return getSignedUrlVoorFactuurPdf(storagePath)
}

// Dunne wrapper ([Fact 05] #150) die het storagePath van het *laatste* InvoiceDocument
// opzoekt (newest-first, net als getSignedUrlVoorContract het laatste ContractDocument
// pakt) en doorgeeft aan getSignedUrlVoorFactuur. De autorisatie wordt niet
// gedupliceerd: getSignedUrlVoorFactuur dwingt die af. Is er nog geen PDF, dan null.
export async function getSignedUrlVoorLaatsteFactuurDocument(
  userId: string,
  invoiceId: string,
): Promise<string | null> {
  const document = await prisma.invoiceDocument.findFirst({
    where: { invoiceId },
    orderBy: { createdAt: 'desc' },
    select: { storagePath: true },
  })
  return getSignedUrlVoorFactuur(userId, invoiceId, document?.storagePath ?? null)
}
