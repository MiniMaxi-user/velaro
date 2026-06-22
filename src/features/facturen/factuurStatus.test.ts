import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  STATUS_OVERGANGEN,
  isGeldigeStatusovergang,
  assertGeldigeStatusovergang,
  isOpenstaand,
  moetVervallen,
} from './factuurStatus.ts'

// Unit-tests voor de centrale factuur-statusmachine ([Fact 07] #152). Pure functies —
// getest op de toegestane/geweigerde overgangen, de openstaand-bepaling en de
// auto-VERVALLEN-conditie conform de acceptatiecriteria.

test('toegestane overgangen kloppen met de levenscyclus', () => {
  assert.deepEqual(STATUS_OVERGANGEN.CONCEPT, ['VERZONDEN', 'GEANNULEERD'])
  assert.deepEqual(STATUS_OVERGANGEN.VERZONDEN, ['BETAALD', 'VERVALLEN', 'GEANNULEERD'])
  assert.deepEqual(STATUS_OVERGANGEN.VERVALLEN, ['BETAALD', 'GEANNULEERD'])
  assert.deepEqual(STATUS_OVERGANGEN.BETAALD, [])
  assert.deepEqual(STATUS_OVERGANGEN.GEANNULEERD, [])
})

test('isGeldigeStatusovergang accepteert geldige en weigert ongeldige overgangen', () => {
  assert.equal(isGeldigeStatusovergang('VERZONDEN', 'BETAALD'), true)
  assert.equal(isGeldigeStatusovergang('VERVALLEN', 'BETAALD'), true)
  assert.equal(isGeldigeStatusovergang('VERZONDEN', 'GEANNULEERD'), true)
  // Een betaalde factuur kan niet meer bewegen.
  assert.equal(isGeldigeStatusovergang('BETAALD', 'VERZONDEN'), false)
  assert.equal(isGeldigeStatusovergang('BETAALD', 'GEANNULEERD'), false)
  // Geen terugweg uit geannuleerd.
  assert.equal(isGeldigeStatusovergang('GEANNULEERD', 'VERZONDEN'), false)
})

test('assertGeldigeStatusovergang gooit een nette NL-melding bij ongeldig', () => {
  assert.throws(
    () => assertGeldigeStatusovergang('BETAALD', 'VERZONDEN'),
    /betaald kan niet naar verzonden/,
  )
  assert.throws(
    () => assertGeldigeStatusovergang('BETAALD', 'GEANNULEERD'),
    /betaald kan niet naar geannuleerd/,
  )
  // Geldig: gooit niet.
  assert.doesNotThrow(() => assertGeldigeStatusovergang('VERZONDEN', 'BETAALD'))
})

test('isOpenstaand telt VERZONDEN en VERVALLEN', () => {
  assert.equal(isOpenstaand('VERZONDEN'), true)
  assert.equal(isOpenstaand('VERVALLEN'), true)
  assert.equal(isOpenstaand('BETAALD'), false)
  assert.equal(isOpenstaand('CONCEPT'), false)
  assert.equal(isOpenstaand('GEANNULEERD'), false)
})

test('moetVervallen: alleen VERZONDEN met verstreken vervaldatum', () => {
  const nu = new Date('2026-06-22T10:00:00Z')
  const gisteren = new Date('2026-06-21T00:00:00Z')
  const morgen = new Date('2026-06-23T00:00:00Z')

  assert.equal(moetVervallen('VERZONDEN', gisteren, nu), true)
  // Vandaag vervalt: nog niet te laat.
  assert.equal(moetVervallen('VERZONDEN', new Date('2026-06-22T00:00:00Z'), nu), false)
  assert.equal(moetVervallen('VERZONDEN', morgen, nu), false)
  assert.equal(moetVervallen('VERZONDEN', null, nu), false)
  // Andere statussen vervallen nooit automatisch.
  assert.equal(moetVervallen('BETAALD', gisteren, nu), false)
  assert.equal(moetVervallen('VERVALLEN', gisteren, nu), false)
  assert.equal(moetVervallen('CONCEPT', gisteren, nu), false)
})
