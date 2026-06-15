import { prisma } from '@/lib/prisma'
import { createAdminClient } from '@/lib/supabase/admin'

// ── Paardfoto-opslag in Supabase Storage (#118) ──────────────────────────────
// Een OWNER/STAFF kan per paard een profielfoto uploaden die in lijsten, op het
// profiel en op de contract-PDF verschijnt. Het bestand staat in een privé
// Supabase Storage-bucket; op het Horse-model bewaren we enkel het storage-pad
// (photoPath). Inzage/gebruik loopt server-side: voor de UI via een signed URL,
// voor de PDF via een data-URL. Volledig analoog aan het stallogo-patroon (#98).

// Privé bucket voor paardfoto's.
export const HORSE_PHOTO_BUCKET = 'horse-photos'

// Geldigheid van een signed URL (10 minuten) — genoeg voor een preview.
const SIGNED_URL_TTL_SECONDS = 600

// Zorgt dat de (privé) bucket bestaat. Idempotent: bestaat hij al, dan gebeurt er
// niets. Zo werkt uploaden ook zonder handmatige bucket-provisioning.
async function ensureHorsePhotoBucket(
  supabase: ReturnType<typeof createAdminClient>,
): Promise<void> {
  const { data } = await supabase.storage.getBucket(HORSE_PHOTO_BUCKET)
  if (data) return
  const { error } = await supabase.storage.createBucket(HORSE_PHOTO_BUCKET, {
    public: false,
  })
  if (error && !/already exists/i.test(error.message)) {
    throw new Error(`Foto-bucket aanmaken mislukt: ${error.message}`)
  }
}

// Schrijft een nieuwe paardfoto naar Storage en koppelt het pad aan het paard. Een
// eventueel bestaande foto wordt eerst verwijderd zodat er niets blijft rondslingeren.
export async function slaPaardFotoOp(params: {
  horseId: string
  bestandsnaam: string
  buffer: Buffer
  contentType: string
}): Promise<void> {
  const { horseId, bestandsnaam, buffer, contentType } = params

  const supabase = createAdminClient()
  await ensureHorsePhotoBucket(supabase)

  // Bestaande foto opruimen (vervangen i.p.v. stapelen).
  const huidig = await prisma.horse.findUnique({
    where: { id: horseId },
    select: { photoPath: true },
  })
  if (huidig?.photoPath) {
    await supabase.storage.from(HORSE_PHOTO_BUCKET).remove([huidig.photoPath])
  }

  // Veilige bestandsextensie afleiden (alleen voor de key).
  const punt = bestandsnaam.lastIndexOf('.')
  const ext = punt >= 0 ? bestandsnaam.slice(punt).replace(/[^.a-zA-Z0-9]/g, '') : ''
  const storagePath = `${horseId}/foto-${Date.now()}${ext}`

  const { error } = await supabase.storage
    .from(HORSE_PHOTO_BUCKET)
    .upload(storagePath, buffer, { contentType, upsert: true })
  if (error) {
    throw new Error(`Foto-opslag mislukt: ${error.message}`)
  }

  await prisma.horse.update({
    where: { id: horseId },
    data: { photoPath: storagePath },
  })
}

// Verwijdert de paardfoto uit Storage én maakt photoPath leeg. Faalt het opschonen
// van Storage niet hard: het DB-veld is leidend voor het gedrag (fallback op icoon).
export async function verwijderPaardFoto(horseId: string): Promise<void> {
  const horse = await prisma.horse.findUnique({
    where: { id: horseId },
    select: { photoPath: true },
  })
  if (!horse?.photoPath) return

  const supabase = createAdminClient()
  await supabase.storage.from(HORSE_PHOTO_BUCKET).remove([horse.photoPath])
  await prisma.horse.update({
    where: { id: horseId },
    data: { photoPath: null },
  })
}

// Geeft een tijdelijke (signed) URL terug voor de paardfoto (preview in de UI), of
// null wanneer er geen foto is. De autorisatie wordt door de aanroeper afgedwongen.
export async function getPaardFotoSignedUrl(horseId: string): Promise<string | null> {
  const horse = await prisma.horse.findUnique({
    where: { id: horseId },
    select: { photoPath: true },
  })
  if (!horse?.photoPath) return null

  const supabase = createAdminClient()
  const { data, error } = await supabase.storage
    .from(HORSE_PHOTO_BUCKET)
    .createSignedUrl(horse.photoPath, SIGNED_URL_TTL_SECONDS)
  if (error || !data) return null
  return data.signedUrl
}

// Maakt in één keer signed URL's aan voor een set paard-foto-paden. Lijsten halen
// meerdere paarden op; deze batch-variant voorkomt een losse query/aanroep per rij.
// Sleutel = horseId, waarde = signed URL (of afwezig wanneer er geen foto is). De
// autorisatie wordt door de aanroeper afgedwongen.
export async function getPaardFotoSignedUrls(
  horses: { id: string; photoPath: string | null }[],
): Promise<Record<string, string>> {
  const metFoto = horses.filter((h) => h.photoPath)
  if (metFoto.length === 0) return {}

  const supabase = createAdminClient()
  const result: Record<string, string> = {}

  await Promise.all(
    metFoto.map(async (h) => {
      const { data, error } = await supabase.storage
        .from(HORSE_PHOTO_BUCKET)
        .createSignedUrl(h.photoPath as string, SIGNED_URL_TTL_SECONDS)
      if (!error && data) result[h.id] = data.signedUrl
    }),
  )

  return result
}

// Leidt het MIME-type van de foto af uit de bestandsextensie van het storage-pad.
function fotoMimeUitPad(photoPath: string): string {
  const ext = photoPath.slice(photoPath.lastIndexOf('.') + 1).toLowerCase()
  switch (ext) {
    case 'png':
      return 'image/png'
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    default:
      return 'application/octet-stream'
  }
}

// Geeft de paardfoto terug als data-URL (voor inbedding in de contract-PDF), of null
// wanneer er geen foto is of het downloaden mislukt. De PDF toont dan geen foto.
export async function getPaardFotoDataUrl(horseId: string): Promise<string | null> {
  const horse = await prisma.horse.findUnique({
    where: { id: horseId },
    select: { photoPath: true },
  })
  if (!horse?.photoPath) return null

  const supabase = createAdminClient()
  const { data, error } = await supabase.storage
    .from(HORSE_PHOTO_BUCKET)
    .download(horse.photoPath)
  if (error || !data) return null

  const arrayBuffer = await data.arrayBuffer()
  const bytes = Buffer.from(arrayBuffer)
  return `data:${fotoMimeUitPad(horse.photoPath)};base64,${bytes.toString('base64')}`
}
