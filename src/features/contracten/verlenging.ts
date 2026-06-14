import type { Prisma } from '@prisma/client'
import { leesPrijsLooptijd, type Verlenging } from './prijsLooptijd'

// ── Verlenging (STAL-14, #87) ────────────────────────────────────────────────
// Stilzwijgende en expliciete verlenging van een actief/verlengd stallingscontract.
// Alle verleng-metadata wordt append-only in Contract.config bewaard (geen
// schemawijziging), in lijn met de statushistorie/versiegroep van eerdere stories.
//
// Twee productowner-beslissingen zijn hier verankerd:
//  1. De stilzwijgende verlenging wordt LAZY berekend (bij paginabezoek/actie), niet
//     via een cron/scheduler. De "verlengd"-melding is idempotent: een tweede bezoek
//     zonder nieuw verlengmoment verlengt niet opnieuw en maakt geen dubbele melding.
//  2. De nieuwe periode is de oorspronkelijke minimumperiode/looptijd uit het contract
//     (config.prijsLooptijd.looptijd.minimumperiode, met de bestaande einddatum als
//     startpunt), niet telkens +1 maand.

// ── Periode-parsing ──────────────────────────────────────────────────────────
// `minimumperiode` is vrije tekst (bv. "1 maand", "3 maanden", "1 jaar", "6 weken").
// We leiden er een aantal maanden uit af zodat het verlengmoment berekenbaar is.
// Bij ontbrekende/onleesbare invoer vallen we terug op 1 maand (de kleinste,
// veiligste periode); zo blijft een contract zonder expliciete minimumperiode toch
// per maand verlengbaar — conform de standaard "per maand/periode".
export const STANDAARD_PERIODE_MAANDEN = 1

export function periodeInMaanden(minimumperiode: string | null): number {
  if (!minimumperiode) return STANDAARD_PERIODE_MAANDEN
  const tekst = minimumperiode.toLowerCase()
  const match = tekst.match(/(\d+(?:[.,]\d+)?)/)
  const aantal = match ? Math.round(Number(match[1].replace(',', '.'))) : 1
  const veiligAantal = Number.isFinite(aantal) && aantal > 0 ? aantal : 1

  if (tekst.includes('jaar')) return veiligAantal * 12
  if (tekst.includes('week') || tekst.includes('weken')) {
    // Weken naar (afgeronde) maanden; minimaal 1 maand zodat er altijd voortgang is.
    return Math.max(1, Math.round((veiligAantal * 7) / 30))
  }
  if (tekst.includes('dag') || tekst.includes('dagen')) {
    return Math.max(1, Math.round(veiligAantal / 30))
  }
  // Default-eenheid: maanden.
  return veiligAantal
}

// Voegt een aantal kalendermaanden toe aan een datum. Houdt rekening met
// maanden van verschillende lengte (clamp naar de laatste dag van de doelmaand).
export function voegMaandenToe(datum: Date, maanden: number): Date {
  const resultaat = new Date(datum.getTime())
  const dag = resultaat.getDate()
  resultaat.setDate(1)
  resultaat.setMonth(resultaat.getMonth() + maanden)
  const laatsteDagDoelmaand = new Date(
    resultaat.getFullYear(),
    resultaat.getMonth() + 1,
    0,
  ).getDate()
  resultaat.setDate(Math.min(dag, laatsteDagDoelmaand))
  return resultaat
}

// ── Metadata in Contract.config ──────────────────────────────────────────────
// Append-only log van doorgevoerde verlengingen. Elke entry beschrijft één
// verlengmoment: de oude en de nieuwe einddatum (ISO yyyy-mm-dd), het moment en de
// modus. `automatisch` is true bij stilzwijgende (lazy) verlenging.
export type VerlengingEntry = {
  modus: Verlenging
  vanEinddatum: string | null
  naarEinddatum: string
  op: string // ISO-timestamp
  automatisch: boolean
}

// Per partij bijgehouden bevestiging bij expliciete verlenging. De sleutel is de
// "ronde" (de huidige einddatum waarvoor wordt verlengd), zodat een nieuwe periode
// opnieuw bevestiging van beide partijen vereist.
export type VerlengBevestiging = {
  ronde: string // de einddatum (ISO) waarvoor wordt bevestigd
  doorStal: boolean
  doorEigenaar: boolean
}

// Leest de verleng-historie defensief uit het config-JSON.
export function leesVerlengHistorie(config: Prisma.JsonValue | null): VerlengingEntry[] {
  if (!config || typeof config !== 'object' || Array.isArray(config)) return []
  const root = (config as Record<string, unknown>).verlengingen
  if (!Array.isArray(root)) return []
  return root.filter(
    (e): e is VerlengingEntry =>
      !!e &&
      typeof e === 'object' &&
      typeof (e as Record<string, unknown>).modus === 'string' &&
      typeof (e as Record<string, unknown>).naarEinddatum === 'string' &&
      typeof (e as Record<string, unknown>).op === 'string',
  )
}

// Leest de openstaande bevestig-ronde (expliciete verlenging) defensief uit config.
export function leesVerlengBevestiging(
  config: Prisma.JsonValue | null,
): VerlengBevestiging | null {
  if (!config || typeof config !== 'object' || Array.isArray(config)) return null
  const root = (config as Record<string, unknown>).verlengBevestiging
  if (!root || typeof root !== 'object' || Array.isArray(root)) return null
  const r = root as Record<string, unknown>
  if (typeof r.ronde !== 'string') return null
  return {
    ronde: r.ronde,
    doorStal: r.doorStal === true,
    doorEigenaar: r.doorEigenaar === true,
  }
}

// ── Looptijd-mijlpaal ────────────────────────────────────────────────────────
// De "huidige einddatum" van een actief/verlengd contract: het startpunt voor de
// eerstvolgende verlenging. Bij de eerste verlenging is dat de looptijd-einddatum
// (STAL-05); daarna de naarEinddatum van de laatste verlenging.
export function huidigeEinddatum(config: Prisma.JsonValue | null): Date | null {
  const historie = leesVerlengHistorie(config)
  if (historie.length > 0) {
    const laatste = historie[historie.length - 1]
    const datum = new Date(laatste.naarEinddatum)
    return Number.isNaN(datum.getTime()) ? null : datum
  }
  const { looptijd } = leesPrijsLooptijd(config)
  if (!looptijd.einddatum) return null
  const datum = new Date(looptijd.einddatum)
  return Number.isNaN(datum.getTime()) ? null : datum
}

// De einddatum na één verlenging: huidige einddatum + één oorspronkelijke
// minimumperiode/looptijd. Null wanneer er geen huidige einddatum bekend is.
export function volgendeEinddatum(config: Prisma.JsonValue | null): Date | null {
  const huidig = huidigeEinddatum(config)
  if (!huidig) return null
  const { looptijd } = leesPrijsLooptijd(config)
  return voegMaandenToe(huidig, periodeInMaanden(looptijd.minimumperiode))
}

// De verlengingsmodus van een contract (STILZWIJGEND/EXPLICIET/GEEN).
export function verlengingsModus(config: Prisma.JsonValue | null): Verlenging {
  return leesPrijsLooptijd(config).looptijd.verlenging
}

// Is het verlengmoment bereikt? True wanneer de huidige einddatum op of vóór
// `vandaag` ligt. Een contract zonder bekende einddatum (onbepaalde tijd) kent
// geen verlengmoment en levert false op.
export function verlengmomentBereikt(
  config: Prisma.JsonValue | null,
  vandaag: Date = new Date(),
): boolean {
  const huidig = huidigeEinddatum(config)
  if (!huidig) return false
  return huidig.getTime() <= vandaag.getTime()
}

// Bepaalt of een stilzwijgend contract LAZY verlengd moet worden. Alleen voor de
// STILZWIJGEND-modus en alleen wanneer het verlengmoment bereikt is. Idempotentie
// wordt afgedwongen door de aanroeper (statuswissel + append-only entry); deze
// helper kijkt puur naar de looptijd-mijlpaal.
export function moetStilzwijgendVerlengen(
  config: Prisma.JsonValue | null,
  vandaag: Date = new Date(),
): boolean {
  if (verlengingsModus(config) !== 'STILZWIJGEND') return false
  return verlengmomentBereikt(config, vandaag)
}

// Is voor een actief/verlengd contract een expliciete verleng-bevestiging mogelijk?
// True bij EXPLICIET-modus zodra het verlengmoment binnen `dagen` (default 30) nadert
// of al bereikt is — dan kunnen beide partijen alvast bevestigen.
export function kanExplicietBevestigen(
  config: Prisma.JsonValue | null,
  vandaag: Date = new Date(),
  dagen = 30,
): boolean {
  if (verlengingsModus(config) !== 'EXPLICIET') return false
  const huidig = huidigeEinddatum(config)
  if (!huidig) return false
  const verschilMs = huidig.getTime() - vandaag.getTime()
  return verschilMs <= dagen * 24 * 60 * 60 * 1000
}
