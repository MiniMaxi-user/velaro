import { Prisma } from '@prisma/client'
import type { VatRate, InvoiceStatus } from '@prisma/client'

// ── Factuur-berekeningen ([Fact 03] #148) ────────────────────────────────────
// Centrale, test-vriendelijke rekenhelper voor het concept-factureren. Alle bedragen
// worden met Prisma.Decimal gerekend en op 2 decimalen afgerond (toDecimalPlaces),
// zodat er geen floating-point-afrondfouten ontstaan. Deze helper is bewust losgekoppeld
// van Prisma-IO zodat Fact 04 (voorvullen uit contract) en Fact 05 (PDF) dezelfde
// optelling hergebruiken — niet dupliceren.

// Het btw-percentage per VatRate als centrale mapping (label + percentage), niet inline
// verspreid over de UI/acties. De numerieke percentages staan los van de enum (Fact 01).
export const VAT_RATE_PERCENTAGE: Record<VatRate, number> = {
  NUL: 0,
  LAAG: 9,
  HOOG: 21,
}

export const VAT_RATE_LABEL: Record<VatRate, string> = {
  NUL: '0%',
  LAAG: '9%',
  HOOG: '21%',
}

// De toegestane btw-tarieven in weergavevolgorde (laag → hoog), voor keuzelijsten.
export const VAT_RATES: VatRate[] = ['NUL', 'LAAG', 'HOOG']

const TWEE_DECIMALEN = 2

const EURO_FORMAT = new Intl.NumberFormat('nl-NL', {
  style: 'currency',
  currency: 'EUR',
})

// Formatteert een bedrag (Decimal/number/string) als euro-bedrag in NL-notatie.
export function formatEuro(waarde: Prisma.Decimal | number | string): string {
  return EURO_FORMAT.format(new Prisma.Decimal(waarde).toNumber())
}

// Een ruwe factuurregel zoals die uit het formulier of een bron-contract komt: nog
// zonder lineTotal (die wordt hier afgeleid).
export interface RuweFactuurregel {
  description: string
  quantity: Prisma.Decimal | number | string
  unitPrice: Prisma.Decimal | number | string
  vatRate: VatRate
}

// Een regel met afgeleid (afgerond) regelbedrag excl. btw.
export interface BerekendeRegel {
  description: string
  quantity: Prisma.Decimal
  unitPrice: Prisma.Decimal
  vatRate: VatRate
  lineTotal: Prisma.Decimal
}

// Eén btw-tarief gegroepeerd: grondslag (excl. btw) en het bijbehorende btw-bedrag.
export interface BtwGroep {
  vatRate: VatRate
  percentage: number
  grondslag: Prisma.Decimal
  btwBedrag: Prisma.Decimal
}

// De volledige uitkomst van een factuurberekening.
export interface FactuurTotalen {
  regels: BerekendeRegel[]
  btwGroepen: BtwGroep[]
  subtotal: Prisma.Decimal
  vatAmount: Prisma.Decimal
  total: Prisma.Decimal
}

function naarDecimal(waarde: Prisma.Decimal | number | string): Prisma.Decimal {
  return new Prisma.Decimal(waarde)
}

function afronden(waarde: Prisma.Decimal): Prisma.Decimal {
  return waarde.toDecimalPlaces(TWEE_DECIMALEN)
}

// Berekent het regelbedrag excl. btw: quantity × unitPrice, afgerond op 2 decimalen.
export function berekenLineTotal(
  quantity: Prisma.Decimal | number | string,
  unitPrice: Prisma.Decimal | number | string,
): Prisma.Decimal {
  return afronden(naarDecimal(quantity).mul(naarDecimal(unitPrice)))
}

/**
 * Berekent alle totalen van een factuur op basis van de ruwe regels.
 *
 * - lineTotal per regel = quantity × unitPrice, afgerond op 2 decimalen.
 * - De btw wordt **per btw-tarief gegroepeerd** berekend: per tarief eerst de grondslag
 *   (som van de lineTotals van dat tarief) en daarover het btw-bedrag, afgerond op 2
 *   decimalen. Zo ontstaan er geen afrondverschillen per regel.
 * - subtotal = som van alle lineTotals (excl. btw).
 * - vatAmount = som van de afgeronde btw-bedragen per tarief.
 * - total = subtotal + vatAmount.
 *
 * Alleen tarieven die daadwerkelijk voorkomen worden in btwGroepen opgenomen
 * (weergavevolgorde 0/9/21%).
 */
export function berekenFactuurTotalen(regels: RuweFactuurregel[]): FactuurTotalen {
  const berekendeRegels: BerekendeRegel[] = regels.map((regel) => {
    const quantity = naarDecimal(regel.quantity)
    const unitPrice = naarDecimal(regel.unitPrice)
    return {
      description: regel.description,
      quantity,
      unitPrice,
      vatRate: regel.vatRate,
      lineTotal: berekenLineTotal(quantity, unitPrice),
    }
  })

  // Grondslag per btw-tarief verzamelen.
  const grondslagPerTarief = new Map<VatRate, Prisma.Decimal>()
  for (const regel of berekendeRegels) {
    const huidige = grondslagPerTarief.get(regel.vatRate) ?? new Prisma.Decimal(0)
    grondslagPerTarief.set(regel.vatRate, huidige.add(regel.lineTotal))
  }

  const btwGroepen: BtwGroep[] = []
  for (const vatRate of VAT_RATES) {
    const grondslag = grondslagPerTarief.get(vatRate)
    if (grondslag === undefined) continue
    const percentage = VAT_RATE_PERCENTAGE[vatRate]
    const btwBedrag = afronden(grondslag.mul(percentage).div(100))
    btwGroepen.push({
      vatRate,
      percentage,
      grondslag: afronden(grondslag),
      btwBedrag,
    })
  }

  const subtotal = afronden(
    berekendeRegels.reduce(
      (som, regel) => som.add(regel.lineTotal),
      new Prisma.Decimal(0),
    ),
  )
  const vatAmount = afronden(
    btwGroepen.reduce((som, groep) => som.add(groep.btwBedrag), new Prisma.Decimal(0)),
  )
  const total = afronden(subtotal.add(vatAmount))

  return { regels: berekendeRegels, btwGroepen, subtotal, vatAmount, total }
}

// ── Samenvattende cijfers ([Fact 07] #152) ───────────────────────────────────
// Eenvoudige optelling per status voor het facturen-overzicht (geen grafieken/rapportage):
//   - openstaand = som van de totalen van VERZONDEN + VERVALLEN (nog te innen),
//   - betaald    = som van de totalen van BETAALD,
//   - omzet      = som van alle niet-CONCEPT en niet-GEANNULEERD totalen.
// Bewust losgekoppeld van Prisma-IO zodat de overzichtspagina (en tests) ze uit de al
// opgehaalde lijst kunnen berekenen, zonder extra query.

export interface FactuurSamenvatting {
  openstaandBedrag: Prisma.Decimal
  openstaandAantal: number
  betaaldBedrag: Prisma.Decimal
  betaaldAantal: number
  omzetBedrag: Prisma.Decimal
}

interface FactuurVoorSamenvatting {
  status: InvoiceStatus
  total: Prisma.Decimal | number | string
}

export function berekenFactuurSamenvatting(
  facturen: FactuurVoorSamenvatting[],
): FactuurSamenvatting {
  let openstaandBedrag = new Prisma.Decimal(0)
  let openstaandAantal = 0
  let betaaldBedrag = new Prisma.Decimal(0)
  let betaaldAantal = 0
  let omzetBedrag = new Prisma.Decimal(0)

  for (const factuur of facturen) {
    const total = naarDecimal(factuur.total)
    if (factuur.status === 'VERZONDEN' || factuur.status === 'VERVALLEN') {
      openstaandBedrag = openstaandBedrag.add(total)
      openstaandAantal += 1
    }
    if (factuur.status === 'BETAALD') {
      betaaldBedrag = betaaldBedrag.add(total)
      betaaldAantal += 1
    }
    if (factuur.status !== 'CONCEPT' && factuur.status !== 'GEANNULEERD') {
      omzetBedrag = omzetBedrag.add(total)
    }
  }

  return {
    openstaandBedrag: afronden(openstaandBedrag),
    openstaandAantal,
    betaaldBedrag: afronden(betaaldBedrag),
    betaaldAantal,
    omzetBedrag: afronden(omzetBedrag),
  }
}
