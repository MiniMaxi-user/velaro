'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getStableRole } from '@/lib/auth/authorization'
import type { HorseSex } from '@prisma/client'
import { getUserStable } from './queries'

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

  const chipNumber = (formData.get('chipNumber') as string)?.trim() || null
  if (chipNumber && !/^\d{15}$/.test(chipNumber)) {
    throw new Error('Chipnummer moet exact 15 cijfers bevatten')
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

export async function addHorseOwner(
  horseId: string,
  formData: FormData
): Promise<{ error: string } | undefined> {
  const user = await getCurrentUser()

  const horse = await prisma.horse.findUnique({ where: { id: horseId } })
  if (!horse) return { error: 'Paard niet gevonden' }

  const role = await getStableRole(user.id, horse.stableId)
  if (!role) return { error: 'Geen toegang' }

  const email = (formData.get('email') as string)?.trim().toLowerCase()
  if (!email) return { error: 'E-mailadres is verplicht' }

  const targetUser = await prisma.user.findUnique({ where: { email } })
  if (!targetUser)
    return { error: `Geen account gevonden voor ${email}. Vraag deze persoon eerst in te loggen op Velaro.` }

  const existing = await prisma.horseOwner.findUnique({
    where: { horseId_userId: { horseId, userId: targetUser.id } },
  })
  if (existing) return { error: 'Deze gebruiker is al eigenaar van dit paard' }

  await prisma.horseOwner.create({ data: { horseId, userId: targetUser.id } })

  revalidatePath(`/paarden/${horseId}`)
}

export async function removeHorseOwner(
  horseId: string,
  ownershipId: string
): Promise<{ error: string } | undefined> {
  const user = await getCurrentUser()

  const horse = await prisma.horse.findUnique({ where: { id: horseId } })
  if (!horse) return { error: 'Paard niet gevonden' }

  const role = await getStableRole(user.id, horse.stableId)
  if (!role) return { error: 'Geen toegang' }

  await prisma.horseOwner.delete({ where: { id: ownershipId } })

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
