'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getStableRole } from '@/lib/auth/authorization'
import { getUserStable } from '@/features/paarden/queries'
import { slaStableLogoOp, verwijderStableLogo } from './logoStorage'
import { valideerLogo } from './logoValidatie'

// ── Stallogo-acties (#98) ────────────────────────────────────────────────────
// Uploaden/verwijderen van het stallogo voor de actieve stal. Autorisatie (alleen
// OWNER van de actieve stal) en validatie worden server-side afgedwongen; de
// client-component verzorgt alleen de interactie.

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
    return { ok: false, error: 'Alleen staleigenaren kunnen het stallogo beheren.' }
  }
  return { ok: true, stableId: stable.id }
}

// Upload (of vervang) het stallogo. Geeft een foutmelding terug bij validatie- of
// autorisatieproblemen, of undefined bij succes.
export async function uploadStableLogo(
  formData: FormData,
): Promise<{ error: string } | undefined> {
  const ctx = await getOwnerStableId()
  if (!ctx.ok) return { error: ctx.error }

  const file = formData.get('logo')
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'Kies een bestand om te uploaden.' }
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const fout = valideerLogo({
    mimeType: file.type,
    grootteBytes: file.size,
    buffer,
  })
  if (fout) return { error: fout }

  await slaStableLogoOp({
    stableId: ctx.stableId,
    bestandsnaam: file.name || 'logo',
    buffer,
    contentType: file.type || 'application/octet-stream',
  })

  revalidatePath('/stal/instellingen')
}

// Verwijder het stallogo (de contract-PDF valt daarna terug op het Velaro-logo).
export async function deleteStableLogo(): Promise<{ error: string } | undefined> {
  const ctx = await getOwnerStableId()
  if (!ctx.ok) return { error: ctx.error }

  await verwijderStableLogo(ctx.stableId)
  revalidatePath('/stal/instellingen')
}
