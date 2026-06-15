'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getStableRole } from '@/lib/auth/authorization'
import { slaPaardFotoOp, verwijderPaardFoto } from './paardFotoStorage'
import { valideerPaardFoto } from './paardFotoValidatie'

// ── Paardfoto-acties (#118) ──────────────────────────────────────────────────
// Uploaden/verwijderen van de profielfoto van een paard. Autorisatie (alleen
// OWNER/STAFF van de stal van het paard — dezelfde grens als paard bewerken) en
// validatie worden server-side afgedwongen; de client-component verzorgt alleen de
// interactie (inclusief het bijsnijden vóór upload). Analoog aan logoActions.ts.

// Bevestigt dat de huidige gebruiker OWNER/STAFF is van de stal van het paard. Geeft
// het horseId terug of een foutmelding (geen toegang).
async function getStaffHorseId(
  horseId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const horse = await prisma.horse.findUnique({
    where: { id: horseId },
    select: { stableId: true },
  })
  if (!horse) return { ok: false, error: 'Paard niet gevonden.' }

  const role = await getStableRole(user.id, horse.stableId)
  if (!role) {
    return { ok: false, error: 'Alleen de stal (eigenaar/medewerker) kan de paardfoto beheren.' }
  }
  return { ok: true }
}

// Upload (of vervang) de paardfoto. Geeft een foutmelding terug bij validatie- of
// autorisatieproblemen, of undefined bij succes.
export async function uploadPaardFoto(
  horseId: string,
  formData: FormData,
): Promise<{ error: string } | undefined> {
  const ctx = await getStaffHorseId(horseId)
  if (!ctx.ok) return { error: ctx.error }

  const file = formData.get('foto')
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'Kies een foto om te uploaden.' }
  }

  const fout = valideerPaardFoto({
    mimeType: file.type,
    grootteBytes: file.size,
  })
  if (fout) return { error: fout }

  const buffer = Buffer.from(await file.arrayBuffer())
  await slaPaardFotoOp({
    horseId,
    bestandsnaam: file.name || 'foto',
    buffer,
    contentType: file.type || 'application/octet-stream',
  })

  revalidatePath(`/paarden/${horseId}`)
  revalidatePath(`/paarden/${horseId}/bewerken`)
  revalidatePath('/paarden')
}

// Verwijder de paardfoto (alles valt daarna terug op het standaard paard-icoon).
export async function deletePaardFoto(
  horseId: string,
): Promise<{ error: string } | undefined> {
  const ctx = await getStaffHorseId(horseId)
  if (!ctx.ok) return { error: ctx.error }

  await verwijderPaardFoto(horseId)

  revalidatePath(`/paarden/${horseId}`)
  revalidatePath(`/paarden/${horseId}/bewerken`)
  revalidatePath('/paarden')
}
