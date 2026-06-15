import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { HorseRelatietype } from '@prisma/client'
import {
  matchContractVoorRelatietype,
  MATCH_INDICATIE,
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
