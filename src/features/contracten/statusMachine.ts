import type { ContractStatus } from '@prisma/client'

// ── Statusmachine voor contracten (STAL-08, #81) ─────────────────────────────
// Eén bron van waarheid voor de toegestane statusovergangen van een contract.
// STAL-08 (#81) introduceerde CONCEPT → AANGEBODEN; STAL-09 (#82) voegt het
// besluit van de eigenaar toe: AANGEBODEN → ACTIEF (accepteren; v1 in één stap
// rechtstreeks ACTIEF) en AANGEBODEN → AFGEWEZEN (afwijzen). STAL-11 (#84) voegt
// versionering toe: AANGEBODEN → VERVANGEN en AFGEWEZEN → VERVANGEN (de vorige
// versie wordt vervangen door een nieuwe). De map is zo opgezet dat latere stories
// (beëindigen) er overgangen aan toevoegen zonder de aanroepers te wijzigen.

// Toegestane vervolgstatussen per huidige status. Een lege lijst betekent dat er
// (nog) geen overgang vanaf die status gedefinieerd is.
export const TOEGESTANE_OVERGANGEN: Record<ContractStatus, ContractStatus[]> = {
  CONCEPT: ['AANGEBODEN'],
  AANGEBODEN: ['ACTIEF', 'AFGEWEZEN', 'VERVANGEN'],
  GEACCEPTEERD: [],
  // STAL-14 (#87): een actief contract kan verlengen (stilzwijgend of expliciet).
  // STAL-15 (#88): een actief contract kan opgeschort worden, opgezegd worden
  // (OPZEGGING_LOOPT) of van rechtswege direct beëindigd worden (overlijden paard).
  ACTIEF: ['VERLENGD', 'OPGESCHORT', 'OPZEGGING_LOOPT', 'BEEINDIGD'],
  // STAL-15 (#88): een opgeschort contract keert (lazy, op de einddatum) terug naar
  // ACTIEF.
  OPGESCHORT: ['ACTIEF'],
  // STAL-15 (#88): een lopende opzegging wordt op de berekende einddatum (lazy)
  // beëindigd.
  OPZEGGING_LOOPT: ['BEEINDIGD'],
  // STAL-14 (#87): een al verlengd contract kan opnieuw verlengen.
  // STAL-15 (#88): ook een verlengd contract kent dezelfde beëindigings-levensloop
  // als een actief contract (opschorten, opzeggen, beëindigen).
  VERLENGD: ['VERLENGD', 'OPGESCHORT', 'OPZEGGING_LOOPT', 'BEEINDIGD'],
  BEEINDIGD: [],
  VERLOPEN: [],
  GEANNULEERD: [],
  AFGEWEZEN: ['VERVANGEN'],
  VERVANGEN: [],
}

// Geeft `true` wanneer de overgang van `van` naar `naar` is toegestaan.
export function isOvergangToegestaan(
  van: ContractStatus,
  naar: ContractStatus,
): boolean {
  return TOEGESTANE_OVERGANGEN[van]?.includes(naar) ?? false
}

// Valideert een statusovergang en gooit een fout wanneer die niet is toegestaan.
// Wordt server-side gebruikt zodat een niet-toegestane overgang altijd geweigerd
// wordt, ongeacht de client.
export function assertOvergangToegestaan(
  van: ContractStatus,
  naar: ContractStatus,
): void {
  if (!isOvergangToegestaan(van, naar)) {
    throw new Error(
      `Statusovergang van ${van} naar ${naar} is niet toegestaan.`,
    )
  }
}

// ── Statushistorie in Contract.config (geen schemawijziging) ─────────────────
// Append-only log van statusovergangen. Het aanbiedmoment is de eerste entry
// { van: "CONCEPT", naar: "AANGEBODEN", op, doorUserId }.
export type StatusHistorieEntry = {
  van: ContractStatus
  naar: ContractStatus
  op: string // ISO-timestamp
  doorUserId: string
}

// ── Versiegroep in Contract.config (geen schemawijziging) ────────────────────
// Versies van eenzelfde contract worden gegroepeerd via een gedeelde sleutel in
// config.versieGroepId (STAL-11, #84). De groep-id is de id van het oorspronkelijke
// (eerste) contract; elke vervangende versie erft dezelfde groep-id. Zo kan de
// versiehistorie worden getoond zonder een apart ContractVersion-model.
export function leesVersieGroepId(config: unknown): string | null {
  if (!config || typeof config !== 'object' || Array.isArray(config)) return null
  const waarde = (config as Record<string, unknown>).versieGroepId
  return typeof waarde === 'string' && waarde.length > 0 ? waarde : null
}

// Leest de statushistorie defensief uit het config-JSON van een contract.
export function leesStatusHistorie(
  config: unknown,
): StatusHistorieEntry[] {
  if (!config || typeof config !== 'object' || Array.isArray(config)) return []
  const root = (config as Record<string, unknown>).statusHistorie
  if (!Array.isArray(root)) return []
  return root.filter(
    (e): e is StatusHistorieEntry =>
      !!e &&
      typeof e === 'object' &&
      typeof (e as Record<string, unknown>).van === 'string' &&
      typeof (e as Record<string, unknown>).naar === 'string' &&
      typeof (e as Record<string, unknown>).op === 'string' &&
      typeof (e as Record<string, unknown>).doorUserId === 'string',
  )
}
