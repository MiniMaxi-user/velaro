import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normaliseerIban, isGeldigeIban } from './iban.ts'

// Unit-tests voor de IBAN-normalisatie & -validatie ([Fact 06] #151). IO-vrij/pure
// functies: controleert normalisatie (spaties weg, hoofdletters) en de ISO 13616
// mod-97-10-controle (geldige + ongeldige IBANs, landcode, lengte).

test('normaliseert door spaties te verwijderen en hoofdletters te maken', () => {
  assert.equal(normaliseerIban('nl91 abna 0417 1643 00'), 'NL91ABNA0417164300')
  assert.equal(normaliseerIban('  de89 3704 0044 0532 0130 00 '), 'DE89370400440532013000')
})

test('accepteert geldige IBANs (mod-97-check klopt)', () => {
  // Bekende, geldige testwaarden.
  assert.equal(isGeldigeIban('NL91ABNA0417164300'), true)
  assert.equal(isGeldigeIban('DE89370400440532013000'), true)
  assert.equal(isGeldigeIban('BE68539007547034'), true)
  assert.equal(isGeldigeIban('GB82WEST12345698765432'), true)
  // Genormaliseerd of niet, het resultaat is gelijk.
  assert.equal(isGeldigeIban('nl91 abna 0417 1643 00'), true)
})

test('weigert een IBAN met een verkeerd controlegetal (mod-97 faalt)', () => {
  // Laatste cijfer aangepast t.o.v. een geldige NL-IBAN.
  assert.equal(isGeldigeIban('NL91ABNA0417164301'), false)
})

test('weigert een IBAN met onjuiste lengte voor het land', () => {
  // NL hoort 18 tekens te zijn; deze is te kort.
  assert.equal(isGeldigeIban('NL91ABNA041716430'), false)
})

test('weigert een onbekende landcode', () => {
  assert.equal(isGeldigeIban('XX91ABNA0417164300'), false)
})

test('weigert lege of structureel ongeldige invoer', () => {
  assert.equal(isGeldigeIban(''), false)
  assert.equal(isGeldigeIban('ABCDEFGH'), false)
  assert.equal(isGeldigeIban('NL!1ABNA0417164300'), false)
})
