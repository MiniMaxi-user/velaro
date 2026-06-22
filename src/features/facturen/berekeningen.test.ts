import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Prisma } from '@prisma/client'
import {
  berekenLineTotal,
  berekenFactuurTotalen,
  VAT_RATE_PERCENTAGE,
  VAT_RATE_LABEL,
  VAT_RATES,
} from './berekeningen.ts'

// Unit-tests voor de centrale factuur-rekenhelper ([Fact 03] #148). Pure functies met
// Prisma.Decimal — getest op afronding op 2 decimalen, btw per tarief gegroepeerd en de
// optelling subtotal/vatAmount/total conform de acceptatiecriteria.

test('VatRate-mapping kent de juiste percentages en labels', () => {
  assert.equal(VAT_RATE_PERCENTAGE.NUL, 0)
  assert.equal(VAT_RATE_PERCENTAGE.LAAG, 9)
  assert.equal(VAT_RATE_PERCENTAGE.HOOG, 21)
  assert.equal(VAT_RATE_LABEL.HOOG, '21%')
  assert.deepEqual(VAT_RATES, ['NUL', 'LAAG', 'HOOG'])
})

test('berekenLineTotal = quantity × unitPrice, afgerond op 2 decimalen', () => {
  assert.equal(berekenLineTotal(3, 10).toString(), '30')
  assert.equal(berekenLineTotal(2, '12.5').toString(), '25')
  // Afronding: 1 × 10.005 → 10.01 (half-up via Decimal default)
  assert.equal(berekenLineTotal(1, '10.005').toString(), '10.01')
})

test('subtotal/vatAmount/total met één hoog tarief', () => {
  const t = berekenFactuurTotalen([
    { description: 'Stalling', quantity: 1, unitPrice: 100, vatRate: 'HOOG' },
  ])
  assert.equal(t.subtotal.toString(), '100')
  assert.equal(t.vatAmount.toString(), '21')
  assert.equal(t.total.toString(), '121')
  assert.equal(t.btwGroepen.length, 1)
  assert.equal(t.btwGroepen[0].vatRate, 'HOOG')
  assert.equal(t.btwGroepen[0].grondslag.toString(), '100')
  assert.equal(t.btwGroepen[0].btwBedrag.toString(), '21')
})

test('btw wordt per tarief gegroepeerd berekend en in volgorde 0/9/21% getoond', () => {
  const t = berekenFactuurTotalen([
    { description: 'Hoog A', quantity: 2, unitPrice: 50, vatRate: 'HOOG' }, // 100
    { description: 'Laag', quantity: 1, unitPrice: 200, vatRate: 'LAAG' }, // 200
    { description: 'Hoog B', quantity: 1, unitPrice: 100, vatRate: 'HOOG' }, // 100
    { description: 'Nul', quantity: 1, unitPrice: 10, vatRate: 'NUL' }, // 10
  ])
  // Subtotaal = 100 + 200 + 100 + 10 = 410
  assert.equal(t.subtotal.toString(), '410')
  // Groepen in volgorde NUL, LAAG, HOOG
  assert.deepEqual(
    t.btwGroepen.map((g) => g.vatRate),
    ['NUL', 'LAAG', 'HOOG'],
  )
  const nul = t.btwGroepen.find((g) => g.vatRate === 'NUL')!
  const laag = t.btwGroepen.find((g) => g.vatRate === 'LAAG')!
  const hoog = t.btwGroepen.find((g) => g.vatRate === 'HOOG')!
  assert.equal(nul.grondslag.toString(), '10')
  assert.equal(nul.btwBedrag.toString(), '0')
  assert.equal(laag.grondslag.toString(), '200')
  assert.equal(laag.btwBedrag.toString(), '18') // 9% van 200
  assert.equal(hoog.grondslag.toString(), '200') // 100 + 100 gegroepeerd
  assert.equal(hoog.btwBedrag.toString(), '42') // 21% van 200
  // Totale btw = 0 + 18 + 42 = 60
  assert.equal(t.vatAmount.toString(), '60')
  // Totaal = 410 + 60 = 470
  assert.equal(t.total.toString(), '470')
})

test('btw per tarief gegroepeerd voorkomt afrondfouten per regel', () => {
  // Twee regels van 0.10 met 21%: per regel 0.021 → samen grondslag 0.20, btw 0.04.
  // Per-regel afronden zou 0.02 + 0.02 = 0.04 geven (toevallig gelijk), maar de
  // gegroepeerde aanpak blijft consistent voor alle gevallen.
  const t = berekenFactuurTotalen([
    { description: 'A', quantity: 1, unitPrice: '0.10', vatRate: 'HOOG' },
    { description: 'B', quantity: 1, unitPrice: '0.10', vatRate: 'HOOG' },
  ])
  assert.equal(t.subtotal.toString(), '0.2')
  assert.equal(t.btwGroepen[0].grondslag.toString(), '0.2')
  assert.equal(t.btwGroepen[0].btwBedrag.toString(), '0.04')
  assert.equal(t.total.toString(), '0.24')
})

test('lege regellijst levert nul-totalen', () => {
  const t = berekenFactuurTotalen([])
  assert.equal(t.subtotal.toString(), '0')
  assert.equal(t.vatAmount.toString(), '0')
  assert.equal(t.total.toString(), '0')
  assert.equal(t.btwGroepen.length, 0)
})

test('accepteert Prisma.Decimal-invoer', () => {
  const t = berekenFactuurTotalen([
    {
      description: 'Decimal',
      quantity: new Prisma.Decimal('1.5'),
      unitPrice: new Prisma.Decimal('10'),
      vatRate: 'LAAG',
    },
  ])
  assert.equal(t.subtotal.toString(), '15')
  assert.equal(t.vatAmount.toString(), '1.35') // 9% van 15
  assert.equal(t.total.toString(), '16.35')
})
