import { PDFDocument } from 'pdf-lib'

// ── PDF-merge tot één ondertekenbaar contractdocument (#143) ─────────────────
// Voegt de gegenereerde contract-PDF samen met de meegevoegde (PDF-)bijlagen tot
// één PDF, in deze vaste volgorde (alleen aanwezige/aangevinkte delen):
//
//   1. Contract-PDF (afhankelijk van de contractversie).
//   2. Algemene voorwaarden (stalniveau-PDF) — wanneer aangevinkt en aanwezig.
//   3. Stalreglement-pagina's.
//   4. Voerschema.
//   5. Prijslijst.
//
// De ontvanger ondertekent dit ene document in één keer. Niet-PDF-uploads (PNG/JPEG)
// worden als losse pagina's ingevoegd; afbeeldingen krijgen elk een eigen pagina op
// de afbeeldingsgrootte. Onleesbare/corrupte delen worden overgeslagen (best-effort)
// zodat één kapotte bijlage niet het hele document blokkeert.

// Een mee te voegen onderdeel: de ruwe bytes plus het type (om de juiste pdf-lib-
// inbedding te kiezen).
export type MergeOnderdeel = {
  bytes: Buffer
  // 'pdf' | 'png' | 'jpg' — afgeleid uit het storage-pad/content-type.
  soort: 'pdf' | 'png' | 'jpg'
}

// Leidt het mergesoort-type af uit een bestandsnaam of storage-pad. Geeft null
// wanneer het type niet ondersteund wordt (dat onderdeel wordt dan overgeslagen).
export function mergeSoortUitPad(pad: string): MergeOnderdeel['soort'] | null {
  const ext = pad.slice(pad.lastIndexOf('.') + 1).toLowerCase()
  switch (ext) {
    case 'pdf':
      return 'pdf'
    case 'png':
      return 'png'
    case 'jpg':
    case 'jpeg':
      return 'jpg'
    default:
      return null
  }
}

// Voegt één onderdeel toe aan het doeldocument. PDF's worden pagina-voor-pagina
// gekopieerd; afbeeldingen krijgen een eigen pagina op afbeeldingsgrootte. Faalt het
// inbedden (corrupt bestand), dan wordt dit onderdeel stilzwijgend overgeslagen.
async function voegOnderdeelToe(
  doel: PDFDocument,
  onderdeel: MergeOnderdeel,
): Promise<void> {
  try {
    if (onderdeel.soort === 'pdf') {
      const bron = await PDFDocument.load(onderdeel.bytes, { ignoreEncryption: true })
      const paginas = await doel.copyPages(bron, bron.getPageIndices())
      for (const pagina of paginas) doel.addPage(pagina)
      return
    }

    const afbeelding =
      onderdeel.soort === 'png'
        ? await doel.embedPng(onderdeel.bytes)
        : await doel.embedJpg(onderdeel.bytes)
    const pagina = doel.addPage([afbeelding.width, afbeelding.height])
    pagina.drawImage(afbeelding, {
      x: 0,
      y: 0,
      width: afbeelding.width,
      height: afbeelding.height,
    })
  } catch {
    // Eén onleesbaar onderdeel mag het samengevoegde document niet blokkeren.
  }
}

// Voegt de contract-PDF samen met de meegevoegde onderdelen tot één PDF-buffer. De
// onderdelen worden in de aangeleverde volgorde toegevoegd; de aanroeper bepaalt die
// volgorde (AV → stalreglement → voerschema → prijslijst). Zonder onderdelen wordt de
// contract-PDF ongewijzigd teruggegeven.
export async function voegContractDocumentSamen(
  contractPdf: Buffer,
  onderdelen: MergeOnderdeel[],
): Promise<Buffer> {
  if (onderdelen.length === 0) return contractPdf

  const doel = await PDFDocument.load(contractPdf, { ignoreEncryption: true })
  for (const onderdeel of onderdelen) {
    await voegOnderdeelToe(doel, onderdeel)
  }
  const samengevoegd = await doel.save()
  return Buffer.from(samengevoegd)
}
