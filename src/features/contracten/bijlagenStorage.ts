import { prisma } from '@/lib/prisma'
import { createAdminClient } from '@/lib/supabase/admin'

// ── Bijlagen-opslag in Supabase Storage (STAL-16) ────────────────────────────
// Door de stal aangeleverde contract-bijlagen (stalreglement, voerschema,
// prijslijst, kopie verzekeringspolis) worden in een privé Supabase Storage-bucket
// bewaard en als ContractBijlage-rij aan het contract gekoppeld. Inzage loopt — net
// als de contract-PDF (STAL-12) — uitsluitend via een signed URL; de autorisatie
// (wie mag dit zien) wordt door de aanroepende server-action afgedwongen.

// Privé bucket voor contract-bijlagen.
export const CONTRACT_BIJLAGEN_BUCKET = 'contract-bijlagen'

// Geldigheid van een signed URL (10 minuten) — genoeg om te openen/downloaden.
const SIGNED_URL_TTL_SECONDS = 600

// Zorgt dat de (privé) bucket bestaat. Idempotent: bestaat hij al, dan gebeurt er
// niets. Zo werkt uploaden ook zonder handmatige bucket-provisioning.
async function ensureBijlagenBucket(
  supabase: ReturnType<typeof createAdminClient>,
): Promise<void> {
  const { data } = await supabase.storage.getBucket(CONTRACT_BIJLAGEN_BUCKET)
  if (data) return
  const { error } = await supabase.storage.createBucket(CONTRACT_BIJLAGEN_BUCKET, {
    public: false,
  })
  if (error && !/already exists/i.test(error.message)) {
    throw new Error(`Bijlagen-bucket aanmaken mislukt: ${error.message}`)
  }
}

// Schrijft een bijlage-bestand naar Supabase Storage en koppelt een ContractBijlage-
// rij aan het contract. Geeft het aangemaakte record terug.
export async function slaBijlageOp(params: {
  contractId: string
  categorie: string
  bestandsnaam: string
  buffer: Buffer
  contentType: string
}) {
  const { contractId, categorie, bestandsnaam, buffer, contentType } = params

  // Veilige bestandsextensie afleiden uit de oorspronkelijke naam (alleen voor de key).
  const punt = bestandsnaam.lastIndexOf('.')
  const ext = punt >= 0 ? bestandsnaam.slice(punt).replace(/[^.a-zA-Z0-9]/g, '') : ''
  const storagePath = `${contractId}/${categorie}-${Date.now()}${ext}`

  const supabase = createAdminClient()
  await ensureBijlagenBucket(supabase)
  const { error } = await supabase.storage
    .from(CONTRACT_BIJLAGEN_BUCKET)
    .upload(storagePath, buffer, { contentType, upsert: true })
  if (error) {
    throw new Error(`Bijlage-opslag mislukt: ${error.message}`)
  }

  return prisma.contractBijlage.create({
    data: { contractId, categorie, bestandsnaam, storagePath },
  })
}

// Verwijdert een bijlage uit Storage én de DB. Faalt het opschonen van Storage niet
// hard: het DB-record is leidend voor de weergave.
export async function verwijderBijlage(bijlageId: string): Promise<void> {
  const bijlage = await prisma.contractBijlage.findUnique({ where: { id: bijlageId } })
  if (!bijlage) return

  const supabase = createAdminClient()
  await supabase.storage.from(CONTRACT_BIJLAGEN_BUCKET).remove([bijlage.storagePath])
  await prisma.contractBijlage.delete({ where: { id: bijlageId } })
}

// Geeft een tijdelijke (signed) URL terug voor één bijlage, of null wanneer die niet
// bestaat. De autorisatie wordt door de aanroepende server-action afgedwongen.
export async function getSignedUrlVoorBijlage(
  bijlageId: string,
): Promise<string | null> {
  const bijlage = await prisma.contractBijlage.findUnique({ where: { id: bijlageId } })
  if (!bijlage) return null

  const supabase = createAdminClient()
  const { data, error } = await supabase.storage
    .from(CONTRACT_BIJLAGEN_BUCKET)
    .createSignedUrl(bijlage.storagePath, SIGNED_URL_TTL_SECONDS)
  if (error || !data) return null
  return data.signedUrl
}

// Haalt de bijlagen van een contract op (nieuwste eerst).
export async function getBijlagenVoorContract(contractId: string) {
  return prisma.contractBijlage.findMany({
    where: { contractId },
    orderBy: { createdAt: 'desc' },
  })
}

// Geeft true wanneer er minstens één stalreglement-bijlage aan het contract gekoppeld is.
export async function heeftStalreglementBijlage(contractId: string): Promise<boolean> {
  const aantal = await prisma.contractBijlage.count({
    where: { contractId, categorie: 'STALREGLEMENT' },
  })
  return aantal > 0
}
