import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Prisma } from '@prisma/client'
import {
  btwPercentageNaarVatRate,
  bedragExclBtw,
  voorvulRegelsUitContractConfig,
} from './contractVoorvullen.ts'
import { berekenFactuurTotalen } from './berekeningen.ts'

// Unit-tests voor de voorvul-helper ([Fact 04] #149). Pure afleidlogica met
// Prisma.Decimal: btw-mapping, INCL→EXCL terugrekenen en de bronregels per
// contract-familie conform de acceptatiecriteria.

test('btwPercentageNaarVatRate mapt 0/9/21 op NUL/LAAG/HOOG', () => {
  assert.equal(btwPercentageNaarVatRate(0), 'NUL')
  assert.equal(btwPercentageNaarVatRate(9), 'LAAG')
  assert.equal(btwPercentageNaarVatRate(21), 'HOOG')
})

test('btwPercentageNaarVatRate mapt een afwijkend percentage op het dichtstbijzijnde tarief', () => {
  assert.equal(btwPercentageNaarVatRate(6), 'LAAG') // dichter bij 9 dan bij 0
  assert.equal(btwPercentageNaarVatRate(19), 'HOOG') // dichter bij 21 dan bij 9
  assert.equal(btwPercentageNaarVatRate(null), 'HOOG') // onbekend → 21%
})

test('bedragExclBtw: EXCL laat het bedrag ongewijzigd', () => {
  assert.equal(bedragExclBtw(100, 'EXCL', 21).toString(), '100')
})

test('bedragExclBtw: INCL rekent terug naar excl. btw (op 2 decimalen)', () => {
  // 121 incl. 21% → 100 excl.
  assert.equal(bedragExclBtw(121, 'INCL', 21).toString(), '100')
  // 109 incl. 9% → 100 excl.
  assert.equal(bedragExclBtw(109, 'INCL', 9).toString(), '100')
})

test('bedragExclBtw INCL: regel-excl. + btw komt weer op het incl.-bedrag uit (2 dec.)', () => {
  const exclBtw = bedragExclBtw(250, 'INCL', 21) // 206.61 (afgerond)
  const totalen = berekenFactuurTotalen([
    { description: 'Stalling (pensionprijs)', quantity: 1, unitPrice: exclBtw, vatRate: 'HOOG' },
  ])
  // 206.61 + 21% (43.39) = 250.00
  assert.equal(totalen.total.toString(), '250')
})

test('bedragExclBtw: 0% of null laat het bedrag ongewijzigd, ook bij INCL', () => {
  assert.equal(bedragExclBtw(100, 'INCL', 0).toString(), '100')
  assert.equal(bedragExclBtw(100, 'INCL', null).toString(), '100')
})

test('stalling: pensionprijs (INCL) + extra diensten met frequentie in de description', () => {
  const config: Prisma.JsonValue = {
    prijsLooptijd: {
      prijs: { bedrag: 363, btwModus: 'INCL', btwPercentage: 21 },
    },
    extraDiensten: {
      posten: [
        { omschrijving: 'Boxservice', bedrag: 25, frequentie: 'PER_MAAND' },
        { omschrijving: 'Solarium', bedrag: 10, frequentie: 'PER_KEER' },
      ],
    },
  }
  const regels = voorvulRegelsUitContractConfig('STALLING', config)
  assert.equal(regels.length, 3)

  const [pension, boxservice, solarium] = regels
  assert.equal(pension.description, 'Stalling (pensionprijs)')
  assert.equal(pension.quantity, 1)
  assert.equal(pension.unitPrice.toString(), '300') // 363 / 1.21
  assert.equal(pension.vatRate, 'HOOG')

  assert.equal(boxservice.description, 'Boxservice (per maand)')
  assert.equal(boxservice.unitPrice.toString(), '25')
  assert.equal(boxservice.vatRate, 'HOOG') // gelijk aan de pensionprijs

  assert.equal(solarium.description, 'Solarium (per keer)')
  assert.equal(solarium.unitPrice.toString(), '10')
})

test('stalling: lage btw-tarief (9%) van de pensionprijs werkt door op extra diensten', () => {
  const config: Prisma.JsonValue = {
    prijsLooptijd: {
      prijs: { bedrag: 200, btwModus: 'EXCL', btwPercentage: 9 },
    },
    extraDiensten: { posten: [{ omschrijving: 'Mest', bedrag: 15, frequentie: 'PER_MAAND' }] },
  }
  const regels = voorvulRegelsUitContractConfig('STALLING', config)
  assert.equal(regels[0].vatRate, 'LAAG')
  assert.equal(regels[0].unitPrice.toString(), '200')
  assert.equal(regels[1].vatRate, 'LAAG')
})

test('stalling: zonder ingevulde pensionprijs geen pension-regel, wel extra diensten', () => {
  const config: Prisma.JsonValue = {
    prijsLooptijd: { prijs: { bedrag: null, btwModus: 'INCL', btwPercentage: 21 } },
    extraDiensten: { posten: [{ omschrijving: 'Mest', bedrag: 15, frequentie: 'PER_MAAND' }] },
  }
  const regels = voorvulRegelsUitContractConfig('STALLING', config)
  assert.equal(regels.length, 1)
  assert.equal(regels[0].description, 'Mest (per maand)')
})

test('lease: leasevergoeding (excl. btw, 21%) + alleen LEASER-posten', () => {
  const config: Prisma.JsonValue = {
    lease: {
      kosten: {
        vergoeding: 150,
        btw: true,
        posten: {
          hoefsmid: { betaler: 'LEASER', bedrag: 40, onvoorzien: false },
          dierenarts: { betaler: 'EIGENAAR', bedrag: 60, onvoorzien: false },
          voer: { betaler: 'LEASER', bedrag: 30, onvoorzien: false },
          stalling: { betaler: 'EIGENAAR', bedrag: 200, onvoorzien: false },
        },
      },
    },
  }
  const regels = voorvulRegelsUitContractConfig('LEASE', config)
  // Vergoeding + hoefsmid + voer = 3 regels; eigenaarsposten niet meegenomen.
  assert.equal(regels.length, 3)

  const vergoeding = regels[0]
  assert.equal(vergoeding.description, 'Leasevergoeding')
  assert.equal(vergoeding.unitPrice.toString(), '150')
  assert.equal(vergoeding.vatRate, 'HOOG')

  const beschrijvingen = regels.map((r) => r.description)
  assert.deepEqual(beschrijvingen, ['Leasevergoeding', 'Hoefsmid', 'Voer'])
  assert.ok(regels.every((r) => r.vatRate === 'HOOG'))
  assert.ok(!beschrijvingen.includes('Dierenarts'))
  assert.ok(!beschrijvingen.includes('Stalling'))
})

test('lease: LEASER-post zonder bedrag wordt overgeslagen', () => {
  const config: Prisma.JsonValue = {
    lease: {
      kosten: {
        vergoeding: 100,
        btw: true,
        posten: {
          hoefsmid: { betaler: 'LEASER', bedrag: null, onvoorzien: false },
        },
      },
    },
  }
  const regels = voorvulRegelsUitContractConfig('LEASE', config)
  assert.equal(regels.length, 1)
  assert.equal(regels[0].description, 'Leasevergoeding')
})

test('lege/onbekende config levert een lege regellijst (geen crash)', () => {
  assert.deepEqual(voorvulRegelsUitContractConfig('STALLING', null), [])
  assert.deepEqual(voorvulRegelsUitContractConfig('LEASE', undefined), [])
  assert.deepEqual(voorvulRegelsUitContractConfig('STALLING', {}), [])
})
