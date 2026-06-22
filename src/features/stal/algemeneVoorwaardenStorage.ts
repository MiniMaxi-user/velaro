import { prisma } from '@/lib/prisma'
import { createAdminClient } from '@/lib/supabase/admin'

// ── Algemene-voorwaarden-opslag in Supabase Storage (#143) ───────────────────
// Een staleigenaar kan per stal één algemene-voorwaarden-PDF uploaden. Deze PDF
// bevat de juridische voorwaarden bij de overeenkomst (aansprakelijkheid, verzekering,
// privacy/AVG, betalings-/opzegvoorwaarden, …) en wordt — per contract aan/uit te
// zetten — als pagina's meegevoegd in het samengevoegde contractdocument.
//
// Het bestand staat in een privé Supabase Storage-bucket; op het Stable-model bewaren
// we enkel het storage-pad (algemeneVoorwaardenPath). Inzage/gebruik loopt server-side:
// voor de UI via een signed URL, voor de PDF-merge via de ruwe bytes. Analoog aan het
// stallogo-patroon (logoStorage.ts).

// Privé bucket voor algemene-voorwaarden-PDF's.
export const STABLE_AV_BUCKET = 'stable-algemene-voorwaarden'

// Geldigheid van een signed URL (10 minuten) — genoeg om te openen/downloaden.
const SIGNED_URL_TTL_SECONDS = 600

// Zorgt dat de (privé) bucket bestaat. Idempotent: bestaat hij al, dan gebeurt er
// niets. Zo werkt uploaden ook zonder handmatige bucket-provisioning.
async function ensureAvBucket(
  supabase: ReturnType<typeof createAdminClient>,
): Promise<void> {
  const { data } = await supabase.storage.getBucket(STABLE_AV_BUCKET)
  if (data) return
  const { error } = await supabase.storage.createBucket(STABLE_AV_BUCKET, {
    public: false,
  })
  if (error && !/already exists/i.test(error.message)) {
    throw new Error(`AV-bucket aanmaken mislukt: ${error.message}`)
  }
}

// Schrijft een nieuwe algemene-voorwaarden-PDF naar Storage en koppelt het pad aan de
// stal. Een eventueel bestaand bestand wordt eerst verwijderd zodat er niets blijft
// rondslingeren (vervangen i.p.v. stapelen).
export async function slaAlgemeneVoorwaardenOp(params: {
  stableId: string
  buffer: Buffer
}): Promise<void> {
  const { stableId, buffer } = params

  const supabase = createAdminClient()
  await ensureAvBucket(supabase)

  // Bestaand bestand opruimen.
  const huidig = await prisma.stable.findUnique({
    where: { id: stableId },
    select: { algemeneVoorwaardenPath: true },
  })
  if (huidig?.algemeneVoorwaardenPath) {
    await supabase.storage.from(STABLE_AV_BUCKET).remove([huidig.algemeneVoorwaardenPath])
  }

  const storagePath = `${stableId}/algemene-voorwaarden-${Date.now()}.pdf`

  const { error } = await supabase.storage
    .from(STABLE_AV_BUCKET)
    .upload(storagePath, buffer, { contentType: 'application/pdf', upsert: true })
  if (error) {
    throw new Error(`Algemene voorwaarden opslaan mislukt: ${error.message}`)
  }

  await prisma.stable.update({
    where: { id: stableId },
    data: { algemeneVoorwaardenPath: storagePath },
  })
}

// Verwijdert de algemene voorwaarden uit Storage én maakt het pad leeg. Faalt het
// opschonen van Storage niet hard: het DB-veld is leidend voor het gedrag.
export async function verwijderAlgemeneVoorwaarden(stableId: string): Promise<void> {
  const stable = await prisma.stable.findUnique({
    where: { id: stableId },
    select: { algemeneVoorwaardenPath: true },
  })
  if (!stable?.algemeneVoorwaardenPath) return

  const supabase = createAdminClient()
  await supabase.storage
    .from(STABLE_AV_BUCKET)
    .remove([stable.algemeneVoorwaardenPath])
  await prisma.stable.update({
    where: { id: stableId },
    data: { algemeneVoorwaardenPath: null },
  })
}

// Geeft een tijdelijke (signed) URL terug voor de algemene voorwaarden (preview in de
// UI), of null wanneer er geen AV-PDF is. De autorisatie wordt door de aanroeper
// afgedwongen.
export async function getAlgemeneVoorwaardenSignedUrl(
  stableId: string,
): Promise<string | null> {
  const stable = await prisma.stable.findUnique({
    where: { id: stableId },
    select: { algemeneVoorwaardenPath: true },
  })
  if (!stable?.algemeneVoorwaardenPath) return null

  const supabase = createAdminClient()
  const { data, error } = await supabase.storage
    .from(STABLE_AV_BUCKET)
    .createSignedUrl(stable.algemeneVoorwaardenPath, SIGNED_URL_TTL_SECONDS)
  if (error || !data) return null
  return data.signedUrl
}

// Haalt de ruwe bytes van de algemene-voorwaarden-PDF op (voor de server-side
// PDF-merge), of null wanneer er geen AV-PDF is of het downloaden mislukt.
export async function getAlgemeneVoorwaardenBytes(
  stableId: string,
): Promise<Buffer | null> {
  const stable = await prisma.stable.findUnique({
    where: { id: stableId },
    select: { algemeneVoorwaardenPath: true },
  })
  if (!stable?.algemeneVoorwaardenPath) return null

  const supabase = createAdminClient()
  const { data, error } = await supabase.storage
    .from(STABLE_AV_BUCKET)
    .download(stable.algemeneVoorwaardenPath)
  if (error || !data) return null

  const arrayBuffer = await data.arrayBuffer()
  return Buffer.from(arrayBuffer)
}
