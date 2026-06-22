import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { prisma } from '@/lib/prisma'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStableLogoDataUrl } from '@/features/stal/logoStorage'
import { FACTUUR_PDF_BUCKET } from './facturenStorage'
import { FactuurPdfDocument } from './FactuurPdfDocument'
import {
  bouwFactuurPdfData,
  type FactuurPdfContext,
  type FactuurPdfInput,
  type FactuurPdfAfzender,
  type FactuurPdfOntvanger,
} from './factuurPdfData'

// ── Factuur-PDF-generatie & opslag ([Fact 05] #150) ──────────────────────────
// Spiegelt bewust de contract-PDF-stack (src/features/contracten/pdf.ts):
// server-side generatie met @react-pdf/renderer (geen headless browser); de PDF wordt
// bij definitief maken naar de privé Supabase-bucket geschreven en als
// InvoiceDocument-rij aan de factuur gekoppeld. Inzage loopt uitsluitend via een
// signed URL (Fact 02-helper); de autorisatie bepaalt de aanroeper, niet de bucket.

// Zorgt dat de (privé) bucket voor factuur-PDF's bestaat. Idempotent: bestaat hij al,
// dan gebeurt er niets. Zo werkt het definitief maken ook zonder handmatige
// bucket-provisioning in een nieuwe omgeving. Spiegelt ensureContractPdfBucket.
async function ensureFactuurPdfBucket(
  supabase: ReturnType<typeof createAdminClient>,
): Promise<void> {
  const { data } = await supabase.storage.getBucket(FACTUUR_PDF_BUCKET)
  if (data) return
  const { error } = await supabase.storage.createBucket(FACTUUR_PDF_BUCKET, {
    public: false,
  })
  // Negeer een race waarbij de bucket inmiddels door een parallelle aanroep bestaat.
  if (error && !/already exists/i.test(error.message)) {
    throw new Error(`Factuur-PDF-bucket aanmaken mislukt: ${error.message}`)
  }
}

// Rendert de factuur-PDF naar een Buffer. Pure render zonder neveneffecten: bouwt het
// datamodel en rendert het @react-pdf/renderer-document.
export async function renderFactuurPdfBuffer(
  factuur: FactuurPdfInput,
  context: FactuurPdfContext,
): Promise<Buffer> {
  const data = bouwFactuurPdfData(factuur, context)
  const element = createElement(FactuurPdfDocument, { data })
  return renderToBuffer(element as Parameters<typeof renderToBuffer>[0])
}

// Stelt het factuuradres samen uit een OwnerBusinessProfile: bij een afwijkend
// factuuradres dat adres, anders het hoofdadres. Geeft null wanneer er niets is.
function bouwOntvangerAdres(profiel: {
  separateInvoiceAddress: boolean
  address: string | null
  postalCode: string | null
  city: string | null
  country: string | null
  invoiceAddress: string | null
  invoicePostalCode: string | null
  invoiceCity: string | null
  invoiceCountry: string | null
} | null): string | null {
  if (!profiel) return null
  const gebruikFactuuradres = profiel.separateInvoiceAddress
  const straat = gebruikFactuuradres ? profiel.invoiceAddress : profiel.address
  const postcode = gebruikFactuuradres ? profiel.invoicePostalCode : profiel.postalCode
  const plaats = gebruikFactuuradres ? profiel.invoiceCity : profiel.city
  const land = gebruikFactuuradres ? profiel.invoiceCountry : profiel.country
  const delen = [
    straat,
    [postcode, plaats].filter(Boolean).join(' '),
    land,
  ].filter((d) => d && d.trim().length > 0)
  return delen.length > 0 ? delen.join(', ') : null
}

// Verzamelt de afzender-/ontvanger-context voor een opgeslagen factuur uit de DB.
// Afzender = uitgevende stal (naam, adres, logo). Ontvanger = factuurgegevens uit het
// OwnerBusinessProfile van de ontvanger, met val-terug op User.name/email.
async function bouwContextVoorFactuur(invoiceId: string): Promise<FactuurPdfContext> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      stable: {
        select: {
          id: true,
          name: true,
          address: true,
          postalCode: true,
          city: true,
          logoPath: true,
          iban: true,
          accountHolder: true,
        },
      },
      recipient: {
        select: {
          name: true,
          email: true,
          businessProfile: {
            select: {
              companyName: true,
              address: true,
              postalCode: true,
              city: true,
              country: true,
              kvkNumber: true,
              vatNumber: true,
              separateInvoiceAddress: true,
              invoiceAddress: true,
              invoicePostalCode: true,
              invoiceCity: true,
              invoiceCountry: true,
            },
          },
        },
      },
    },
  })
  if (!invoice) throw new Error('Factuur niet gevonden')

  const stalAdresDelen = [
    invoice.stable.address,
    [invoice.stable.postalCode, invoice.stable.city].filter(Boolean).join(' '),
  ].filter((d) => d && d.trim().length > 0)

  const afzender: FactuurPdfAfzender = {
    naam: invoice.stable.name,
    adres: stalAdresDelen.length > 0 ? stalAdresDelen.join(', ') : null,
  }

  const profiel = invoice.recipient?.businessProfile ?? null
  const ontvangerNaam =
    profiel?.companyName ??
    invoice.recipient?.name ??
    invoice.recipient?.email ??
    'Onbekende ontvanger'

  const ontvanger: FactuurPdfOntvanger = {
    naam: ontvangerNaam,
    adres: bouwOntvangerAdres(profiel),
    kvkNumber: profiel?.kvkNumber ?? null,
    vatNumber: profiel?.vatNumber ?? null,
  }

  return {
    afzender,
    ontvanger,
    // Eigen stallogo (#98) als data-URL; null = standaard Velaro-logo.
    stalLogoDataUrl: invoice.stable.logoPath
      ? await getStableLogoDataUrl(invoice.stable.id)
      : null,
    // Stal-betaalgegevens (afzender) voor de overboekingsinstructie ([Fact 06] #151).
    stalBetaalgegevens: {
      iban: invoice.stable.iban,
      tenaamstelling: invoice.stable.accountHolder,
    },
  }
}

// Genereert de PDF voor een definitief gemaakte factuur en schrijft die naar Supabase
// Storage + koppelt een InvoiceDocument-rij. Aangeroepen door de "factuur definitief
// maken"-actie ná de geslaagde nummering-transactie (de PDF heeft het nummer nodig).
// Faalt de generatie of upload, dan gooit deze functie zodat de aanroeper kan beslissen.
export async function genereerEnSlaFactuurPdfOp(invoiceId: string): Promise<void> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { lines: { orderBy: { position: 'asc' } } },
  })
  if (!invoice) throw new Error('Factuur niet gevonden')
  if (!invoice.invoiceNumber) {
    throw new Error('Factuur heeft nog geen factuurnummer.')
  }

  const context = await bouwContextVoorFactuur(invoiceId)
  const buffer = await renderFactuurPdfBuffer(
    {
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      dueDate: invoice.dueDate,
      notes: invoice.notes,
      regels: invoice.lines.map((l) => ({
        description: l.description,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        vatRate: l.vatRate,
      })),
      // Betaal-momentopname op de factuur ([Fact 06] #151).
      betaling: {
        paymentMethod: invoice.paymentMethod,
        sepaAccountHolder: invoice.sepaAccountHolder,
        sepaIban: invoice.sepaIban,
        sepaMandateReference: invoice.sepaMandateReference,
        sepaMandateDate: invoice.sepaMandateDate,
      },
    },
    context,
  )

  const storagePath = `${invoiceId}/${invoice.invoiceNumber}-${Date.now()}.pdf`
  const supabase = createAdminClient()
  await ensureFactuurPdfBucket(supabase)
  const { error } = await supabase.storage
    .from(FACTUUR_PDF_BUCKET)
    .upload(storagePath, buffer, {
      contentType: 'application/pdf',
      upsert: true,
    })
  if (error) {
    throw new Error(`PDF-opslag mislukt: ${error.message}`)
  }

  await prisma.invoiceDocument.create({
    data: { invoiceId, storagePath },
  })
}
