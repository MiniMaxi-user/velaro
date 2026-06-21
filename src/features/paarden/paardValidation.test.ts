import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeChipNumber, validateHorseFields } from './paardValidation.ts'

// Unit-tests voor de paard-formuliervalidatie (#136). Pure functies, geen side
// effects — dekken het veldfout-mechanisme (verplicht Naam-veld + 15-cijfer
// chipnummer) zoals de client dit bij het juiste veld toont.
// Draaien: `npm test` (of `node --experimental-strip-types --test
// src/features/paarden/paardValidation.test.ts`).

test('normalizeChipNumber: spaties en streepjes worden verwijderd', () => {
  assert.equal(normalizeChipNumber('528 246-000 123456'), '528246000123456')
})

test('normalizeChipNumber: lege of whitespace-invoer wordt null', () => {
  assert.equal(normalizeChipNumber(''), null)
  assert.equal(normalizeChipNumber('   '), null)
  assert.equal(normalizeChipNumber(null), null)
  assert.equal(normalizeChipNumber(undefined), null)
})

test('normalizeChipNumber: niet-cijfers eruit, alleen cijfers blijven over', () => {
  assert.equal(normalizeChipNumber('NL-528a246'), '528246')
})

test('validateHorseFields: leeg Naam-veld → veldfout op name', () => {
  const err = validateHorseFields({ name: '', chipNumber: null })
  assert.deepEqual(err, { field: 'name', message: 'Naam is verplicht' })
})

test('validateHorseFields: whitespace-naam telt als leeg → veldfout op name', () => {
  const err = validateHorseFields({ name: '   ', chipNumber: '528246000123456' })
  assert.equal(err?.field, 'name')
})

test('validateHorseFields: chipnummer korter dan 15 cijfers → veldfout op chipNumber', () => {
  const err = validateHorseFields({ name: 'Shadowfax', chipNumber: '12345' })
  assert.equal(err?.field, 'chipNumber')
  assert.match(err!.message, /exact 15 cijfers/)
})

test('validateHorseFields: chipnummer langer dan 15 cijfers → veldfout op chipNumber', () => {
  const err = validateHorseFields({ name: 'Shadowfax', chipNumber: '5282460001234567' })
  assert.equal(err?.field, 'chipNumber')
})

test('validateHorseFields: geldige naam zonder chipnummer → geen fout', () => {
  assert.equal(validateHorseFields({ name: 'Shadowfax', chipNumber: null }), null)
})

test('validateHorseFields: geldige naam + exact 15 cijfers → geen fout', () => {
  assert.equal(
    validateHorseFields({ name: 'Shadowfax', chipNumber: '528246000123456' }),
    null
  )
})

test('naam wint van chipnummer-fout (eerste foutieve veld is name)', () => {
  // Beide ongeldig: Naam-melding heeft voorrang zodat de scroll/focus naar het
  // eerste veld in het formulier gaat.
  const err = validateHorseFields({ name: '', chipNumber: '123' })
  assert.equal(err?.field, 'name')
})
