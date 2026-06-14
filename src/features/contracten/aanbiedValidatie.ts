import type { Prisma } from '@prisma/client'
import { leesHuisvesting, ontbrekendeHuisvestingVelden } from './huisvesting'
import { leesDienstpakket, ontbrekendeDienstpakketVelden } from './dienstpakket'
import { leesPrijsLooptijd, ontbrekendePrijsLooptijdVelden } from './prijsLooptijd'
import {
  leesVerzekeringAansprakelijkheid,
  ontbrekendeVerplichteVelden,
  VERPLICHTE_VELDEN,
} from './verzekeringAansprakelijkheid'
import { leesBijlagenConfig } from './bijlagenDiensten'

// ── Verplicht-veld-validatie vóór aanbieden (STAL-08, #81) ───────────────────
// Aggregeert de compleetheids-helpers van alle verplichte optieblokken tot één
// overzicht van ontbrekende velden, gegroepeerd per blok. Wordt zowel door de
// server-poort (`offerContract`) als door de UI gebruikt, zodat de eigenaar
// dezelfde "ontbreekt nog"-feedback ziet als de server afdwingt.

// Eén blok met zijn (eventueel) ontbrekende verplichte velden.
export type OntbrekendBlok = {
  blok: string
  velden: string[]
}

// Leest het config-JSON van een contract en bepaalt per verplicht blok welke
// velden nog ontbreken. Een leeg resultaat betekent dat het contract aangeboden
// mag worden.
// `heeftStalreglement` geeft aan of er een stalreglement-bijlage aan het contract
// gekoppeld is (een DB-feit, geen config-data). De aanroeper haalt dit op en geeft
// het door; standaard true zodat callers die het (nog) niet weten niet onbedoeld
// blokkeren. Wordt alleen gebruikt wanneer config.bijlagen.stalreglementVerplicht aan staat.
export function ontbrekendeAanbiedVelden(
  config: Prisma.JsonValue | null | undefined,
  heeftStalreglement: boolean = true,
): OntbrekendBlok[] {
  const resultaat: OntbrekendBlok[] = []

  // Prijs/looptijd (STAL-05)
  const prijsLooptijd = ontbrekendePrijsLooptijdVelden(leesPrijsLooptijd(config))
  if (prijsLooptijd.length > 0) {
    resultaat.push({ blok: 'Prijs & looptijd', velden: prijsLooptijd })
  }

  // Huisvesting (STAL-03)
  const huisvesting = ontbrekendeHuisvestingVelden(leesHuisvesting(config))
  if (huisvesting.length > 0) {
    resultaat.push({ blok: 'Huisvesting', velden: huisvesting })
  }

  // Dienstpakket (STAL-04)
  const dienstpakket = ontbrekendeDienstpakketVelden(leesDienstpakket(config))
  if (dienstpakket.length > 0) {
    resultaat.push({ blok: 'Dienstpakket', velden: dienstpakket })
  }

  // Verzekering & aansprakelijkheid (STAL-06)
  const verzekering = ontbrekendeVerplichteVelden(
    leesVerzekeringAansprakelijkheid(config),
  ).map((sleutel) => VERPLICHTE_VELDEN[sleutel])
  if (verzekering.length > 0) {
    resultaat.push({ blok: 'Verzekering & aansprakelijkheid', velden: verzekering })
  }

  // Bijlagen (STAL-16): wanneer "stalreglement verplicht" aanstaat en er geen
  // stalreglement-bijlage gekoppeld is, telt dit als ontbrekend verplicht onderdeel.
  const bijlagen = leesBijlagenConfig(config)
  if (bijlagen.stalreglementVerplicht && !heeftStalreglement) {
    resultaat.push({ blok: 'Bijlagen', velden: ['Stalreglement (verplicht)'] })
  }

  return resultaat
}

// `true` wanneer alle verplichte velden ingevuld zijn (contract mag aangeboden).
export function magAangebodenWorden(
  config: Prisma.JsonValue | null | undefined,
  heeftStalreglement: boolean = true,
): boolean {
  return ontbrekendeAanbiedVelden(config, heeftStalreglement).length === 0
}

// Vlakt het overzicht uit tot één begrijpelijke foutregel voor de server-poort.
export function ontbrekendeVeldenSamenvatting(blokken: OntbrekendBlok[]): string {
  return blokken
    .map((b) => `${b.blok}: ${b.velden.join(', ')}`)
    .join(' — ')
}
