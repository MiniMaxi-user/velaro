'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getStableRole } from '@/lib/auth/authorization'
import type { LeaseType } from '@prisma/client'

// ── Lease-aanbod beheren (Lease 03, #62) ─────────────────────────────────────
// CRUD op het lease-aanbod (LeaseListing) van een paard. Alleen OWNER/STAFF van de
// stal van het paard mag een aanbod beheren — dezelfde grens als paard bewerken.
// Eén actief beheerd aanbod per paard: een tweede aanmaken wordt geweigerd.

async function getAutorisatie(horseId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const horse = await prisma.horse.findUnique({
    where: { id: horseId },
    select: { stableId: true },
  })
  if (!horse) throw new Error('Paard niet gevonden')

  const role = await getStableRole(user.id, horse.stableId)
  if (!role) throw new Error('Geen toegang')
  return { user, role }
}

const GELDIGE_TYPES: LeaseType[] = ['FULL', 'DEEL', 'BIJRIJDEN', 'WEDSTRIJD', 'KOOPOPTIE', 'FOK']

// Leest en valideert de gedeelde listing-velden uit het formulier.
function leesListingVelden(formData: FormData) {
  const leaseType = formData.get('leaseType') as LeaseType
  if (!GELDIGE_TYPES.includes(leaseType)) {
    throw new Error('Kies een geldige leasevorm')
  }

  const prijsStr = (formData.get('pricePerMonth') as string)?.trim()
  if (!prijsStr) throw new Error('Een prijs per maand is verplicht')
  const prijs = Number(prijsStr)
  if (Number.isNaN(prijs) || prijs < 0) throw new Error('Vul een geldige prijs in')

  const dagenStr = (formData.get('daysPerWeek') as string)?.trim()
  const dagen = dagenStr ? parseInt(dagenStr, 10) : null

  return {
    leaseType,
    pricePerMonth: prijsStr, // Prisma accepteert een numerieke string voor een Decimal-veld
    daysPerWeek: dagen && dagen > 0 ? dagen : null,
    region: (formData.get('region') as string)?.trim() || null,
    discipline: (formData.get('discipline') as string)?.trim() || null,
    movable: formData.get('movable') === 'on',
    exclusive: formData.get('exclusive') === 'on',
    description: (formData.get('description') as string)?.trim() || null,
  }
}

export async function createLeaseListing(horseId: string, formData: FormData) {
  await getAutorisatie(horseId)

  const bestaand = await prisma.leaseListing.findFirst({ where: { horseId } })
  if (bestaand) {
    throw new Error('Dit paard heeft al een lease-aanbod. Bewerk het bestaande aanbod.')
  }

  const velden = leesListingVelden(formData)
  await prisma.leaseListing.create({ data: { horseId, isActive: true, ...velden } })

  revalidatePath(`/paarden/${horseId}`)
  redirect(`/paarden/${horseId}?tab=lease`)
}

export async function updateLeaseListing(id: string, horseId: string, formData: FormData) {
  await getAutorisatie(horseId)
  const velden = leesListingVelden(formData)
  await prisma.leaseListing.update({ where: { id }, data: velden })

  revalidatePath(`/paarden/${horseId}`)
  redirect(`/paarden/${horseId}?tab=lease`)
}

export async function toggleLeaseListingActive(
  id: string,
  horseId: string,
  isActive: boolean,
): Promise<{ error: string } | undefined> {
  try {
    await getAutorisatie(horseId)
    await prisma.leaseListing.update({ where: { id }, data: { isActive } })
    revalidatePath(`/paarden/${horseId}`)
    return undefined
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Bijwerken is mislukt.' }
  }
}

export async function deleteLeaseListing(
  id: string,
  horseId: string,
): Promise<{ error: string } | undefined> {
  try {
    await getAutorisatie(horseId)
    await prisma.leaseListing.delete({ where: { id } })
    revalidatePath(`/paarden/${horseId}`)
    return undefined
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Verwijderen is mislukt.' }
  }
}
