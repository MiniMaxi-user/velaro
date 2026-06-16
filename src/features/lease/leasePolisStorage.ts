import { createAdminClient } from '@/lib/supabase/admin'

// ── Polis-opslag in Supabase Storage (Lease 08, #67) ─────────────────────────
// Verzekeringspolissen bij een lease staan in een privé bucket; in Lease.config
// bewaren we enkel het storage-pad. Inzage via signed URL. Analoog aan het
// paardfoto-/contractbijlage-patroon.

export const LEASE_POLIS_BUCKET = 'lease-polissen'
const SIGNED_URL_TTL_SECONDS = 600

async function ensureBucket(supabase: ReturnType<typeof createAdminClient>): Promise<void> {
  const { data } = await supabase.storage.getBucket(LEASE_POLIS_BUCKET)
  if (data) return
  const { error } = await supabase.storage.createBucket(LEASE_POLIS_BUCKET, { public: false })
  if (error && !/already exists/i.test(error.message)) {
    throw new Error(`Polis-bucket aanmaken mislukt: ${error.message}`)
  }
}

export async function uploadPolisBestand(params: {
  leaseId: string
  bestandsnaam: string
  buffer: Buffer
  contentType: string
}): Promise<string> {
  const { leaseId, bestandsnaam, buffer, contentType } = params
  const supabase = createAdminClient()
  await ensureBucket(supabase)

  const punt = bestandsnaam.lastIndexOf('.')
  const ext = punt >= 0 ? bestandsnaam.slice(punt).replace(/[^.a-zA-Z0-9]/g, '') : ''
  const storagePath = `${leaseId}/polis-${Date.now()}${ext}`

  const { error } = await supabase.storage
    .from(LEASE_POLIS_BUCKET)
    .upload(storagePath, buffer, { contentType, upsert: true })
  if (error) throw new Error(`Polis-opslag mislukt: ${error.message}`)
  return storagePath
}

export async function removePolisBestand(storagePath: string): Promise<void> {
  const supabase = createAdminClient()
  await supabase.storage.from(LEASE_POLIS_BUCKET).remove([storagePath])
}

export async function getPolisSignedUrls(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {}
  const supabase = createAdminClient()
  const result: Record<string, string> = {}
  await Promise.all(
    paths.map(async (p) => {
      const { data, error } = await supabase.storage
        .from(LEASE_POLIS_BUCKET)
        .createSignedUrl(p, SIGNED_URL_TTL_SECONDS)
      if (!error && data) result[p] = data.signedUrl
    }),
  )
  return result
}
