// ── Bijsnijden in de browser (#118) ──────────────────────────────────────────
// Snijdt de gekozen afbeelding tot een vierkant uitsnede-resultaat op basis van het
// pixel-gebied dat react-easy-crop teruggeeft. Het resultaat is een vierkante
// PNG-Blob die geüpload wordt; het ronde masker in de UI is enkel weergave. Geen
// server-side image processing (geen sharp) — consistent met het logo-patroon.

export type PixelArea = { x: number; y: number; width: number; height: number }

function laadAfbeelding(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.addEventListener('load', () => resolve(img))
    img.addEventListener('error', (e) => reject(e))
    img.src = src
  })
}

// Maximale uitvoerafmeting (#124): de foto wordt opgeslagen op max 250px breed.
// Dat is ruim voldoende voor de grootste weergave (96px op het detailscherm) en de
// contract-PDF, houdt het bestand klein en voorkomt dat de geüploade afbeelding de
// server-action-limiet overschrijdt. Lijsten tonen er een kleine thumbnail van (32px).
const MAX_OUTPUT = 250

// Snijdt `imageSrc` (een object-URL of data-URL) tot het opgegeven vierkante gebied
// en geeft een vierkante PNG-Blob terug.
export async function snijdAfbeeldingVierkant(
  imageSrc: string,
  area: PixelArea,
): Promise<Blob> {
  const image = await laadAfbeelding(imageSrc)

  const zijde = Math.min(area.width, area.height)
  const uit = Math.min(zijde, MAX_OUTPUT)

  const canvas = document.createElement('canvas')
  canvas.width = uit
  canvas.height = uit
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Bijsnijden mislukt: canvas niet beschikbaar.')

  ctx.drawImage(
    image,
    area.x,
    area.y,
    zijde,
    zijde,
    0,
    0,
    uit,
    uit,
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Bijsnijden mislukt: kon geen afbeelding maken.'))
      },
      'image/png',
    )
  })
}
