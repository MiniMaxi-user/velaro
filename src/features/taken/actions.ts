'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getStableRole } from '@/lib/auth/authorization'
import { getUserStable } from '@/features/paarden/queries'
import { getRecurringTasksForStable } from './queries'
import { shouldRunToday } from './recurringHelpers'

async function getStaffContext() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const stable = await getUserStable(user.id)
  if (!stable) throw new Error('Geen stal gevonden')

  const role = await getStableRole(user.id, stable.id)
  if (!role) throw new Error('Geen toegang')

  return { userId: user.id, stable }
}

export async function createTask(formData: FormData) {
  const { stable } = await getStaffContext()

  const title = (formData.get('title') as string)?.trim()
  const dateStr = formData.get('date') as string
  const horseId = (formData.get('horseId') as string) || null

  if (!title) throw new Error('Omschrijving is verplicht')
  if (!dateStr) throw new Error('Datum is verplicht')

  const date = new Date(dateStr)

  await prisma.task.create({
    data: {
      stableId: stable.id,
      horseId: horseId || null,
      title,
      date,
    },
  })

  revalidatePath('/stal/taken')
}

export async function toggleTask(taskId: string) {
  const { stable } = await getStaffContext()

  const task = await prisma.task.findUnique({ where: { id: taskId } })
  if (!task || task.stableId !== stable.id) throw new Error('Taak niet gevonden')

  await prisma.task.update({
    where: { id: taskId },
    data: {
      isCompleted: !task.isCompleted,
      completedAt: task.isCompleted ? null : new Date(),
    },
  })

  revalidatePath('/stal/taken')
}

export async function deleteTask(taskId: string) {
  const { stable } = await getStaffContext()

  const task = await prisma.task.findUnique({ where: { id: taskId } })
  if (!task || task.stableId !== stable.id) throw new Error('Taak niet gevonden')

  await prisma.task.delete({ where: { id: taskId } })

  revalidatePath('/stal/taken')
}

export async function updateTask(
  taskId: string,
  formData: FormData
): Promise<{ error: string } | undefined> {
  const { stable } = await getStaffContext()

  const task = await prisma.task.findUnique({ where: { id: taskId } })
  if (!task || task.stableId !== stable.id) return { error: 'Taak niet gevonden' }

  const title = (formData.get('title') as string)?.trim()
  const dateStr = formData.get('date') as string
  const horseId = (formData.get('horseId') as string) || null

  if (!title) return { error: 'Omschrijving is verplicht' }
  if (!dateStr) return { error: 'Datum is verplicht' }

  await prisma.task.update({
    where: { id: taskId },
    data: { title, date: new Date(dateStr), horseId: horseId || null },
  })

  revalidatePath('/stal/taken')
}

/**
 * Zorgt dat alle terugkerende taken voor de gegeven datum als Task-rijen
 * bestaan. Idempotent: een bestaande rij wordt nooit dubbel aangemaakt.
 */
export async function ensureRecurringTasksForDate(stableId: string, date: Date) {
  const templates = await getRecurringTasksForStable(stableId)

  for (const template of templates) {
    if (!shouldRunToday(template, date)) continue

    // Idempotent check: bestaat er al een taak voor dit sjabloon op deze dag?
    const existing = await prisma.task.findFirst({
      where: {
        stableId,
        horseId: template.horseId ?? null,
        title: template.title,
        date: {
          gte: new Date(new Date(date).setHours(0, 0, 0, 0)),
          lte: new Date(new Date(date).setHours(23, 59, 59, 999)),
        },
      },
    })

    if (!existing) {
      const taskDate = new Date(date)
      taskDate.setHours(12, 0, 0, 0)
      await prisma.task.create({
        data: {
          stableId,
          horseId: template.horseId ?? null,
          title: template.title,
          date: taskDate,
          zorgType: template.zorgType ?? null,
        },
      })
    }
  }
}

const VALID_ZORG_TYPES = ['VACCINATIE', 'ONTWORMING', 'DIERENARTS', 'HOEFSMIT'] as const
type ZorgTypeValue = typeof VALID_ZORG_TYPES[number]

export async function createRecurringTask(
  formData: FormData
): Promise<{ error: string } | undefined> {
  const { stable } = await getStaffContext()

  const title = (formData.get('title') as string)?.trim()
  const frequency = formData.get('frequency') as string
  const horseId = (formData.get('horseId') as string) || null
  const zorgTypeRaw = (formData.get('zorgType') as string) || null

  if (!title) return { error: 'Omschrijving is verplicht' }
  if (!['DAILY', 'WEEKLY', 'MONTHLY'].includes(frequency)) {
    return { error: 'Ongeldige frequentie' }
  }

  const zorgType: ZorgTypeValue | null =
    zorgTypeRaw && VALID_ZORG_TYPES.includes(zorgTypeRaw as ZorgTypeValue)
      ? (zorgTypeRaw as ZorgTypeValue)
      : null

  let dayOfWeek: number | null = null
  let dayOfMonth: number | null = null

  if (frequency === 'WEEKLY') {
    const dow = parseInt(formData.get('dayOfWeek') as string, 10)
    if (isNaN(dow) || dow < 0 || dow > 6) return { error: 'Ongeldige weekdag' }
    dayOfWeek = dow
  }

  if (frequency === 'MONTHLY') {
    const dom = parseInt(formData.get('dayOfMonth') as string, 10)
    if (isNaN(dom) || dom < 1 || dom > 28) return { error: 'Dag moet tussen 1 en 28 liggen' }
    dayOfMonth = dom
  }

  await prisma.recurringTask.create({
    data: {
      stableId: stable.id,
      horseId: horseId || null,
      title,
      frequency: frequency as 'DAILY' | 'WEEKLY' | 'MONTHLY',
      dayOfWeek,
      dayOfMonth,
      zorgType,
    },
  })

  revalidatePath('/stal/taken')
}

export async function deleteRecurringTask(
  id: string
): Promise<{ error: string } | undefined> {
  const { stable } = await getStaffContext()

  const template = await prisma.recurringTask.findUnique({ where: { id } })
  if (!template || template.stableId !== stable.id) return { error: 'Sjabloon niet gevonden' }

  await prisma.recurringTask.delete({ where: { id } })

  revalidatePath('/stal/taken')
}
