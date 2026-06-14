// ── Logo-validatie (#98) ─────────────────────────────────────────────────────
// Server-side validatie van een geüpload stallogo. Bestandstype en -grootte zijn
// harde grenzen; de pixel-afmetingen worden uit de afbeeldingsheader gelezen zonder
// een zware image-dependency (PNG/JPEG headerparsing; SVG via width/height of
// viewBox). Lukt het uitlezen van de afmetingen niet, dan wordt de upload geweigerd
// met een duidelijke melding.

export const LOGO_MAX_BYTES = 2 * 1024 * 1024 // 2 MB
export const LOGO_MIN_DIMENSION = 200
export const LOGO_MAX_DIMENSION = 2000

// Toegestane MIME-types → vriendelijke naam voor foutmeldingen.
export const LOGO_TOEGESTANE_TYPES: Record<string, string> = {
  'image/png': 'PNG',
  'image/jpeg': 'JPG/JPEG',
  'image/jpg': 'JPG/JPEG',
  'image/svg+xml': 'SVG',
}

export type LogoAfmetingen = { breedte: number; hoogte: number }

// Leest de afmetingen van een PNG uit de IHDR-chunk (bytes 16-23).
function leesPngAfmetingen(buf: Buffer): LogoAfmetingen | null {
  // PNG-signatuur + minimale IHDR-lengte.
  if (buf.length < 24) return null
  const signatuur = buf.subarray(0, 8).toString('hex')
  if (signatuur !== '89504e470d0a1a0a') return null
  const breedte = buf.readUInt32BE(16)
  const hoogte = buf.readUInt32BE(20)
  if (breedte === 0 || hoogte === 0) return null
  return { breedte, hoogte }
}

// Leest de afmetingen van een JPEG door de SOF-markers te scannen.
function leesJpegAfmetingen(buf: Buffer): LogoAfmetingen | null {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null
  let offset = 2
  while (offset + 9 < buf.length) {
    if (buf[offset] !== 0xff) {
      offset++
      continue
    }
    const marker = buf[offset + 1]
    // SOF0..SOF15 bevatten de afmetingen, m.u.v. DHT(0xc4)/JPG(0xc8)/DAC(0xcc).
    if (
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc
    ) {
      const hoogte = buf.readUInt16BE(offset + 5)
      const breedte = buf.readUInt16BE(offset + 7)
      if (breedte === 0 || hoogte === 0) return null
      return { breedte, hoogte }
    }
    // Spring naar het volgende segment op basis van de segmentlengte.
    const segmentLengte = buf.readUInt16BE(offset + 2)
    if (segmentLengte < 2) return null
    offset += 2 + segmentLengte
  }
  return null
}

// Leest de afmetingen van een SVG uit width/height (pixels) of viewBox.
function leesSvgAfmetingen(buf: Buffer): LogoAfmetingen | null {
  const tekst = buf.toString('utf8', 0, Math.min(buf.length, 4096))
  const svgTag = tekst.match(/<svg[^>]*>/i)?.[0]
  if (!svgTag) return null

  const pixelWaarde = (attr: string): number | null => {
    const m = svgTag.match(new RegExp(`${attr}\\s*=\\s*["']\\s*([0-9.]+)\\s*(px)?\\s*["']`, 'i'))
    if (!m) return null
    const n = Number.parseFloat(m[1])
    return Number.isFinite(n) && n > 0 ? Math.round(n) : null
  }

  const breedte = pixelWaarde('width')
  const hoogte = pixelWaarde('height')
  if (breedte !== null && hoogte !== null) return { breedte, hoogte }

  const viewBox = svgTag.match(/viewBox\s*=\s*["']\s*([0-9.\s-]+)["']/i)?.[1]
  if (viewBox) {
    const delen = viewBox.trim().split(/[\s,]+/).map(Number)
    if (delen.length === 4 && delen[2] > 0 && delen[3] > 0) {
      return { breedte: Math.round(delen[2]), hoogte: Math.round(delen[3]) }
    }
  }
  return null
}

// Bepaalt de afmetingen op basis van het MIME-type. Geeft null wanneer ze niet
// betrouwbaar uit te lezen zijn.
export function leesAfmetingen(buffer: Buffer, mimeType: string): LogoAfmetingen | null {
  switch (mimeType) {
    case 'image/png':
      return leesPngAfmetingen(buffer)
    case 'image/jpeg':
    case 'image/jpg':
      return leesJpegAfmetingen(buffer)
    case 'image/svg+xml':
      return leesSvgAfmetingen(buffer)
    default:
      return null
  }
}

// Valideert type, grootte en afmetingen. Geeft een Nederlandstalige foutmelding
// terug die aangeeft welke regel overtreden is, of null wanneer alles klopt.
export function valideerLogo(params: {
  mimeType: string
  grootteBytes: number
  buffer: Buffer
}): string | null {
  const { mimeType, grootteBytes, buffer } = params

  if (!LOGO_TOEGESTANE_TYPES[mimeType]) {
    return 'Alleen PNG-, JPG/JPEG- of SVG-bestanden zijn toegestaan.'
  }
  if (grootteBytes > LOGO_MAX_BYTES) {
    return 'Het bestand is te groot (maximaal 2 MB).'
  }

  const afmetingen = leesAfmetingen(buffer, mimeType)
  if (!afmetingen) {
    return 'De afmetingen van de afbeelding konden niet worden bepaald. Gebruik een geldige PNG, JPG/JPEG of SVG.'
  }
  const { breedte, hoogte } = afmetingen
  if (breedte < LOGO_MIN_DIMENSION || hoogte < LOGO_MIN_DIMENSION) {
    return `De afbeelding is te klein (${breedte}x${hoogte} px). Minimaal ${LOGO_MIN_DIMENSION}x${LOGO_MIN_DIMENSION} px.`
  }
  if (breedte > LOGO_MAX_DIMENSION || hoogte > LOGO_MAX_DIMENSION) {
    return `De afbeelding is te groot in afmetingen (${breedte}x${hoogte} px). Maximaal ${LOGO_MAX_DIMENSION}x${LOGO_MAX_DIMENSION} px.`
  }
  return null
}
