import { test } from 'node:test'
import assert from 'node:assert/strict'
import { heeftEigenaar } from './paardHelpers.ts'

// Unit-tests voor heeftEigenaar: de bron van waarheid voor de contract-poort.
// Bij STAL-eigendom is de stal de eigenaar (altijd waar); bij een particuliere
// eigenaar moet er een gekoppelde HorsePerson met isOwner = true zijn.
// Draaien: `node --experimental-strip-types --test src/features/paarden/paardHelpers.test.ts`.

test('STAL-eigendom → altijd een eigenaar, ook zonder gekoppelde personen', () => {
  assert.equal(heeftEigenaar({ eigendom: 'STAL', people: [] }), true)
})

test('STAL-eigendom → eigenaar, ongeacht of er bereiders gekoppeld zijn', () => {
  assert.equal(
    heeftEigenaar({ eigendom: 'STAL', people: [{ isOwner: false }] }),
    true,
  )
})

test('PARTICULIER zonder gekoppelde eigenaar → geen eigenaar', () => {
  assert.equal(heeftEigenaar({ eigendom: 'PARTICULIER', people: [] }), false)
})

test('PARTICULIER met alleen een bereider → geen eigenaar', () => {
  assert.equal(
    heeftEigenaar({ eigendom: 'PARTICULIER', people: [{ isOwner: false }] }),
    false,
  )
})

test('PARTICULIER met een gekoppelde eigenaar → eigenaar', () => {
  assert.equal(
    heeftEigenaar({
      eigendom: 'PARTICULIER',
      people: [{ isOwner: false }, { isOwner: true }],
    }),
    true,
  )
})
