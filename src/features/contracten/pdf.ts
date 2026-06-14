import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { prisma } from '@/lib/prisma'
import { createAdminClient } from '@/lib/supabase/admin'
import { ContractPdfDocument } from './ContractPdfDocument'
import {
  bouwContractPdfData,
  type PdfContextInput,
  type PdfContractInput,
} from './pdfData'

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
      stable: { select: { name: true, address: true, postalCode: true, city: true } },
      horse: { select: { name: true } },
      counterparty: { select: { name: true, email: true } },
    },
  })
  if (!contract) throw new Error('Contract niet gevonden')

  const adresDelen = [
    contract.stable.address,
    [contract.stable.postalCode, contract.stable.city].filter(Boolean).join(' '),
  ].filter((d) => d && d.trim().length > 0)

  return {
    stalNaam: contract.stable.name,
    stalAdres: adresDelen.length > 0 ? adresDelen.join(', ') : null,
    eigenaarNaam:
      contract.counterparty?.name ?? contract.counterparty?.email ?? 'Onbekende eigenaar',
    paardNaam: contract.horse.name,
  }
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
  const buffer = await renderContractPdfBuffer(
    {
      currentVersion: contract.currentVersion,
      startDate: contract.startDate,
      config: contract.config,
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
