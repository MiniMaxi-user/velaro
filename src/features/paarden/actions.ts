'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getStableRole } from '@/lib/auth/authorization'
import type { HorseSex } from '@prisma/client'
import { getUserStable } from './queries'
import { createAdminClient } from '@/lib/supabase/admin'

async function getCurrentUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return user
}

function parseHorseFormData(formData: FormData) {
  const name = (formData.get('name') as string)?.trim()
  if (!name) throw new Error('Naam is verplicht')

  const dateOfBirthStr = formData.get('dateOfBirth') as string
  const sexStr = formData.get('sex') as string

  const chipNumberRaw = (formData.get('chipNumber') as string)?.trim() || null
  const chipNumberDigits = chipNumberRaw ? chipNumberRaw.replace(/\D/g, '') : null
  const chipNumber = chipNumberDigits || null
  if (chipNumber && chipNumber.length !== 15) {
    throw new Error('Chipnummer moet exact 15 cijfers bevatten (spaties en streepjes worden automatisch verwijderd)')
  }

  const excludedFromConsumption = formData.get('excludedFromConsumption') === 'true'
  const excludedDateStr = formData.get('excludedFromConsumptionDate') as string

  return {
    name,
    breed: (formData.get('breed') as string)?.trim() || null,
    dateOfBirth: dateOfBirthStr ? new Date(dateOfBirthStr) : null,
    sex: sexStr ? (sexStr as HorseSex) : null,
    color: (formData.get('color') as string)?.trim() || null,
    chipNumber,
    ueln: (formData.get('ueln') as string)?.trim() || null,
    passportNumber: (formData.get('passportNumber') as string)?.trim() || null,
    boxNumber: (formData.get('boxNumber') as string)?.trim() || null,
    sireName: (formData.get('sireName') as string)?.trim() || null,
    damName: (formData.get('damName') as string)?.trim() || null,
    discipline: (formData.get('discipline') as string)?.trim() || null,
    disciplineLevel: (formData.get('disciplineLevel') as string)?.trim() || null,
    excludedFromConsumption,
    excludedFromConsumptionDate:
      excludedFromConsumption && excludedDateStr ? new Date(excludedDateStr) : null,
  }
}

export async function createHorse(formData: FormData) {
  const user = await getCurrentUser()

  const stable = await getUserStable(user.id)
  if (!stable) throw new Error('Geen stal gevonden voor deze gebruiker')

  const role = await getStableRole(user.id, stable.id)
  if (!role) throw new Error('Geen toegang')

  const data = parseHorseFormData(formData)

  const horse = await prisma.horse.create({
    data: { ...data, stableId: stable.id },
  })

  revalidatePath('/paarden')
  redirect(`/paarden/${horse.id}`)
}

export async function updateHorse(id: string, formData: FormData) {
  const user = await getCurrentUser()

  const horse = await prisma.horse.findUnique({ where: { id } })
  if (!horse) throw new Error('Paard niet gevonden')

  const role = await getStableRole(user.id, horse.stableId)
  if (!role) throw new Error('Geen toegang')

  const data = parseHorseFormData(formData)

  await prisma.horse.update({ where: { id }, data })

  revalidatePath(`/paarden/${id}`)
  redirect(`/paarden/${id}`)
}

// ── Personen (eigenaar / bereider) ──────────────────────────────────────────
// Een persoon (account) is via HorsePerson aan een paard gekoppeld met één of
// beide rollen (isOwner / isRider). App-invariant: minstens één rol actief,
// anders bestaat de koppeling niet.

type PersonRole = 'owner' | 'rider'

function parseRoles(formData: FormData): { isOwner: boolean; isRider: boolean } {
  return {
    isOwner: formData.get('isOwner') === 'true',
    isRider: formData.get('isRider') === 'true',
  }
}

type StaffHorse = Awaited<ReturnType<typeof prisma.horse.findUnique>>

// Helper: laad het paard en controleer dat de huidige gebruiker OWNER/STAFF is.
async function getStaffHorse(
  horseId: string
): Promise<{ error: string } | { error?: undefined; horse: NonNullable<StaffHorse> }> {
  const user = await getCurrentUser()

  const horse = await prisma.horse.findUnique({ where: { id: horseId } })
  if (!horse) return { error: 'Paard niet gevonden' }

  const role = await getStableRole(user.id, horse.stableId)
  if (!role) return { error: 'Geen toegang' }

  return { horse }
}

/**
 * Koppelt een bestaande persoon (account) via e-mailadres aan een paard met de
 * gekozen rollen. Minstens één rol is verplicht.
 */
export async function addHorsePerson(
  horseId: string,
  formData: FormData
): Promise<{ error: string } | undefined> {
  const ctx = await getStaffHorse(horseId)
  if (ctx.error) return { error: ctx.error }

  const email = (formData.get('email') as string)?.trim().toLowerCase()
  if (!email) return { error: 'E-mailadres is verplicht' }

  const { isOwner, isRider } = parseRoles(formData)
  if (!isOwner && !isRider) return { error: 'Kies minstens één rol (eigenaar of bereider).' }

  const targetUser = await prisma.user.findUnique({ where: { email } })
  if (!targetUser)
    return { error: `Geen account gevonden voor ${email}. Vraag deze persoon eerst in te loggen op Velaro, of maak een account aan.` }

  const existing = await prisma.horsePerson.findUnique({
    where: { horseId_userId: { horseId, userId: targetUser.id } },
  })
  if (existing) return { error: 'Deze persoon is al gekoppeld aan dit paard' }

  await prisma.horsePerson.create({
    data: { horseId, userId: targetUser.id, isOwner, isRider },
  })

  revalidatePath(`/paarden/${horseId}`)
}

/**
 * Zet één rol (eigenaar/bereider) van een gekoppelde persoon aan of uit. Wordt
 * de laatste actieve rol uitgezet, dan wordt de persoon ontkoppeld (de koppeling
 * verwijderd) — een koppeling zonder rol bestaat niet.
 */
export async function toggleHorsePersonRole(
  horseId: string,
  personId: string,
  role: PersonRole,
  enabled: boolean
): Promise<{ error: string } | undefined> {
  const ctx = await getStaffHorse(horseId)
  if (ctx.error) return { error: ctx.error }

  const person = await prisma.horsePerson.findUnique({ where: { id: personId } })
  if (!person || person.horseId !== horseId) return { error: 'Persoon niet gevonden' }

  const next = {
    isOwner: role === 'owner' ? enabled : person.isOwner,
    isRider: role === 'rider' ? enabled : person.isRider,
  }

  // Laatste rol uitgezet → ontkoppelen.
  if (!next.isOwner && !next.isRider) {
    await prisma.horsePerson.delete({ where: { id: personId } })
  } else {
    await prisma.horsePerson.update({ where: { id: personId }, data: next })
  }

  revalidatePath(`/paarden/${horseId}`)
}

/**
 * Ontkoppelt een persoon volledig van het paard (verwijdert alle rollen).
 */
export async function removeHorsePerson(
  horseId: string,
  personId: string
): Promise<{ error: string } | undefined> {
  const ctx = await getStaffHorse(horseId)
  if (ctx.error) return { error: ctx.error }

  const person = await prisma.horsePerson.findUnique({ where: { id: personId } })
  if (!person || person.horseId !== horseId) return { error: 'Persoon niet gevonden' }

  await prisma.horsePerson.delete({ where: { id: personId } })

  revalidatePath(`/paarden/${horseId}`)
}

/**
 * Maakt een account aan (of hergebruikt een bestaand account) en koppelt de
 * persoon met de gekozen rollen aan het paard. Minstens één rol is verplicht.
 */
export async function createAndLinkPerson(
  horseId: string,
  formData: FormData
): Promise<{ error: string } | undefined> {
  const ctx = await getStaffHorse(horseId)
  if (ctx.error) return { error: ctx.error }

  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const name = (formData.get('name') as string)?.trim() || null
  const password = formData.get('password') as string

  if (!email) return { error: 'E-mailadres is verplicht' }
  if (!password || password.length < 8) return { error: 'Wachtwoord moet minimaal 8 tekens bevatten' }

  const { isOwner, isRider } = parseRoles(formData)
  if (!isOwner && !isRider) return { error: 'Kies minstens één rol (eigenaar of bereider).' }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    const alreadyLinked = await prisma.horsePerson.findUnique({
      where: { horseId_userId: { horseId, userId: existing.id } },
    })
    if (alreadyLinked) return { error: 'Deze persoon is al gekoppeld aan dit paard' }
    await prisma.horsePerson.create({ data: { horseId, userId: existing.id, isOwner, isRider } })
    revalidatePath(`/paarden/${horseId}`)
    redirect(`/paarden/${horseId}`)
  }

  const adminClient = createAdminClient()
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) return { error: `Fout bij aanmaken account: ${authError.message}` }

  try {
    await prisma.user.create({
      data: { id: authData.user.id, email, name, maxStables: 0, isPlatformAdmin: false },
    })
    await prisma.horsePerson.create({ data: { horseId, userId: authData.user.id, isOwner, isRider } })
  } catch {
    await adminClient.auth.admin.deleteUser(authData.user.id)
    return { error: 'Fout bij opslaan in database. Account is teruggedraaid.' }
  }

  revalidatePath(`/paarden/${horseId}`)
  redirect(`/paarden/${horseId}`)
}

export async function saveFeedingPlan(
  horseId: string,
  formData: FormData
): Promise<{ error: string } | undefined> {
  const user = await getCurrentUser()

  const horse = await prisma.horse.findUnique({ where: { id: horseId } })
  if (!horse) return { error: 'Paard niet gevonden' }

  const role = await getStableRole(user.id, horse.stableId)
  if (!role) return { error: 'Geen toegang' }

  const veld = (key: string) => (formData.get(key) as string)?.trim() || null

  const data = {
    roughage: veld('roughage'),
    concentrate: veld('concentrate'),
    supplements: veld('supplements'),
    restrictions: veld('restrictions'),
    notes: veld('notes'),
  }

  await prisma.feedingPlan.upsert({
    where: { horseId },
    create: { horseId, ...data },
    update: data,
  })

  revalidatePath(`/paarden/${horseId}`)
}

export async function deleteHorse(id: string) {
  const user = await getCurrentUser()

  const horse = await prisma.horse.findUnique({ where: { id } })
  if (!horse) throw new Error('Paard niet gevonden')

  const role = await getStableRole(user.id, horse.stableId)
  if (role !== 'OWNER') throw new Error('Alleen staleigenaren mogen paarden verwijderen')

  await prisma.horse.delete({ where: { id } })

  revalidatePath('/paarden')
  redirect('/paarden')
}
