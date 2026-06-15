import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { HorseRelatietype } from '@prisma/client'
import {
  matchContractVoorRelatietype,
  MATCH_INDICATIE,
  bepaalContractPoort,
  POORT_REDEN,
} from './relatietypeMatching.ts'

// Unit-tests voor de centrale contract-matching-bron (#105). Pure functie, geen
// side effects — getest per relatietype-uitkomst conform de acceptatiecriteria.
// Draaien zonder extra runner: `node --experimental-strip-types --test
// src/features/contracten/relatietypeMatching.test.ts`.

test('pensionpaard → overschrijfbare STALLING/FULL_PENSION-voorselectie, geen indicatie', () => {
  const m = matchContractVoorRelatietype('PENSIONPAARD')
  assert.deepEqual(m.voorselectie, { family: 'STALLING', type: 'FULL_PENSION' })
  assert.equal(m.indicatie, null)
})

test('leasepaard → geen voorselectie, lease-indicatie (epic #59)', () => {
  const m = matchContractVoorRelatietype('LEASEPAARD')
  assert.equal(m.voorselectie, null)
  assert.equal(m.indicatie, MATCH_INDICATIE.LEASE)
})

test('lespaard → geen voorselectie, indicatie "geen/intern"', () => {
  const m = matchContractVoorRelatietype('LESPAARD')
  assert.equal(m.voorselectie, null)
  assert.equal(m.indicatie, MATCH_INDICATIE.LES)
})

test('trainingspaard → geen voorselectie, indicatie "opdracht/bemiddeling"', () => {
  const m = matchContractVoorRelatietype('TRAININGSPAARD')
  assert.equal(m.voorselectie, null)
  assert.equal(m.indicatie, MATCH_INDICATIE.OPDRACHT_BEMIDDELING)
})

test('verkooppaard → geen voorselectie, indicatie "opdracht/bemiddeling"', () => {
  const m = matchContractVoorRelatietype('VERKOOPPAARD')
  assert.equal(m.voorselectie, null)
  assert.equal(m.indicatie, MATCH_INDICATIE.OPDRACHT_BEMIDDELING)
})

test('overige relatietypes → neutraal (geen voorselectie, geen indicatie)', () => {
  const neutraal: HorseRelatietype[] = [
    'STALPAARD',
    'FOKPAARD',
    'OPFOKPAARD',
    'REVALIDATIEPAARD',
    'RUSTPAARD',
  ]
  for (const rt of neutraal) {
    const m = matchContractVoorRelatietype(rt)
    assert.equal(m.voorselectie, null, `${rt} mag geen voorselectie hebben`)
    assert.equal(m.indicatie, null, `${rt} mag geen indicatie hebben`)
  }
})

test('ontbrekend/leeg relatietype → neutraal', () => {
  for (const rt of [null, undefined] as const) {
    const m = matchContractVoorRelatietype(rt)
    assert.equal(m.voorselectie, null)
    assert.equal(m.indicatie, null)
  }
})

// ── Contract-poort: relatietype + stallingsvorm + eigenaar (#113) ─────────────

test('pensionpaard + volledig pension + eigenaar → toegestaan, FULL_PENSION', () => {
  const p = bepaalContractPoort({
    relatietype: 'PENSIONPAARD',
    stallingsvorm: 'VOLLEDIG_PENSION',
    heeftEigenaar: true,
  })
  assert.equal(p.toegestaan, true)
  assert.deepEqual(
    p.toegestaan ? p.voorselectie : null,
    { family: 'STALLING', type: 'FULL_PENSION' },
  )
})

test('pensionpaard + halfpension + eigenaar → toegestaan, HALF_PENSION', () => {
  const p = bepaalContractPoort({
    relatietype: 'PENSIONPAARD',
    stallingsvorm: 'HALFPENSION',
    heeftEigenaar: true,
  })
  assert.equal(p.toegestaan, true)
  assert.deepEqual(
    p.toegestaan ? p.voorselectie : null,
    { family: 'STALLING', type: 'HALF_PENSION' },
  )
})

test('ontbrekend relatietype → dicht met "stel relatietype in"', () => {
  const p = bepaalContractPoort({
    relatietype: null,
    stallingsvorm: 'VOLLEDIG_PENSION',
    heeftEigenaar: true,
  })
  assert.equal(p.toegestaan, false)
  assert.equal(p.toegestaan ? null : p.reden, POORT_REDEN.GEEN_RELATIETYPE)
})

test('ontbrekende stallingsvorm → dicht met "stel stallingsvorm in"', () => {
  const p = bepaalContractPoort({
    relatietype: 'PENSIONPAARD',
    stallingsvorm: null,
    heeftEigenaar: true,
  })
  assert.equal(p.toegestaan, false)
  assert.equal(p.toegestaan ? null : p.reden, POORT_REDEN.GEEN_STALLINGSVORM)
})

test('niet-ondersteunde stallingsvorm (weidestalling) → dicht', () => {
  for (const sv of ['WEIDESTALLING', 'PADDOCK', 'TIJDELIJK'] as const) {
    const p = bepaalContractPoort({
      relatietype: 'PENSIONPAARD',
      stallingsvorm: sv,
      heeftEigenaar: true,
    })
    assert.equal(p.toegestaan, false, `${sv} mag geen contract toelaten`)
    assert.equal(
      p.toegestaan ? null : p.reden,
      POORT_REDEN.STALLINGSVORM_NIET_ONDERSTEUND,
    )
  }
})

test('niet-pension relatietype → dicht met relatietype-reden', () => {
  // Lespaard kent een eigen indicatie; stalpaard valt op de generieke reden terug.
  const les = bepaalContractPoort({
    relatietype: 'LESPAARD',
    stallingsvorm: 'VOLLEDIG_PENSION',
    heeftEigenaar: true,
  })
  assert.equal(les.toegestaan, false)
  assert.equal(les.toegestaan ? null : les.reden, MATCH_INDICATIE.LES)

  const stal = bepaalContractPoort({
    relatietype: 'STALPAARD',
    stallingsvorm: 'VOLLEDIG_PENSION',
    heeftEigenaar: true,
  })
  assert.equal(stal.toegestaan, false)
  assert.equal(
    stal.toegestaan ? null : stal.reden,
    POORT_REDEN.RELATIETYPE_NIET_ONDERSTEUND,
  )
})

test('geen eigenaar → dicht met "koppel eerst een eigenaar"', () => {
  const p = bepaalContractPoort({
    relatietype: 'PENSIONPAARD',
    stallingsvorm: 'VOLLEDIG_PENSION',
    heeftEigenaar: false,
  })
  assert.equal(p.toegestaan, false)
  assert.equal(p.toegestaan ? null : p.reden, POORT_REDEN.GEEN_EIGENAAR)
})
