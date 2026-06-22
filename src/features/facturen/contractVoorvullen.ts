import { Prisma } from '@prisma/client'
import type { ContractFamily, VatRate } from '@prisma/client'
import { leesPrijsLooptijd } from '../contracten/prijsLooptijd.ts'
import { leesExtraDiensten, frequentieLabel } from '../contracten/bijlagenDiensten.ts'
import { leesLeaseKosten, KOSTENPOSTEN } from '../lease/leaseKostenConfig.ts'
import type { RuweFactuurregel } from './berekeningen.ts'

// ── Factuurregels voorvullen uit het contract ([Fact 04] #149) ───────────────
// Pure, test-vriendelijke afleidlogica: uit een ingelezen Contract-config (JSON op
// Contract.config) wordt een lijst RuweFactuurregel[] gemaakt die de server-action
// (actions.ts → voorvulRegelsUitContract) als gewone, bewerkbare InvoiceLine-regels
// wegschrijft. De optelling/totalen blijven volledig in berekeningen.ts; deze module
// dupliceert die niet. Alle bedragen worden met Prisma.Decimal gerekend (geen floats,
// CLAUDE.md/Fact 01-conventie); de stuksprijzen worden op 2 decimalen afgerond.
//
// Hergebruik (niet dupliceren):
//   - Stalling: leesPrijsLooptijd + leesExtraDiensten (contracten/*).
//   - Lease:    leesLeaseKosten (het kosten-blok op Contract.config.lease.kosten,
//               dezelfde bron-van-waarheid die leesLeaseContractConfig intern voedt)
//               + KOSTENPOSTEN-labels; lease-btw is altijd 21% (HOOG), geen 9% bij lease.

const TWEE_DECIMALEN = 2

function afronden(waarde: Prisma.Decimal): Prisma.Decimal {
  return waarde.toDecimalPlaces(TWEE_DECIMALEN)
}

/**
 * Mapt een btw-percentage uit het contract op een VatRate-enumwaarde. De enum kent
 * enkel 0/9/21%; een afwijkend percentage wordt op het dichtstbijzijnde toegestane
 * tarief gemapt (de regel blijft daarna bewerkbaar). null/onbekend → HOOG (21%), het
 * gangbare standaardtarief.
 */
export function btwPercentageNaarVatRate(percentage: number | null): VatRate {
  if (percentage === null || !Number.isFinite(percentage)) return 'HOOG'
  const opties: { rate: VatRate; pct: number }[] = [
    { rate: 'NUL', pct: 0 },
    { rate: 'LAAG', pct: 9 },
    { rate: 'HOOG', pct: 21 },
  ]
  let beste = opties[opties.length - 1]
  let kleinsteAfstand = Number.POSITIVE_INFINITY
  for (const optie of opties) {
    const afstand = Math.abs(optie.pct - percentage)
    if (afstand < kleinsteAfstand) {
      kleinsteAfstand = afstand
      beste = optie
    }
  }
  return beste.rate
}

/**
 * Rekent een contractbedrag om naar de stuksprijs excl. btw, op 2 decimalen afgerond.
 * Bij btwModus = INCL wordt teruggerekend (bedrag / (1 + pct/100)); bij EXCL is het
 * bedrag al de excl.-btw-stuksprijs. Een percentage van 0 (of null) laat het bedrag
 * ongewijzigd.
 */
export function bedragExclBtw(
  bedrag: number,
  btwModus: 'INCL' | 'EXCL',
  btwPercentage: number | null,
): Prisma.Decimal {
  const basis = new Prisma.Decimal(bedrag)
  if (btwModus !== 'INCL') {
    return afronden(basis)
  }
  const pct = btwPercentage ?? 0
  if (pct <= 0) {
    return afronden(basis)
  }
  const deler = new Prisma.Decimal(1).add(new Prisma.Decimal(pct).div(100))
  return afronden(basis.div(deler))
}

// ── Stalling ──────────────────────────────────────────────────────────────────
// Pensionprijs (1 regel) + per extra dienst/prijslijst-post 1 regel. Het btw-tarief
// van de extra diensten volgt het tarief van de pensionprijs (het contract kent per
// dienst geen apart btw-veld); de regel blijft daarna bewerkbaar. De frequentie wordt
// in de description vermeld zodat de stal weet waar de regel vandaan komt.
function voorvulStalling(config: Prisma.JsonValue | null | undefined): RuweFactuurregel[] {
  const { prijs } = leesPrijsLooptijd(config)
  const { posten } = leesExtraDiensten(config)
  const regels: RuweFactuurregel[] = []

  const vatRate = btwPercentageNaarVatRate(prijs.btwPercentage)

  if (prijs.bedrag !== null) {
    regels.push({
      description: 'Stalling (pensionprijs)',
      quantity: 1,
      unitPrice: bedragExclBtw(prijs.bedrag, prijs.btwModus, prijs.btwPercentage),
      vatRate,
    })
  }

  for (const post of posten) {
    regels.push({
      description: `${post.omschrijving} (${frequentieLabel(post.frequentie).toLowerCase()})`,
      quantity: 1,
      unitPrice: afronden(new Prisma.Decimal(post.bedrag)),
      vatRate,
    })
  }

  return regels
}

// ── Lease ───────────────────────────────────────────────────────────────────
// Leasevergoeding (1 regel, excl. btw) + per kostenpost met betaler LEASER (en een
// ingevuld bedrag) 1 regel. Posten van de eigenaar worden niet voorgevuld (die
// factureert de stal niet aan de leaser). Lease-btw is altijd 21% (HOOG).
function voorvulLease(config: Prisma.JsonValue | null | undefined): RuweFactuurregel[] {
  // Het kosten-blok staat op Contract.config.lease.kosten; leesLeaseKosten leest het
  // `.kosten`-veld van het meegegeven object (defensief, lege defaults bij ontbreken) —
  // exact zoals leesLeaseContractConfig het intern voedt.
  const leaseRaw =
    config && typeof config === 'object' && !Array.isArray(config)
      ? (config as Record<string, Prisma.JsonValue>).lease
      : undefined
  const kosten = leesLeaseKosten(leaseRaw)
  const regels: RuweFactuurregel[] = []

  if (kosten.vergoeding !== null) {
    regels.push({
      description: 'Leasevergoeding',
      quantity: 1,
      unitPrice: afronden(new Prisma.Decimal(kosten.vergoeding)),
      vatRate: 'HOOG',
    })
  }

  for (const def of KOSTENPOSTEN) {
    const post = kosten.posten[def.key]
    if (!post || post.betaler !== 'LEASER' || post.bedrag === null) continue
    regels.push({
      description: def.label,
      quantity: 1,
      unitPrice: afronden(new Prisma.Decimal(post.bedrag)),
      vatRate: 'HOOG',
    })
  }

  return regels
}

/**
 * Leidt de voor te vullen factuurregels af uit het gekoppelde contract. Kiest de
 * bronregels op basis van de contract-familie (STALLING vs LEASE). Onbekende/lege
 * config valt via de defensieve readers terug op lege defaults → lege regellijst,
 * geen crash. De regels zijn gewone RuweFactuurregel[]: na het wegschrijven identiek
 * aan handmatige regels (geen apart regeltype, geen schema-wijziging).
 */
export function voorvulRegelsUitContractConfig(
  family: ContractFamily,
  config: Prisma.JsonValue | null | undefined,
): RuweFactuurregel[] {
  if (family === 'LEASE') {
    return voorvulLease(config)
  }
  return voorvulStalling(config)
}
