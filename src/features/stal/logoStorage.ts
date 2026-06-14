import { prisma } from '@/lib/prisma'
import { createAdminClient } from '@/lib/supabase/admin'

// ── Stallogo-opslag in Supabase Storage (#98) ────────────────────────────────
// Een staleigenaar kan per stal een eigen logo uploaden dat o.a. op de contract-PDF
// verschijnt. Het bestand staat in een privé Supabase Storage-bucket; op het
// Stable-model bewaren we enkel het storage-pad (logoPath). Inzage/gebruik loopt
// server-side: voor de UI via een signed URL, voor de PDF via de ruwe bytes.
// Analoog aan ensureContractPdfBucket / bijlagenStorage.

// Privé bucket voor stallogo's.
export const STABLE_LOGO_BUCKET = 'stable-logos'

// Geldigheid van een signed URL (10 minuten) — genoeg voor een preview.
const SIGNED_URL_TTL_SECONDS = 600

// Zorgt dat de (privé) bucket bestaat. Idempotent: bestaat hij al, dan gebeurt er
// niets. Zo werkt uploaden ook zonder handmatige bucket-provisioning.
async function ensureLogoBucket(
  supabase: ReturnType<typeof createAdminClient>,
): Promise<void> {
  const { data } = await supabase.storage.getBucket(STABLE_LOGO_BUCKET)
  if (data) return
  const { error } = await supabase.storage.createBucket(STABLE_LOGO_BUCKET, {
    public: false,
  })
  if (error && !/already exists/i.test(error.message)) {
    throw new Error(`Logo-bucket aanmaken mislukt: ${error.message}`)
  }
}

// Schrijft een nieuw stallogo naar Storage en koppelt het pad aan de stal. Een
// eventueel bestaand logo wordt eerst verwijderd zodat er niets blijft rondslingeren.
export async function slaStableLogoOp(params: {
  stableId: string
  bestandsnaam: string
  buffer: Buffer
  contentType: string
}): Promise<void> {
  const { stableId, bestandsnaam, buffer, contentType } = params

  const supabase = createAdminClient()
  await ensureLogoBucket(supabase)

  // Bestaand logo opruimen (vervangen i.p.v. stapelen).
  const huidig = await prisma.stable.findUnique({
    where: { id: stableId },
    select: { logoPath: true },
  })
  if (huidig?.logoPath) {
    await supabase.storage.from(STABLE_LOGO_BUCKET).remove([huidig.logoPath])
  }

  // Veilige bestandsextensie afleiden (alleen voor de key).
  const punt = bestandsnaam.lastIndexOf('.')
  const ext = punt >= 0 ? bestandsnaam.slice(punt).replace(/[^.a-zA-Z0-9]/g, '') : ''
  const storagePath = `${stableId}/logo-${Date.now()}${ext}`

  const { error } = await supabase.storage
    .from(STABLE_LOGO_BUCKET)
    .upload(storagePath, buffer, { contentType, upsert: true })
  if (error) {
    throw new Error(`Logo-opslag mislukt: ${error.message}`)
  }

  await prisma.stable.update({
    where: { id: stableId },
    data: { logoPath: storagePath },
  })
}

// Verwijdert het stallogo uit Storage én maakt logoPath leeg. Faalt het opschonen
// van Storage niet hard: het DB-veld is leidend voor het gedrag (PDF-fallback).
export async function verwijderStableLogo(stableId: string): Promise<void> {
  const stable = await prisma.stable.findUnique({
    where: { id: stableId },
    select: { logoPath: true },
  })
  if (!stable?.logoPath) return

  const supabase = createAdminClient()
  await supabase.storage.from(STABLE_LOGO_BUCKET).remove([stable.logoPath])
  await prisma.stable.update({
    where: { id: stableId },
    data: { logoPath: null },
  })
}

// Geeft een tijdelijke (signed) URL terug voor het stallogo (preview in de UI), of
// null wanneer er geen logo is. De autorisatie wordt door de aanroeper afgedwongen.
export async function getStableLogoSignedUrl(stableId: string): Promise<string | null> {
  const stable = await prisma.stable.findUnique({
    where: { id: stableId },
    select: { logoPath: true },
  })
  if (!stable?.logoPath) return null

  const supabase = createAdminClient()
  const { data, error } = await supabase.storage
    .from(STABLE_LOGO_BUCKET)
    .createSignedUrl(stable.logoPath, SIGNED_URL_TTL_SECONDS)
  if (error || !data) return null
  return data.signedUrl
}

// Haalt de ruwe bytes van het stallogo op (voor server-side gebruik in de PDF), of
// null wanneer er geen logo is of het downloaden mislukt.
export async function getStableLogoBytes(stableId: string): Promise<Buffer | null> {
  const stable = await prisma.stable.findUnique({
    where: { id: stableId },
    select: { logoPath: true },
  })
  if (!stable?.logoPath) return null

  const supabase = createAdminClient()
  const { data, error } = await supabase.storage
    .from(STABLE_LOGO_BUCKET)
    .download(stable.logoPath)
  if (error || !data) return null

  const arrayBuffer = await data.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

// Leidt het MIME-type van het logo af uit de bestandsextensie van het storage-pad.
function logoMimeUitPad(logoPath: string): string {
  const ext = logoPath.slice(logoPath.lastIndexOf('.') + 1).toLowerCase()
  switch (ext) {
    case 'png':
      return 'image/png'
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'svg':
      return 'image/svg+xml'
    default:
      return 'application/octet-stream'
  }
}

// Geeft het stallogo terug als data-URL (voor inbedding in de contract-PDF), of null
// wanneer er geen logo is of het downloaden mislukt. De PDF valt dan terug op het
// standaard Velaro-logo.
export async function getStableLogoDataUrl(stableId: string): Promise<string | null> {
  const stable = await prisma.stable.findUnique({
    where: { id: stableId },
    select: { logoPath: true },
  })
  if (!stable?.logoPath) return null

  const bytes = await getStableLogoBytes(stableId)
  if (!bytes) return null
  return `data:${logoMimeUitPad(stable.logoPath)};base64,${bytes.toString('base64')}`
}
