import { Prisma } from '@prisma/client'
import type { VatRate } from '@prisma/client'
import {
  berekenFactuurTotalen,
  formatEuro,
  VAT_RATE_LABEL,
  type RuweFactuurregel,
} from './berekeningen.ts'

// ── Factuur-PDF-databouw ([Fact 05] #150) ────────────────────────────────────
// Pure, IO-vrije data-bouwer die uit een factuur + partijen-context het stel waarden
// opbouwt dat de PDF rendert. Spiegelt bewust bouwContractPdfData (contracten/pdfData.ts):
// geen Prisma-IO, test-vriendelijk, datum injecteerbaar. De bedragen/btw komen uit de
// bestaande rekenhelper berekenFactuurTotalen (Fact 03) — niet opnieuw met floats rekenen.

// Eén factuurregel zoals die in de PDF verschijnt (alle bedragen al geformatteerd).
export type FactuurPdfRegel = {
  omschrijving: string
  aantal: string
  stuksprijs: string
  btwTarief: string
  regelbedrag: string
}

// Eén btw-tarief in het btw-overzicht: grondslag (excl. btw) + btw-bedrag per tarief.
export type FactuurPdfBtwGroep = {
  tarief: string
  grondslag: string
  btwBedrag: string
}

// De afzender (uitgevende stal).
export type FactuurPdfAfzender = {
  naam: string
  adres: string | null
}

// De ontvanger (factuurgegevens uit OwnerBusinessProfile, met val-terug op User).
export type FactuurPdfOntvanger = {
  naam: string
  adres: string | null
  kvkNumber: string | null
  vatNumber: string | null
}

// Het volledige, gerenderde model van de factuur-PDF.
export type FactuurPdfData = {
  factuurnummer: string
  factuurdatum: string | null
  vervaldatum: string | null
  afzender: FactuurPdfAfzender
  ontvanger: FactuurPdfOntvanger
  regels: FactuurPdfRegel[]
  btwGroepen: FactuurPdfBtwGroep[]
  subtotaal: string
  totaleBtw: string
  totaal: string
  notes: string | null
  // Eigen stallogo als data-URL (#98), of null voor de Velaro-fallback.
  stalLogoDataUrl: string | null
}

// Eén ruwe factuurregel zoals die uit de DB-InvoiceLine komt.
export type PdfFactuurregelInput = {
  description: string
  quantity: Prisma.Decimal | number | string
  unitPrice: Prisma.Decimal | number | string
  vatRate: VatRate
}

// Minimale factuur-vorm die de databouw nodig heeft.
export type FactuurPdfInput = {
  invoiceNumber: string
  invoiceDate: Date | null
  dueDate: Date | null
  notes: string | null
  regels: PdfFactuurregelInput[]
}

// De partijen-/logo-context (uit de DB samengesteld door de aanroeper).
export type FactuurPdfContext = {
  afzender: FactuurPdfAfzender
  ontvanger: FactuurPdfOntvanger
  stalLogoDataUrl?: string | null
}

function formatDatumNL(date: Date): string {
  return new Intl.DateTimeFormat('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

// Formatteert een aantal (Decimal/number/string) zonder overbodige decimalen: een
// geheel aantal toont als "1", een deelperiode als "1,5".
function formatAantal(waarde: Prisma.Decimal | number | string): string {
  const decimal = new Prisma.Decimal(waarde)
  // Toon maximaal 2 decimalen, maar laat trailing nullen weg en gebruik NL-komma.
  return decimal
    .toDecimalPlaces(2)
    .toString()
    .replace('.', ',')
}

// Bouwt het volledige PDF-datamodel. `vandaag` is injecteerbaar voor tests. De
// bedragen/btw komen integraal uit berekenFactuurTotalen (Fact 03), zodat de PDF exact
// dezelfde optelling toont als de bewerk-pagina.
export function bouwFactuurPdfData(
  factuur: FactuurPdfInput,
  context: FactuurPdfContext,
): FactuurPdfData {
  const ruweRegels: RuweFactuurregel[] = factuur.regels.map((r) => ({
    description: r.description,
    quantity: r.quantity,
    unitPrice: r.unitPrice,
    vatRate: r.vatRate,
  }))
  const totalen = berekenFactuurTotalen(ruweRegels)

  const regels: FactuurPdfRegel[] = totalen.regels.map((regel) => ({
    omschrijving: regel.description,
    aantal: formatAantal(regel.quantity),
    stuksprijs: formatEuro(regel.unitPrice),
    btwTarief: VAT_RATE_LABEL[regel.vatRate],
    regelbedrag: formatEuro(regel.lineTotal),
  }))

  const btwGroepen: FactuurPdfBtwGroep[] = totalen.btwGroepen.map((groep) => ({
    tarief: VAT_RATE_LABEL[groep.vatRate],
    grondslag: formatEuro(groep.grondslag),
    btwBedrag: formatEuro(groep.btwBedrag),
  }))

  return {
    factuurnummer: factuur.invoiceNumber,
    factuurdatum: factuur.invoiceDate ? formatDatumNL(factuur.invoiceDate) : null,
    vervaldatum: factuur.dueDate ? formatDatumNL(factuur.dueDate) : null,
    afzender: context.afzender,
    ontvanger: context.ontvanger,
    regels,
    btwGroepen,
    subtotaal: formatEuro(totalen.subtotal),
    totaleBtw: formatEuro(totalen.vatAmount),
    totaal: formatEuro(totalen.total),
    notes: factuur.notes,
    stalLogoDataUrl: context.stalLogoDataUrl ?? null,
  }
}
