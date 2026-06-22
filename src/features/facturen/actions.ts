'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth/session'
import { getActiveStableId, ALLE_STALLEN } from '@/lib/active-stable'
import { isPlatformAdmin } from '@/lib/auth/authorization'
import type { VatRate, Prisma } from '@prisma/client'
import {
  assertCanManageInvoicesForStable,
  assertCanManageInvoice,
} from './authorization'
import {
  isGeldigeFactuurOntvanger,
  isContractVanStable,
} from './queries'
import { berekenFactuurTotalen, type RuweFactuurregel } from './berekeningen'
import { voorvulRegelsUitContractConfig } from './contractVoorvullen'

// ── Factuur-beheeracties ([Fact 03] #148) ────────────────────────────────────
// Beheer-UI (concept opstellen + handmatige regels) bovenop het Fact 02-fundament.
// Autorisatie is kernlogica die wij server-side afdwingen (CLAUDE.md): elke actie loopt
// via de Fact 02-guards (assertCanManageInvoicesForStable / assertCanManageInvoice); er
// wordt géén tweede autorisatiepad geïntroduceerd. Mutaties zijn alleen toegestaan zolang
// de factuur CONCEPT is. De totalen worden met Decimal berekend (zie berekeningen.ts) en
// gedenormaliseerd op de Invoice opgeslagen. Patroon gespiegeld op de contract-acties:
// validatie die bij overtreding een Error gooit, daarna revalidatePath/redirect.

// ── Validatie-helpers (stijl leesNietNegatiefGetal uit de contract-acties) ────

// Leest een verplichte tekst uit het formulier; gooit bij ontbreken een Error.
function leesVerplichteTekst(value: FormDataEntryValue | null, label: string): string {
  const raw = (value as string)?.trim()
  if (!raw) {
    throw new Error(`${label} is verplicht.`)
  }
  return raw
}

// Leest een aantal (> 0). Gooit bij onleesbaar of ≤ 0 een Error.
function leesAantal(value: FormDataEntryValue | null, label: string): number {
  const raw = (value as string)?.trim()
  if (!raw) {
    throw new Error(`${label} is verplicht.`)
  }
  const n = Number(raw.replace(',', '.'))
  if (!Number.isFinite(n)) {
    throw new Error(`${label} moet een geldig getal zijn.`)
  }
  if (n <= 0) {
    throw new Error(`${label} moet groter dan 0 zijn.`)
  }
  return n
}

// Leest een niet-negatief bedrag (≥ 0). Gooit bij onleesbaar of negatief een Error.
function leesNietNegatiefBedrag(value: FormDataEntryValue | null, label: string): number {
  const raw = (value as string)?.trim()
  if (!raw) {
    throw new Error(`${label} is verplicht.`)
  }
  const n = Number(raw.replace(',', '.'))
  if (!Number.isFinite(n)) {
    throw new Error(`${label} moet een geldig getal zijn.`)
  }
  if (n < 0) {
    throw new Error(`${label} mag niet negatief zijn.`)
  }
  return n
}

// Valideert het btw-tarief tegen de toegestane VatRate-waarden (0/9/21%).
function leesVatRate(value: FormDataEntryValue | null): VatRate {
  const raw = (value as string)?.trim()
  if (raw === 'NUL' || raw === 'LAAG' || raw === 'HOOG') {
    return raw
  }
  throw new Error('Kies een geldig btw-tarief (0%, 9% of 21%).')
}

// Leest een optionele datum; lege waarde → null (datums mogen in concept leeg blijven).
function leesOptioneleDatum(value: FormDataEntryValue | null): Date | null {
  const raw = (value as string)?.trim()
  if (!raw) return null
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) {
    throw new Error('Een datum is ongeldig.')
  }
  return d
}

// ── Gedeelde helpers ──────────────────────────────────────────────────────────

// Haalt de ingelogde gebruiker + actieve stal-context op voor de aanmaak-flow. Weert
// platform-admins en gebruikers zonder specifieke actieve stal af. Spiegelt de
// stal/contracten-pagina-guards.
async function getActieveStalVoorBeheer(): Promise<{ stableId: string }> {
  const user = await getAuthUser()
  if (!user) redirect('/login')
  if (await isPlatformAdmin(user.id)) {
    throw new Error('Geen toegang')
  }
  const activeStableId = await getActiveStableId(user.id)
  if (!activeStableId || activeStableId === ALLE_STALLEN) {
    throw new Error('Kies eerst een actieve stal om een factuur op te stellen.')
  }
  await assertCanManageInvoicesForStable(user.id, activeStableId)
  return { stableId: activeStableId }
}

// Type voor de input van de totaalberekening-herberekening.
type RegelVoorBerekening = Pick<
  RuweFactuurregel,
  'description' | 'quantity' | 'unitPrice' | 'vatRate'
>

// Herberekent de gedenormaliseerde totalen (subtotal/vatAmount/total) van een factuur op
// basis van de huidige regels en schrijft ze weg. Aangeroepen binnen of na een
// regelmutatie. Mag een transactie-client meekrijgen zodat alles atomair blijft.
async function herberekenEnSchrijfTotalen(
  client: Prisma.TransactionClient,
  invoiceId: string,
): Promise<void> {
  const lines = await client.invoiceLine.findMany({
    where: { invoiceId },
    orderBy: { position: 'asc' },
  })
  const totalen = berekenFactuurTotalen(
    lines.map((l) => ({
      description: l.description,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      vatRate: l.vatRate,
    })),
  )
  await client.invoice.update({
    where: { id: invoiceId },
    data: {
      subtotal: totalen.subtotal,
      vatAmount: totalen.vatAmount,
      total: totalen.total,
    },
  })
}

// Dwingt af dat een factuur bewerkt mag worden (status CONCEPT). Mutatie-acties weigeren
// server-side wanneer de factuur niet (meer) CONCEPT is.
function assertConcept(status: string): void {
  if (status !== 'CONCEPT') {
    throw new Error('Alleen een concept-factuur kan worden bewerkt.')
  }
}

// Leest één regel-formulier (toevoegen/bewerken). Valideert omschrijving, aantal,
// stuksprijs en btw-tarief server-side.
function leesRegelForm(formData: FormData): RegelVoorBerekening {
  const description = leesVerplichteTekst(formData.get('description'), 'De omschrijving')
  const quantity = leesAantal(formData.get('quantity'), 'Het aantal')
  const unitPrice = leesNietNegatiefBedrag(formData.get('unitPrice'), 'De stuksprijs')
  const vatRate = leesVatRate(formData.get('vatRate'))
  return { description, quantity, unitPrice, vatRate }
}

// ── Acties ────────────────────────────────────────────────────────────────────

/**
 * Maakt een concept-factuur aan voor de actieve stal met minimaal één handmatige regel.
 * Valideert ontvanger (eigenaar/leaser van de stal), optioneel bron-contract, datums en
 * notes; dwingt de beheer-rol af. Invoice + InvoiceLines worden in één transactie
 * aangemaakt en de totalen berekend. Redirect naar de bewerk-pagina.
 */
export async function maakConceptFactuur(formData: FormData): Promise<void> {
  const { stableId } = await getActieveStalVoorBeheer()

  const recipientUserId = (formData.get('recipientUserId') as string)?.trim()
  if (!recipientUserId) {
    throw new Error('Kies een ontvanger.')
  }
  if (!(await isGeldigeFactuurOntvanger(stableId, recipientUserId))) {
    throw new Error('De gekozen ontvanger hoort niet bij deze stal.')
  }

  const contractIdRaw = (formData.get('contractId') as string)?.trim()
  let contractId: string | null = null
  if (contractIdRaw) {
    if (!(await isContractVanStable(stableId, contractIdRaw))) {
      throw new Error('Het gekozen contract hoort niet bij deze stal.')
    }
    contractId = contractIdRaw
  }

  const invoiceDate = leesOptioneleDatum(formData.get('invoiceDate'))
  const dueDate = leesOptioneleDatum(formData.get('dueDate'))
  const notes = (formData.get('notes') as string)?.trim() || null

  // Minimaal één regel vereist voor een geldige concept-factuur. De eerste regel komt
  // uit het aanmaak-formulier; verdere regels voegt de gebruiker op de bewerk-pagina toe.
  const eersteRegel = leesRegelForm(formData)
  const totalen = berekenFactuurTotalen([eersteRegel])

  const factuur = await prisma.$transaction(async (tx) => {
    return tx.invoice.create({
      data: {
        stableId,
        recipientUserId,
        contractId,
        invoiceDate,
        dueDate,
        notes,
        status: 'CONCEPT',
        subtotal: totalen.subtotal,
        vatAmount: totalen.vatAmount,
        total: totalen.total,
        lines: {
          create: {
            description: eersteRegel.description,
            quantity: eersteRegel.quantity,
            unitPrice: eersteRegel.unitPrice,
            vatRate: eersteRegel.vatRate,
            lineTotal: totalen.regels[0].lineTotal,
            position: 0,
          },
        },
      },
    })
  })

  redirect(`/stal/facturen/${factuur.id}/bewerken`)
}

/**
 * Werkt de factuurkop bij (ontvanger, bron-contract, datums, notes). Alleen bij CONCEPT.
 */
export async function werkFactuurkopBij(invoiceId: string, formData: FormData): Promise<void> {
  const user = await getAuthUser()
  if (!user) redirect('/login')
  const invoice = await assertCanManageInvoice(user.id, invoiceId)
  assertConcept(invoice.status)

  const recipientUserId = (formData.get('recipientUserId') as string)?.trim()
  if (!recipientUserId) {
    throw new Error('Kies een ontvanger.')
  }
  if (!(await isGeldigeFactuurOntvanger(invoice.stableId, recipientUserId))) {
    throw new Error('De gekozen ontvanger hoort niet bij deze stal.')
  }

  const contractIdRaw = (formData.get('contractId') as string)?.trim()
  let contractId: string | null = null
  if (contractIdRaw) {
    if (!(await isContractVanStable(invoice.stableId, contractIdRaw))) {
      throw new Error('Het gekozen contract hoort niet bij deze stal.')
    }
    contractId = contractIdRaw
  }

  const invoiceDate = leesOptioneleDatum(formData.get('invoiceDate'))
  const dueDate = leesOptioneleDatum(formData.get('dueDate'))
  const notes = (formData.get('notes') as string)?.trim() || null

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { recipientUserId, contractId, invoiceDate, dueDate, notes },
  })

  revalidatePath(`/stal/facturen/${invoiceId}/bewerken`)
}

/**
 * Voegt een handmatige regel toe aan een concept-factuur en herberekent de totalen.
 * De nieuwe regel krijgt de eerstvolgende position. Alleen bij CONCEPT.
 */
export async function voegFactuurregelToe(invoiceId: string, formData: FormData): Promise<void> {
  const user = await getAuthUser()
  if (!user) redirect('/login')
  const invoice = await assertCanManageInvoice(user.id, invoiceId)
  assertConcept(invoice.status)

  const regel = leesRegelForm(formData)
  const lineTotal = berekenFactuurTotalen([regel]).regels[0].lineTotal

  await prisma.$transaction(async (tx) => {
    const laatste = await tx.invoiceLine.findFirst({
      where: { invoiceId },
      orderBy: { position: 'desc' },
      select: { position: true },
    })
    const position = laatste ? laatste.position + 1 : 0
    await tx.invoiceLine.create({
      data: {
        invoiceId,
        description: regel.description,
        quantity: regel.quantity,
        unitPrice: regel.unitPrice,
        vatRate: regel.vatRate,
        lineTotal,
        position,
      },
    })
    await herberekenEnSchrijfTotalen(tx, invoiceId)
  })

  revalidatePath(`/stal/facturen/${invoiceId}/bewerken`)
}

/**
 * Werkt een bestaande regel bij en herberekent de totalen. Alleen bij CONCEPT en alleen
 * voor een regel die bij deze factuur hoort.
 */
export async function werkFactuurregelBij(
  invoiceId: string,
  lineId: string,
  formData: FormData,
): Promise<void> {
  const user = await getAuthUser()
  if (!user) redirect('/login')
  const invoice = await assertCanManageInvoice(user.id, invoiceId)
  assertConcept(invoice.status)

  const bestaand = invoice.lines.find((l) => l.id === lineId)
  if (!bestaand) {
    throw new Error('De regel hoort niet bij deze factuur.')
  }

  const regel = leesRegelForm(formData)
  const lineTotal = berekenFactuurTotalen([regel]).regels[0].lineTotal

  await prisma.$transaction(async (tx) => {
    await tx.invoiceLine.update({
      where: { id: lineId },
      data: {
        description: regel.description,
        quantity: regel.quantity,
        unitPrice: regel.unitPrice,
        vatRate: regel.vatRate,
        lineTotal,
      },
    })
    await herberekenEnSchrijfTotalen(tx, invoiceId)
  })

  revalidatePath(`/stal/facturen/${invoiceId}/bewerken`)
}

/**
 * Verwijdert een regel en herberekent de totalen. Alleen bij CONCEPT. Het verwijderen
 * van de laatste regel wordt geweigerd: een concept-factuur houdt minimaal één regel.
 */
export async function verwijderFactuurregel(invoiceId: string, lineId: string): Promise<void> {
  const user = await getAuthUser()
  if (!user) redirect('/login')
  const invoice = await assertCanManageInvoice(user.id, invoiceId)
  assertConcept(invoice.status)

  const bestaand = invoice.lines.find((l) => l.id === lineId)
  if (!bestaand) {
    throw new Error('De regel hoort niet bij deze factuur.')
  }
  if (invoice.lines.length <= 1) {
    throw new Error('Een factuur moet minimaal één regel hebben.')
  }

  await prisma.$transaction(async (tx) => {
    await tx.invoiceLine.delete({ where: { id: lineId } })
    await herberekenEnSchrijfTotalen(tx, invoiceId)
  })

  revalidatePath(`/stal/facturen/${invoiceId}/bewerken`)
}

/**
 * Vult de factuurregels voor uit het aan de factuur gekoppelde contract ([Fact 04] #149).
 *
 * Leidt — op basis van Contract.family (STALLING/LEASE) — de bronregels af met de
 * voorvul-helper (juiste btw-tarieven, INCL→EXCL teruggerekend) en voegt ze als gewone,
 * bewerkbare InvoiceLine-regels **achter** de bestaande regels toe (oplopende position),
 * in één transactie, en herberekent de totalen. Na het voorvullen zijn de regels identiek
 * aan handmatige regels: ze worden via dezelfde acties bewerkt/verwijderd.
 *
 * Server-side afgedwongen (CLAUDE.md):
 *  - beheer-rol op de uitgevende stal (Fact 02-guard assertCanManageInvoice),
 *  - alleen bij CONCEPT (assertConcept),
 *  - er moet een bron-contract gekoppeld zijn dat bij dezelfde stal hoort,
 *  - geen dubbeling: voorvullen kan alleen op een "verse" concept-factuur (uitsluitend de
 *    bij aanmaak verplichte regel); is er al meer dan één regel, dan een nette melding.
 */
export async function voorvulRegelsUitContract(invoiceId: string): Promise<void> {
  const user = await getAuthUser()
  if (!user) redirect('/login')
  const invoice = await assertCanManageInvoice(user.id, invoiceId)
  assertConcept(invoice.status)

  if (!invoice.contractId) {
    throw new Error('Koppel eerst een contract aan deze factuur.')
  }
  // Geen dubbeling: voorvullen alleen op een verse concept-factuur (enkel de bij aanmaak
  // verplichte regel). Is er al meer dan één regel, dan is er al voorgevuld/handmatig
  // uitgebreid; een tweede voorvulronde zou dezelfde contractregels nogmaals toevoegen.
  if (invoice.lines.length > 1) {
    throw new Error(
      'Voorvullen kan alleen op een nieuwe concept-factuur met één regel. Verwijder eerst de extra regels.',
    )
  }

  // Het contract moet bij dezelfde stal horen (Fact 03-controle) en we lezen family +
  // config voor de afleiding. assertCanManageInvoice selecteert het contract beperkt,
  // dus halen we family/config gericht op.
  const contract = await prisma.contract.findFirst({
    where: { id: invoice.contractId, stableId: invoice.stableId },
    select: { family: true, config: true },
  })
  if (!contract) {
    throw new Error('Het gekoppelde contract hoort niet bij deze stal.')
  }

  const bronregels = voorvulRegelsUitContractConfig(contract.family, contract.config)
  if (bronregels.length === 0) {
    throw new Error('Het gekoppelde contract bevat geen factureerbare bedragen om voor te vullen.')
  }

  await prisma.$transaction(async (tx) => {
    const laatste = await tx.invoiceLine.findFirst({
      where: { invoiceId },
      orderBy: { position: 'desc' },
      select: { position: true },
    })
    let position = laatste ? laatste.position + 1 : 0
    for (const regel of bronregels) {
      const lineTotal = berekenFactuurTotalen([regel]).regels[0].lineTotal
      await tx.invoiceLine.create({
        data: {
          invoiceId,
          description: regel.description,
          quantity: regel.quantity,
          unitPrice: regel.unitPrice,
          vatRate: regel.vatRate,
          lineTotal,
          position,
        },
      })
      position += 1
    }
    await herberekenEnSchrijfTotalen(tx, invoiceId)
  })

  revalidatePath(`/stal/facturen/${invoiceId}/bewerken`)
}
