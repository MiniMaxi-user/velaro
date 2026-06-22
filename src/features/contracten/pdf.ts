import type { LeaseType } from '@prisma/client'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { prisma } from '@/lib/prisma'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStableLogoDataUrl } from '@/features/stal/logoStorage'
import { getPaardFotoDataUrl } from '@/features/paarden/paardFotoStorage'
import { getAlgemeneVoorwaardenBytes } from '@/features/stal/algemeneVoorwaardenStorage'
import { ContractPdfDocument } from './ContractPdfDocument'
import {
  bouwContractPdfData,
  type PdfContextInput,
  type PdfContractInput,
} from './pdfData'
import { leesAlgemeneVoorwaardenConfig } from './bijlagenDiensten'
import { getBijlageBytes } from './bijlagenStorage'
import {
  mergeSoortUitPad,
  voegContractDocumentSamen,
  type MergeOnderdeel,
} from './pdfMerge'

// ── PDF-generatie & opslag (STAL-12) ─────────────────────────────────────────
// Server-side generatie met @react-pdf/renderer (geen headless browser). De PDF
// wordt bij aanbieden (STAL-08) en bij elke nieuwe versie (STAL-11) naar Supabase
// Storage geschreven en als ContractDocument-rij aan de contractversie gekoppeld.
// De preview-variant rendert alleen in-memory en slaat niets op.

// Bucket voor contract-PDF's binnen Supabase Storage. Privé: inzage uitsluitend via
// signed URL (autorisatie bepaalt de aanroeper, niet de bucket).
export const CONTRACT_PDF_BUCKET = 'contract-pdfs'

// Geldigheid van een signed URL (10 minuten) — genoeg om te openen/downloaden.
const SIGNED_URL_TTL_SECONDS = 600

// Zorgt dat de (privé) bucket voor contract-PDF's bestaat. Idempotent: bestaat hij
// al, dan gebeurt er niets. Zo werkt het aanbieden ook zonder handmatige
// bucket-provisioning in een nieuwe omgeving.
async function ensureContractPdfBucket(
  supabase: ReturnType<typeof createAdminClient>,
): Promise<void> {
  const { data } = await supabase.storage.getBucket(CONTRACT_PDF_BUCKET)
  if (data) return
  const { error } = await supabase.storage.createBucket(CONTRACT_PDF_BUCKET, {
    public: false,
  })
  // Negeer een race waarbij de bucket inmiddels door een parallelle aanroep bestaat.
  if (error && !/already exists/i.test(error.message)) {
    throw new Error(`PDF-bucket aanmaken mislukt: ${error.message}`)
  }
}

// Rendert de contract-PDF naar een Buffer. Pure functie zonder neveneffecten:
// bouwt het datamodel en rendert het @react-pdf/renderer-document.
export async function renderContractPdfBuffer(
  contract: PdfContractInput,
  context: PdfContextInput,
): Promise<Buffer> {
  const data = bouwContractPdfData(contract, context)
  const element = createElement(ContractPdfDocument, { data })
  // renderToBuffer accepteert een React-element; cast om de DocumentProps-typing
  // van react-pdf te overbruggen.
  return renderToBuffer(element as Parameters<typeof renderToBuffer>[0])
}

// Verzamelt de partijen-/paardcontext voor een opgeslagen contract uit de DB.
async function bouwContextVoorContract(contractId: string): Promise<PdfContextInput> {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: {
      stable: {
        select: {
          id: true,
          name: true,
          address: true,
          postalCode: true,
          city: true,
          logoPath: true,
        },
      },
      horse: {
        select: {
          id: true,
          name: true,
          photoPath: true,
          eigendom: true,
          // Particuliere eigenaar(s) van het paard, voor de eigenaar-kant van een
          // leasecontract (de counterparty daar is de leaser, niet de eigenaar).
          people: {
            where: { isOwner: true },
            select: { user: { select: { name: true, email: true } } },
            orderBy: { createdAt: 'asc' },
          },
        },
      },
      counterparty: { select: { name: true, email: true } },
    },
  })
  if (!contract) throw new Error('Contract niet gevonden')

  const adresDelen = [
    contract.stable.address,
    [contract.stable.postalCode, contract.stable.city].filter(Boolean).join(' '),
  ].filter((d) => d && d.trim().length > 0)

  // Eigenaar-kant van het document. Bij stalling is de counterparty de eigenaar.
  // Bij lease is de counterparty de LEASER; de eigenaar volgt dan uit Horse.eigendom:
  // de stal zelf (STAL) of de particuliere eigenaar (HorsePerson.isOwner).
  const particuliereEigenaar =
    contract.horse.people[0]?.user.name ??
    contract.horse.people[0]?.user.email ??
    'Onbekende eigenaar'
  const eigenaarNaam =
    contract.family === 'LEASE'
      ? contract.horse.eigendom === 'STAL'
        ? contract.stable.name
        : particuliereEigenaar
      : contract.counterparty?.name ?? contract.counterparty?.email ?? 'Onbekende eigenaar'

  // Leaser-kant (alleen bij lease): de counterparty is de leaser. Bij stalling is er
  // geen aparte leaser.
  const leaserNaam =
    contract.family === 'LEASE'
      ? contract.counterparty?.name ?? contract.counterparty?.email ?? 'Onbekende leaser'
      : null

  return {
    stalNaam: contract.stable.name,
    stalAdres: adresDelen.length > 0 ? adresDelen.join(', ') : null,
    eigenaarNaam,
    leaserNaam,
    paardNaam: contract.horse.name,
    // Eigen stallogo (#98) als data-URL; null = standaard Velaro-logo.
    stalLogoDataUrl: contract.stable.logoPath
      ? await getStableLogoDataUrl(contract.stable.id)
      : null,
    // Profielfoto van het paard (#118) als data-URL; null = geen foto in de PDF.
    paardFotoDataUrl: contract.horse.photoPath
      ? await getPaardFotoDataUrl(contract.horse.id)
      : null,
  }
}

// Categorieën die als pagina's meegevoegd worden in het samengevoegde document, in
// de vaste volgorde na de algemene voorwaarden (#143). De gestructureerde prijslijst
// (extra diensten) blijft in de contract-PDF zelf; hier gaat het om de geüploade
// PRIJSLIJST-bijlage (los document).
const MERGE_BIJLAGE_VOLGORDE = ['STALREGLEMENT', 'VOERSCHEMA', 'PRIJSLIJST'] as const

// Verzamelt de mee te voegen onderdelen voor één contract in de vaste volgorde:
// algemene voorwaarden (stalniveau-PDF, alleen wanneer aangevinkt) → stalreglement →
// voerschema → prijslijst. Alleen aanwezige onderdelen komen terug. Afbeeldings-
// bijlagen worden meegenomen; onbekende types worden overgeslagen.
async function verzamelMergeOnderdelen(contractId: string): Promise<MergeOnderdeel[]> {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    select: {
      config: true,
      stableId: true,
      stable: { select: { algemeneVoorwaardenPath: true } },
    },
  })
  if (!contract) return []

  const onderdelen: MergeOnderdeel[] = []

  // 1. Algemene voorwaarden (stalniveau-PDF) — alleen wanneer per contract aangevinkt
  //    én de stal een AV-PDF heeft. Default volgt uit de aanwezigheid van de AV-PDF.
  const heeftAv = Boolean(contract.stable.algemeneVoorwaardenPath)
  const avConfig = leesAlgemeneVoorwaardenConfig(contract.config, heeftAv)
  if (heeftAv && avConfig.meegevoegd) {
    const avBytes = await getAlgemeneVoorwaardenBytes(contract.stableId)
    if (avBytes) onderdelen.push({ bytes: avBytes, soort: 'pdf' })
  }

  // 2–4. Geüploade bijlagen in vaste volgorde (stalreglement → voerschema → prijslijst).
  //      Binnen een categorie op uploadvolgorde (oudste eerst).
  const bijlagen = await prisma.contractBijlage.findMany({
    where: { contractId, categorie: { in: [...MERGE_BIJLAGE_VOLGORDE] } },
    orderBy: { createdAt: 'asc' },
    select: { id: true, categorie: true, storagePath: true },
  })
  for (const categorie of MERGE_BIJLAGE_VOLGORDE) {
    for (const bijlage of bijlagen.filter((b) => b.categorie === categorie)) {
      const soort = mergeSoortUitPad(bijlage.storagePath)
      if (!soort) continue
      const bytes = await getBijlageBytes(bijlage.id)
      if (bytes) onderdelen.push({ bytes, soort })
    }
  }

  return onderdelen
}

// Rendert de contract-PDF voor een opgeslagen contract en voegt — wanneer van
// toepassing — de algemene voorwaarden en bijlagen samen tot één document (#143).
// Gebruikt zowel bij het opslaan (genereerEnSlaContractPdfOp) als bij de preview,
// zodat beide hetzelfde samengevoegde resultaat tonen.
export async function renderSamengevoegdContractPdf(
  contractId: string,
  contractInput: PdfContractInput,
  context: PdfContextInput,
): Promise<Buffer> {
  const basis = await renderContractPdfBuffer(contractInput, context)
  const onderdelen = await verzamelMergeOnderdelen(contractId)
  return voegContractDocumentSamen(basis, onderdelen)
}

// Genereert de PDF voor een opgeslagen contract en schrijft die naar Supabase
// Storage + koppelt een ContractDocument-rij aan de huidige versie. Wordt gebruikt
// bij aanbieden (STAL-08) en bij een nieuwe versie (STAL-11). Faalt de generatie of
// upload, dan gooit deze functie zodat de aanroeper kan beslissen.
export async function genereerEnSlaContractPdfOp(contractId: string): Promise<void> {
  const contract = await prisma.contract.findUnique({ where: { id: contractId } })
  if (!contract) throw new Error('Contract niet gevonden')

  const context = await bouwContextVoorContract(contractId)
  // Gekoppelde bijlagen (STAL-16) — alleen naam + categorie voor het PDF-overzicht.
  const bijlagen = await prisma.contractBijlage.findMany({
    where: { contractId },
    orderBy: { createdAt: 'asc' },
    select: { categorie: true, bestandsnaam: true },
  })
  const buffer = await renderSamengevoegdContractPdf(
    contractId,
    {
      currentVersion: contract.currentVersion,
      startDate: contract.startDate,
      config: contract.config,
      // Familie + leasevorm sturen de PDF-opbouw (stalling- vs. lease-secties + titel).
      family: contract.family,
      leaseType: contract.family === 'LEASE' ? (contract.type as LeaseType) : null,
      bijlagen,
    },
    context,
  )

  const storagePath = `${contractId}/v${contract.currentVersion}-${Date.now()}.pdf`
  const supabase = createAdminClient()
  await ensureContractPdfBucket(supabase)
  const { error } = await supabase.storage
    .from(CONTRACT_PDF_BUCKET)
    .upload(storagePath, buffer, {
      contentType: 'application/pdf',
      upsert: true,
    })
  if (error) {
    throw new Error(`PDF-opslag mislukt: ${error.message}`)
  }

  await prisma.contractDocument.create({
    data: {
      contractId,
      version: contract.currentVersion,
      storagePath,
    },
  })
}

// Geeft een tijdelijke (signed) URL terug voor het meest recente document van een
// contract, of null wanneer er nog geen PDF is opgeslagen. De autorisatie (wie mag
// dit document zien) wordt door de aanroepende server-action afgedwongen.
export async function getSignedUrlVoorContract(contractId: string): Promise<string | null> {
  const document = await prisma.contractDocument.findFirst({
    where: { contractId },
    orderBy: { createdAt: 'desc' },
  })
  if (!document) return null

  const supabase = createAdminClient()
  const { data, error } = await supabase.storage
    .from(CONTRACT_PDF_BUCKET)
    .createSignedUrl(document.storagePath, SIGNED_URL_TTL_SECONDS)
  if (error || !data) return null
  return data.signedUrl
}
