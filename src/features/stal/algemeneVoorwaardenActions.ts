'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getStableRole } from '@/lib/auth/authorization'
import { getUserStable } from '@/features/paarden/queries'
import {
  slaAlgemeneVoorwaardenOp,
  verwijderAlgemeneVoorwaarden,
} from './algemeneVoorwaardenStorage'

// ── Algemene-voorwaarden-acties (#143) ───────────────────────────────────────
// Uploaden/verwijderen van de algemene-voorwaarden-PDF voor de actieve stal. De AV
// zijn de juridische voorwaarden bij de overeenkomst en worden per contract aan/uit
// gezet. Autorisatie (alleen OWNER van de actieve stal) en validatie worden server-
// side afgedwongen; de client-component verzorgt alleen de interactie.

// Alleen PDF, maximaal 15 MB — algemene voorwaarden zijn doorgaans enkele pagina's.
const AV_MAX_BYTES = 15 * 1024 * 1024

// Bevestigt dat de huidige gebruiker OWNER van de actieve stal is. Geeft de stal-id
// terug of een foutmelding (geen toegang).
async function getOwnerStableId(): Promise<
  { ok: true; stableId: string } | { ok: false; error: string }
> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const stable = await getUserStable(user.id)
  if (!stable) return { ok: false, error: 'Geen actieve stal gevonden' }

  const role = await getStableRole(user.id, stable.id)
  if (role !== 'OWNER') {
    return {
      ok: false,
      error: 'Alleen staleigenaren kunnen de algemene voorwaarden beheren.',
    }
  }
  return { ok: true, stableId: stable.id }
}

// Upload (of vervang) de algemene-voorwaarden-PDF. Geeft een foutmelding terug bij
// validatie- of autorisatieproblemen, of undefined bij succes.
export async function uploadAlgemeneVoorwaarden(
  formData: FormData,
): Promise<{ error: string } | undefined> {
  const ctx = await getOwnerStableId()
  if (!ctx.ok) return { error: ctx.error }

  const file = formData.get('algemeneVoorwaarden')
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'Kies een PDF-bestand om te uploaden.' }
  }
  if (file.type && file.type !== 'application/pdf') {
    return { error: 'De algemene voorwaarden moeten een PDF-bestand zijn.' }
  }
  if (file.size > AV_MAX_BYTES) {
    return { error: 'Het bestand is te groot (maximaal 15 MB).' }
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  await slaAlgemeneVoorwaardenOp({ stableId: ctx.stableId, buffer })

  revalidatePath('/stal/instellingen')
}

// Verwijder de algemene-voorwaarden-PDF van de actieve stal.
export async function deleteAlgemeneVoorwaarden(): Promise<
  { error: string } | undefined
> {
  const ctx = await getOwnerStableId()
  if (!ctx.ok) return { error: ctx.error }

  await verwijderAlgemeneVoorwaarden(ctx.stableId)
  revalidatePath('/stal/instellingen')
}
