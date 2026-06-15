// ── Paardfoto-validatie (#118) ───────────────────────────────────────────────
// Server-side validatie van een geüploade paardfoto. Bestandstype en -grootte zijn
// harde grenzen. De foto wordt vóór upload client-side bijgesneden tot een vierkant
// (PNG/JPEG); we lezen geen pixel-afmetingen uit (anders dan het logo) omdat een
// vierkant uitsnede-resultaat altijd geldig is. Hergebruikt bewust dezelfde, lichte
// aanpak als logoValidatie.ts: geen zware image-dependency.

export const PAARDFOTO_MAX_BYTES = 5 * 1024 * 1024 // 5 MB

// Toegestane MIME-types → vriendelijke naam voor foutmeldingen. Alleen PNG/JPG/JPEG
// (geen SVG: een profielfoto is een rasterafbeelding).
export const PAARDFOTO_TOEGESTANE_TYPES: Record<string, string> = {
  'image/png': 'PNG',
  'image/jpeg': 'JPG/JPEG',
  'image/jpg': 'JPG/JPEG',
}

// Valideert type en grootte. Geeft een Nederlandstalige foutmelding terug die
// aangeeft welke regel overtreden is, of null wanneer alles klopt.
export function valideerPaardFoto(params: {
  mimeType: string
  grootteBytes: number
}): string | null {
  const { mimeType, grootteBytes } = params

  if (!PAARDFOTO_TOEGESTANE_TYPES[mimeType]) {
    return 'Alleen PNG- of JPG/JPEG-bestanden zijn toegestaan.'
  }
  if (grootteBytes > PAARDFOTO_MAX_BYTES) {
    return 'Het bestand is te groot (maximaal 5 MB).'
  }
  return null
}
