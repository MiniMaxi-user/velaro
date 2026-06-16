'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getStableRole } from '@/lib/auth/authorization'
import { leesVerzekering, POLIS_TYPE_LABELS, type Meeverzekerd, type PolisType } from './leaseVerzekeringConfig'
import { uploadPolisBestand, removePolisBestand } from './leasePolisStorage'
import type { Prisma } from '@prisma/client'

// ── Verzekering-acties (Lease 08, #67) ───────────────────────────────────────

async function getStalLease(leaseId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const lease = await prisma.lease.findUnique({
    where: { id: leaseId },
    include: { horse: { select: { stableId: true } } },
  })
  if (!lease) throw new Error('Lease niet gevonden')
  const role = await getStableRole(user.id, lease.horse.stableId)
  if (!role) throw new Error('Alleen de stal kan de verzekeringsgegevens beheren')
  return lease
}

function mergeVerzekering(lease: Awaited<ReturnType<typeof getStalLease>>, patch: Record<string, unknown>) {
  const huidigConfig =
    lease.config && typeof lease.config === 'object' && !Array.isArray(lease.config)
      ? (lease.config as Record<string, unknown>)
      : {}
  const huidigeVerzekering = leesVerzekering(lease.config)
  return {
    ...huidigConfig,
    verzekeringBlok: { ...huidigeVerzekering, ...patch },
  } as unknown as Prisma.InputJsonValue
}

export async function saveVerzekering(leaseId: string, formData: FormData) {
  const lease = await getStalLease(leaseId)

  const mvRaw = formData.get('meeverzekerd') as string
  const meeverzekerd: Meeverzekerd | null = mvRaw === 'JA' ? 'JA' : mvRaw === 'NEE' ? 'NEE' : null

  const config = mergeVerzekering(lease, {
    meeverzekerd,
    risicoAcceptatie: formData.get('risicoAcceptatie') === 'on',
    dekkingOngevallen: formData.get('dekkingOngevallen') === 'on',
    risicoBevestigd: formData.get('risicoBevestigd') === 'on',
  })

  await prisma.lease.update({ where: { id: leaseId }, data: { config } })
  revalidatePath(`/lease/${leaseId}/verzekering`)
  redirect(`/lease/${leaseId}/verzekering`)
}

const TOEGESTAAN: Record<string, true> = {
  'application/pdf': true,
  'image/png': true,
  'image/jpeg': true,
}

export async function uploadPolis(leaseId: string, formData: FormData) {
  const lease = await getStalLease(leaseId)

  const type = formData.get('type') as PolisType
  if (!POLIS_TYPE_LABELS[type]) throw new Error('Kies een polistype')

  const file = formData.get('bestand')
  if (!(file instanceof File) || file.size === 0) throw new Error('Kies een bestand')
  if (!TOEGESTAAN[file.type]) throw new Error('Alleen PDF, PNG of JPG is toegestaan')

  const buffer = Buffer.from(await file.arrayBuffer())
  const storagePath = await uploadPolisBestand({
    leaseId,
    bestandsnaam: file.name || 'polis',
    buffer,
    contentType: file.type,
  })

  const verzekering = leesVerzekering(lease.config)
  const polissen = [
    ...verzekering.polissen,
    { id: randomUUID(), type, bestandsnaam: file.name || 'polis', storagePath, uploadedAt: new Date().toISOString() },
  ]
  const config = mergeVerzekering(lease, { polissen })

  await prisma.lease.update({ where: { id: leaseId }, data: { config } })
  revalidatePath(`/lease/${leaseId}/verzekering`)
  redirect(`/lease/${leaseId}/verzekering`)
}

export async function deletePolis(leaseId: string, polisId: string) {
  const lease = await getStalLease(leaseId)
  const verzekering = leesVerzekering(lease.config)
  const polis = verzekering.polissen.find((p) => p.id === polisId)
  if (polis) {
    await removePolisBestand(polis.storagePath)
    const polissen = verzekering.polissen.filter((p) => p.id !== polisId)
    const config = mergeVerzekering(lease, { polissen })
    await prisma.lease.update({ where: { id: leaseId }, data: { config } })
  }
  revalidatePath(`/lease/${leaseId}/verzekering`)
  redirect(`/lease/${leaseId}/verzekering`)
}
