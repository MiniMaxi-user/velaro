import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { HorseRelatietype } from '@prisma/client'
import {
  matchContractVoorRelatietype,
  MATCH_INDICATIE,
  bepaalContractPoort,
  bepaalContractOpties,
  POORT_REDEN,
  LEASE_POORT_REDEN,
} from './relatietypeMatching.ts'
import { LEASE_TYPE_OPTIES } from '../lease/leaseHelpers.ts'

// Unit-tests voor de centrale contract-matching-bron (#105). Pure functie, geen
// side effects — getest per relatietype-uitkomst conform de acceptatiecriteria.
// Draaien zonder extra runner: `node --experimental-strip-types --test
// src/features/contracten/relatietypeMatching.test.ts`.

test('pensionpaard → overschrijfbare STALLING/FULL_PENSION-voorselectie, geen indicatie', () => {
  const m = matchContractVoorRelatietype('PENSIONPAARD')
  assert.deepEqual(m.voorselectie, { family: 'STALLING', type: 'FULL_PENSION' })
  assert.equal(m.indicatie, null)
})

test('leasepaard → geen stalling-voorselectie, geen indicatie (lease = eigen familie)', () => {
  const m = matchContractVoorRelatietype('LEASEPAARD')
  assert.equal(m.voorselectie, null)
  assert.equal(m.indicatie, null)
})

test('verouderde lease-indicatie (epic #59) bestaat niet meer', () => {
  assert.equal('LEASE' in MATCH_INDICATIE, false)
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

// ── Per-optie poort: dropdown met stalling + alle leasevormen ([Unify 03] #129) ──

// Helper: vind een optie op family + type in de gegroepeerde uitkomst.
function vindOptie(
  groepen: ReturnType<typeof bepaalContractOpties>,
  family: string,
  type: string,
) {
  const groep = groepen.find((g) => g.family === family)
  return groep?.opties.find((o) => o.type === type)
}

test('opties → twee groepen (Stalling + Lease) met alle typen', () => {
  const groepen = bepaalContractOpties({
    relatietype: 'PENSIONPAARD',
    stallingsvorm: 'VOLLEDIG_PENSION',
    heeftEigenaar: true,
  })
  assert.deepEqual(
    groepen.map((g) => g.family),
    ['STALLING', 'LEASE'],
  )
  const stalling = groepen.find((g) => g.family === 'STALLING')!
  assert.deepEqual(
    stalling.opties.map((o) => o.type),
    ['FULL_PENSION', 'HALF_PENSION'],
  )
  const lease = groepen.find((g) => g.family === 'LEASE')!
  assert.deepEqual(
    lease.opties.map((o) => o.type),
    LEASE_TYPE_OPTIES,
  )
})

test('stalling-optie identiek aan poort: volledig pension open, halfpension dicht', () => {
  const groepen = bepaalContractOpties({
    relatietype: 'PENSIONPAARD',
    stallingsvorm: 'VOLLEDIG_PENSION',
    heeftEigenaar: true,
  })
  const full = vindOptie(groepen, 'STALLING', 'FULL_PENSION')!
  assert.equal(full.toegestaan, true)
  assert.deepEqual(
    full.toegestaan ? full.voorselectie : null,
    { family: 'STALLING', type: 'FULL_PENSION' },
  )
  // De stallingsvorm van het paard is volledig pension, dus de halfpension-optie
  // hoort niet bij dit paard en is dicht — geen regressie t.o.v. de oude knop.
  const half = vindOptie(groepen, 'STALLING', 'HALF_PENSION')!
  assert.equal(half.toegestaan, false)
  assert.equal(
    half.toegestaan ? null : half.reden,
    POORT_REDEN.STALLINGSVORM_NIET_ONDERSTEUND,
  )
})

test('stalling-optie: niet-pension relatietype → beide stalling-opties dicht met reden', () => {
  const groepen = bepaalContractOpties({
    relatietype: 'LESPAARD',
    stallingsvorm: 'VOLLEDIG_PENSION',
    heeftEigenaar: true,
  })
  const full = vindOptie(groepen, 'STALLING', 'FULL_PENSION')!
  const half = vindOptie(groepen, 'STALLING', 'HALF_PENSION')!
  assert.equal(full.toegestaan, false)
  assert.equal(half.toegestaan, false)
  assert.equal(full.toegestaan ? null : full.reden, MATCH_INDICATIE.LES)
  assert.equal(half.toegestaan ? null : half.reden, MATCH_INDICATIE.LES)
})

test('lease-opties: toegestaan zodra er een eigenaar gekoppeld is', () => {
  const groepen = bepaalContractOpties({
    relatietype: 'LEASEPAARD',
    stallingsvorm: null,
    heeftEigenaar: true,
  })
  const lease = groepen.find((g) => g.family === 'LEASE')!
  for (const optie of lease.opties) {
    assert.equal(optie.toegestaan, true, `${optie.type} hoort toegestaan te zijn`)
    assert.deepEqual(
      optie.toegestaan ? optie.voorselectie : null,
      { family: 'LEASE', type: optie.type },
      `${optie.type} hoort een lease-voorselectie te hebben`,
    )
  }
})

test('lease-opties: geen eigenaar → alle leasevormen dicht met eigenaar-reden', () => {
  const groepen = bepaalContractOpties({
    relatietype: 'PENSIONPAARD',
    stallingsvorm: 'VOLLEDIG_PENSION',
    heeftEigenaar: false,
  })
  const lease = groepen.find((g) => g.family === 'LEASE')!
  for (const optie of lease.opties) {
    assert.equal(optie.toegestaan, false, `${optie.type} hoort dicht te zijn`)
    assert.equal(
      optie.toegestaan ? null : optie.reden,
      LEASE_POORT_REDEN.GEEN_EIGENAAR,
    )
  }
})
