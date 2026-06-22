import { test } from 'node:test'
import assert from 'node:assert/strict'
import { bouwFactuurPdfData, type FactuurPdfContext } from './factuurPdfData.ts'

// Unit-tests voor de pure factuur-PDF-databouw ([Fact 05] #150). IO-vrij: geen Prisma,
// geen render. Controleert dat de bedragen/btw exact uit berekenFactuurTotalen (Fact 03)
// komen en dat afzender/ontvanger + datums correct in het model belanden.

const context: FactuurPdfContext = {
  afzender: { naam: 'Stal Jasper', adres: 'Dorpsstraat 1, 1234 AB Ede' },
  ontvanger: {
    naam: 'Manege De Vlinder B.V.',
    adres: 'Weidelaan 5, 5678 CD Apeldoorn',
    kvkNumber: '12345678',
    vatNumber: 'NL001234567B01',
  },
  stalLogoDataUrl: null,
}

test('bouwt het btw-overzicht per tarief en de totalen uit berekenFactuurTotalen', () => {
  const data = bouwFactuurPdfData(
    {
      invoiceNumber: '2026-0001',
      invoiceDate: new Date('2026-06-22T00:00:00Z'),
      dueDate: new Date('2026-07-06T00:00:00Z'),
      notes: null,
      regels: [
        { description: 'Stalling juni', quantity: 1, unitPrice: 300, vatRate: 'HOOG' },
        { description: 'Hooi', quantity: 2, unitPrice: 50, vatRate: 'LAAG' },
      ],
    },
    context,
  )

  // Twee voorkomende tarieven (LAAG, HOOG) in weergavevolgorde.
  assert.equal(data.btwGroepen.length, 2)
  assert.deepEqual(
    data.btwGroepen.map((g) => g.tarief),
    ['9%', '21%'],
  )

  // Grondslag HOOG = 300, btw 21% = 63. Grondslag LAAG = 100, btw 9% = 9.
  const hoog = data.btwGroepen.find((g) => g.tarief === '21%')!
  const laag = data.btwGroepen.find((g) => g.tarief === '9%')!
  assert.match(hoog.grondslag, /300/)
  assert.match(hoog.btwBedrag, /63/)
  assert.match(laag.grondslag, /100/)
  assert.match(laag.btwBedrag, /9/)

  // Subtotaal 400, totale btw 72, totaal 472.
  assert.match(data.subtotaal, /400/)
  assert.match(data.totaleBtw, /72/)
  assert.match(data.totaal, /472/)
})

test('neemt factuurnummer, datums en partijen over en formatteert de datums NL', () => {
  const data = bouwFactuurPdfData(
    {
      invoiceNumber: '2026-0042',
      invoiceDate: new Date('2026-06-22T00:00:00Z'),
      dueDate: null,
      notes: 'Bedankt voor uw vertrouwen.',
      regels: [{ description: 'Les', quantity: 1, unitPrice: 25, vatRate: 'NUL' }],
    },
    context,
  )

  assert.equal(data.factuurnummer, '2026-0042')
  assert.equal(data.factuurdatum, '22 juni 2026')
  assert.equal(data.vervaldatum, null)
  assert.equal(data.afzender.naam, 'Stal Jasper')
  assert.equal(data.ontvanger.naam, 'Manege De Vlinder B.V.')
  assert.equal(data.ontvanger.kvkNumber, '12345678')
  assert.equal(data.notes, 'Bedankt voor uw vertrouwen.')

  // Eén regel met 0% btw → één btw-groep met btw-bedrag 0.
  assert.equal(data.regels.length, 1)
  assert.equal(data.regels[0].btwTarief, '0%')
  assert.equal(data.btwGroepen.length, 1)
})

test('bouwt geen betaalblok wanneer er geen betaalwijze op de factuur staat', () => {
  const data = bouwFactuurPdfData(
    {
      invoiceNumber: '2026-0003',
      invoiceDate: null,
      dueDate: null,
      notes: null,
      regels: [{ description: 'Stalling', quantity: 1, unitPrice: 100, vatRate: 'HOOG' }],
    },
    context,
  )
  assert.equal(data.betaling, null)
})

test('bouwt het overboekingsblok met stal-IBAN (leesbaar) en tenaamstelling', () => {
  const data = bouwFactuurPdfData(
    {
      invoiceNumber: '2026-0004',
      invoiceDate: null,
      dueDate: null,
      notes: null,
      regels: [{ description: 'Stalling', quantity: 1, unitPrice: 100, vatRate: 'HOOG' }],
      betaling: {
        paymentMethod: 'OVERBOEKING',
        sepaAccountHolder: null,
        sepaIban: null,
        sepaMandateReference: null,
        sepaMandateDate: null,
      },
    },
    {
      ...context,
      stalBetaalgegevens: { iban: 'NL91ABNA0417164300', tenaamstelling: 'Stal Jasper' },
    },
  )
  assert.ok(data.betaling)
  assert.equal(data.betaling!.wijze, 'OVERBOEKING')
  // IBAN leesbaar gegroepeerd per vier.
  assert.equal(data.betaling!.stalIban, 'NL91 ABNA 0417 1643 00')
  assert.equal(data.betaling!.stalTenaamstelling, 'Stal Jasper')
  // Geen mandaatgegevens bij overboeking.
  assert.equal(data.betaling!.iban, null)
  assert.equal(data.betaling!.mandaatkenmerk, null)
})

test('bouwt het SEPA-incassoblok met mandaatgegevens en NL-mandaatdatum', () => {
  const data = bouwFactuurPdfData(
    {
      invoiceNumber: '2026-0005',
      invoiceDate: null,
      dueDate: null,
      notes: null,
      regels: [{ description: 'Stalling', quantity: 1, unitPrice: 100, vatRate: 'HOOG' }],
      betaling: {
        paymentMethod: 'SEPA_INCASSO',
        sepaAccountHolder: 'J. de Vries',
        sepaIban: 'NL91ABNA0417164300',
        sepaMandateReference: 'MND-2026-001',
        sepaMandateDate: new Date('2026-01-15T00:00:00Z'),
      },
    },
    context,
  )
  assert.ok(data.betaling)
  assert.equal(data.betaling!.wijze, 'SEPA_INCASSO')
  assert.equal(data.betaling!.iban, 'NL91 ABNA 0417 1643 00')
  assert.equal(data.betaling!.tenaamstelling, 'J. de Vries')
  assert.equal(data.betaling!.mandaatkenmerk, 'MND-2026-001')
  assert.equal(data.betaling!.mandaatdatum, '15 januari 2026')
})

test('toont een geheel aantal zonder decimalen en een deelperiode met NL-komma', () => {
  const data = bouwFactuurPdfData(
    {
      invoiceNumber: '2026-0002',
      invoiceDate: null,
      dueDate: null,
      notes: null,
      regels: [
        { description: 'Heel', quantity: 1, unitPrice: 10, vatRate: 'HOOG' },
        { description: 'Half', quantity: '1.5', unitPrice: 10, vatRate: 'HOOG' },
      ],
    },
    context,
  )

  assert.equal(data.regels[0].aantal, '1')
  assert.equal(data.regels[1].aantal, '1,5')
})
