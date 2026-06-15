'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getStableRole } from '@/lib/auth/authorization'

async function getAuthorizedUser(horseId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const horse = await prisma.horse.findUnique({ where: { id: horseId } })
  if (!horse) throw new Error('Paard niet gevonden')

  const role = await getStableRole(user.id, horse.stableId)
  if (!role) throw new Error('Geen toegang')

  return { user, horse, role }
}

export async function createVaccinatie(horseId: string, formData: FormData) {
  await getAuthorizedUser(horseId)

  const dateStr = formData.get('date') as string
  const type = (formData.get('type') as string)?.trim()
  const nextDateStr = formData.get('nextDate') as string

  if (!dateStr || !type) throw new Error('Datum en type zijn verplicht')

  await prisma.vaccination.create({
    data: {
      horseId,
      date: new Date(dateStr),
      type,
      nextDate: nextDateStr ? new Date(nextDateStr) : null,
      notes: (formData.get('notes') as string)?.trim() || null,
    },
  })

  revalidatePath(`/paarden/${horseId}`)
  redirect(`/paarden/${horseId}`)
}

export async function deleteVaccinatie(id: string, horseId: string) {
  await getAuthorizedUser(horseId)
  await prisma.vaccination.delete({ where: { id } })
  revalidatePath(`/paarden/${horseId}`)
}

export async function createOntworming(horseId: string, formData: FormData) {
  await getAuthorizedUser(horseId)

  const dateStr = formData.get('date') as string
  const product = (formData.get('product') as string)?.trim()
  const nextDateStr = formData.get('nextDate') as string

  if (!dateStr || !product) throw new Error('Datum en product zijn verplicht')

  await prisma.deworming.create({
    data: {
      horseId,
      date: new Date(dateStr),
      product,
      nextDate: nextDateStr ? new Date(nextDateStr) : null,
      notes: (formData.get('notes') as string)?.trim() || null,
    },
  })

  revalidatePath(`/paarden/${horseId}`)
  redirect(`/paarden/${horseId}`)
}

export async function deleteOntworming(id: string, horseId: string) {
  await getAuthorizedUser(horseId)
  await prisma.deworming.delete({ where: { id } })
  revalidatePath(`/paarden/${horseId}`)
}

export async function createDierenartsBeezoek(horseId: string, formData: FormData) {
  await getAuthorizedUser(horseId)

  const dateStr = formData.get('date') as string
  const reason = (formData.get('reason') as string)?.trim()
  const nextDateStr = formData.get('nextDate') as string

  if (!dateStr || !reason) throw new Error('Datum en reden zijn verplicht')

  await prisma.vetVisit.create({
    data: {
      horseId,
      date: new Date(dateStr),
      vet: (formData.get('vet') as string)?.trim() || null,
      reason,
      notes: (formData.get('notes') as string)?.trim() || null,
    },
  })

  revalidatePath(`/paarden/${horseId}`)
  redirect(`/paarden/${horseId}`)
}

export async function deleteDierenartsBeezoek(id: string, horseId: string) {
  await getAuthorizedUser(horseId)
  await prisma.vetVisit.delete({ where: { id } })
  revalidatePath(`/paarden/${horseId}`)
}

export async function updateVaccinatie(id: string, horseId: string, formData: FormData) {
  await getAuthorizedUser(horseId)

  const dateStr = formData.get('date') as string
  const type = (formData.get('type') as string)?.trim()
  const nextDateStr = formData.get('nextDate') as string

  if (!dateStr || !type) throw new Error('Datum en type zijn verplicht')

  await prisma.vaccination.update({
    where: { id },
    data: {
      date: new Date(dateStr),
      type,
      nextDate: nextDateStr ? new Date(nextDateStr) : null,
      notes: (formData.get('notes') as string)?.trim() || null,
    },
  })

  revalidatePath(`/paarden/${horseId}`)
  redirect(`/paarden/${horseId}`)
}

export async function updateOntworming(id: string, horseId: string, formData: FormData) {
  await getAuthorizedUser(horseId)

  const dateStr = formData.get('date') as string
  const product = (formData.get('product') as string)?.trim()
  const nextDateStr = formData.get('nextDate') as string

  if (!dateStr || !product) throw new Error('Datum en product zijn verplicht')

  await prisma.deworming.update({
    where: { id },
    data: {
      date: new Date(dateStr),
      product,
      nextDate: nextDateStr ? new Date(nextDateStr) : null,
      notes: (formData.get('notes') as string)?.trim() || null,
    },
  })

  revalidatePath(`/paarden/${horseId}`)
  redirect(`/paarden/${horseId}`)
}

export async function updateDierenartsBeezoek(id: string, horseId: string, formData: FormData) {
  await getAuthorizedUser(horseId)

  const dateStr = formData.get('date') as string
  const reason = (formData.get('reason') as string)?.trim()

  if (!dateStr || !reason) throw new Error('Datum en reden zijn verplicht')

  await prisma.vetVisit.update({
    where: { id },
    data: {
      date: new Date(dateStr),
      vet: (formData.get('vet') as string)?.trim() || null,
      reason,
      notes: (formData.get('notes') as string)?.trim() || null,
    },
  })

  revalidatePath(`/paarden/${horseId}`)
  redirect(`/paarden/${horseId}`)
}

export async function createHoefsmitBezoek(horseId: string, formData: FormData) {
  await getAuthorizedUser(horseId)

  const dateStr = formData.get('date') as string
  const nextDateStr = formData.get('nextDate') as string

  if (!dateStr) throw new Error('Datum is verplicht')

  await prisma.hoefsmitBezoek.create({
    data: {
      horseId,
      date: new Date(dateStr),
      hoefsmid: (formData.get('hoefsmid') as string)?.trim() || null,
      nextDate: nextDateStr ? new Date(nextDateStr) : null,
      notes: (formData.get('notes') as string)?.trim() || null,
    },
  })

  revalidatePath(`/paarden/${horseId}`)
  redirect(`/paarden/${horseId}`)
}

export async function updateHoefsmitBezoek(id: string, horseId: string, formData: FormData) {
  await getAuthorizedUser(horseId)

  const dateStr = formData.get('date') as string
  const nextDateStr = formData.get('nextDate') as string

  if (!dateStr) throw new Error('Datum is verplicht')

  await prisma.hoefsmitBezoek.update({
    where: { id },
    data: {
      date: new Date(dateStr),
      hoefsmid: (formData.get('hoefsmid') as string)?.trim() || null,
      nextDate: nextDateStr ? new Date(nextDateStr) : null,
      notes: (formData.get('notes') as string)?.trim() || null,
    },
  })

  revalidatePath(`/paarden/${horseId}`)
  redirect(`/paarden/${horseId}`)
}

export async function deleteHoefsmitBezoek(id: string, horseId: string) {
  await getAuthorizedUser(horseId)
  await prisma.hoefsmitBezoek.delete({ where: { id } })
  revalidatePath(`/paarden/${horseId}`)
}

// ── Gewicht & metingen ───────────────────────────────────────────────────────

function parseMeetwaarde(value: FormDataEntryValue | null): number | null {
  const str = (value as string)?.trim().replace(',', '.')
  if (!str) return null
  const num = Number(str)
  return Number.isFinite(num) ? num : null
}

function parseMetingFields(formData: FormData) {
  const dateStr = formData.get('date') as string
  if (!dateStr) throw new Error('Datum is verplicht')

  const weightKg = parseMeetwaarde(formData.get('weightKg'))
  const heightCmRaw = parseMeetwaarde(formData.get('heightCm'))
  const heightCm = heightCmRaw === null ? null : Math.round(heightCmRaw)
  const bodyConditionScore = parseMeetwaarde(formData.get('bodyConditionScore'))

  if (weightKg === null && heightCm === null && bodyConditionScore === null) {
    throw new Error('Vul ten minste één meetwaarde in (gewicht, stokmaat of BCS)')
  }

  return {
    date: new Date(dateStr),
    weightKg,
    heightCm,
    bodyConditionScore,
    measuredBy: (formData.get('measuredBy') as string)?.trim() || null,
    notes: (formData.get('notes') as string)?.trim() || null,
  }
}

export async function createMeting(horseId: string, formData: FormData) {
  await getAuthorizedUser(horseId)

  await prisma.bodyMeasurement.create({
    data: {
      horseId,
      ...parseMetingFields(formData),
    },
  })

  revalidatePath(`/paarden/${horseId}`)
  redirect(`/paarden/${horseId}`)
}

export async function updateMeting(id: string, horseId: string, formData: FormData) {
  await getAuthorizedUser(horseId)

  await prisma.bodyMeasurement.update({
    where: { id },
    data: parseMetingFields(formData),
  })

  revalidatePath(`/paarden/${horseId}`)
  redirect(`/paarden/${horseId}`)
}

export async function deleteMeting(id: string, horseId: string) {
  await getAuthorizedUser(horseId)
  await prisma.bodyMeasurement.delete({ where: { id } })
  revalidatePath(`/paarden/${horseId}`)
}
