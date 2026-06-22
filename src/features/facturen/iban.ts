// ── IBAN-normalisatie & -validatie ([Fact 06] #151) ──────────────────────────
// Pure, IO-vrije helpers om een ingevoerde IBAN te normaliseren (spaties weg,
// hoofdletters) en te valideren volgens ISO 13616: per-land-lengte + de generieke
// mod-97-10-controle. Geen externe lib; de modulo wordt string-gewijs berekend om
// bigint-grenzen te vermijden. Test-vriendelijk (geldige + ongeldige IBANs).

// Per-land IBAN-lengtes (ISO 13616, register). Bewust een ruime selectie van vooral
// SEPA-/Europese landen; onbekende landcodes worden geweigerd zodat een typefout in de
// landcode niet ongemerkt doorglipt.
const IBAN_LENGTES: Record<string, number> = {
  AD: 24, AT: 20, BE: 16, BG: 22, CH: 21, CY: 28, CZ: 24, DE: 22, DK: 18, EE: 20,
  ES: 24, FI: 18, FO: 18, FR: 27, GB: 22, GI: 23, GL: 18, GR: 27, HR: 21, HU: 28,
  IE: 22, IS: 26, IT: 27, LI: 21, LT: 20, LU: 20, LV: 21, MC: 27, MT: 31, NL: 18,
  NO: 15, PL: 28, PT: 25, RO: 24, SE: 24, SI: 19, SK: 24, SM: 27,
}

/**
 * Normaliseert een ingevoerde IBAN: verwijdert alle spaties en zet om naar hoofdletters.
 * Wijzigt verder niets aan de inhoud (geen validatie hier — zie isGeldigeIban).
 */
export function normaliseerIban(invoer: string): string {
  return invoer.replace(/\s+/g, '').toUpperCase()
}

/**
 * Valideert een (reeds te normaliseren) IBAN volgens ISO 13616:
 *  - alleen letters/cijfers, begint met twee letters (landcode) + twee cijfers (controle),
 *  - de landcode is bekend en de totale lengte klopt voor dat land,
 *  - de mod-97-10-controle: verplaats de eerste vier tekens naar achteren, vervang elke
 *    letter door zijn positie (A=10 … Z=35) en controleer dat de grote integer mod 97 == 1.
 * De modulo wordt string-gewijs (chunk-voor-chunk) berekend om bigint-grenzen te vermijden.
 * Verwacht de genormaliseerde vorm; normaliseer desnoods eerst met normaliseerIban.
 */
export function isGeldigeIban(invoer: string): boolean {
  const iban = normaliseerIban(invoer)

  // Structuur: 2 letters (land) + 2 cijfers (controle) + alfanumeriek (rekeningdeel).
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(iban)) {
    return false
  }

  const land = iban.slice(0, 2)
  const verwachteLengte = IBAN_LENGTES[land]
  if (verwachteLengte === undefined || iban.length !== verwachteLengte) {
    return false
  }

  // Mod-97-10: eerste vier tekens naar achteren, letters → cijfers (A=10 … Z=35).
  const herschikt = iban.slice(4) + iban.slice(0, 4)
  let numeriek = ''
  for (const teken of herschikt) {
    if (teken >= '0' && teken <= '9') {
      numeriek += teken
    } else {
      // 'A'.charCodeAt(0) === 65; A → 10.
      numeriek += (teken.charCodeAt(0) - 55).toString()
    }
  }

  return mod97(numeriek) === 1
}

/**
 * Berekent (groot decimaal getal als string) mod 97, chunk-voor-chunk, zodat geen
 * bigint/Number-overflow optreedt bij lange IBAN-getallen.
 */
function mod97(numeriek: string): number {
  let rest = 0
  for (const cijfer of numeriek) {
    rest = (rest * 10 + Number(cijfer)) % 97
  }
  return rest
}
