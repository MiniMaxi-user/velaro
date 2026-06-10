'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getStableRole } from '@/lib/auth/authorization'
import { getUserStable } from '@/features/paarden/queries'
import type { StableRole } from '@prisma/client'

async function getOwnerContext() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const stable = await getUserStable(user.id)
  if (!stable) throw new Error('Geen stal gevonden')

  const role = await getStableRole(user.id, stable.id)
  if (role !== 'OWNER') throw new Error('Alleen staleigenaren kunnen leden beheren')

  return { currentUserId: user.id, stable }
}

export async function addMember(formData: FormData) {
  const { stable } = await getOwnerContext()

  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const role = formData.get('role') as StableRole

  if (!email) throw new Error('E-mailadres is verplicht')
  if (!['OWNER', 'STAFF'].includes(role)) throw new Error('Ongeldige rol')

  const targetUser = await prisma.user.findUnique({ where: { email } })
  if (!targetUser)
    throw new Error(
      `Geen account gevonden voor ${email}. Vraag deze persoon eerst in te loggen op Velaro.`
    )

  const existing = await prisma.stableMember.findUnique({
    where: { stableId_userId: { stableId: stable.id, userId: targetUser.id } },
  })
  if (existing) throw new Error('Deze gebruiker is al lid van de stal')

  await prisma.stableMember.create({
    data: { stableId: stable.id, userId: targetUser.id, role },
  })

  revalidatePath('/stal/leden')
}

export async function updateMemberRole(memberId: string, formData: FormData) {
  const { currentUserId, stable } = await getOwnerContext()

  const member = await prisma.stableMember.findUnique({ where: { id: memberId } })
  if (!member || member.stableId !== stable.id) throw new Error('Lid niet gevonden')
  if (member.userId === currentUserId) throw new Error('Je kunt je eigen rol niet wijzigen')

  const role = formData.get('role') as StableRole
  if (!['OWNER', 'STAFF'].includes(role)) throw new Error('Ongeldige rol')

  await prisma.stableMember.update({ where: { id: memberId }, data: { role } })

  revalidatePath('/stal/leden')
}

export async function removeMember(memberId: string) {
  const { currentUserId, stable } = await getOwnerContext()

  const member = await prisma.stableMember.findUnique({ where: { id: memberId } })
  if (!member || member.stableId !== stable.id) throw new Error('Lid niet gevonden')
  if (member.userId === currentUserId) throw new Error('Je kunt jezelf niet verwijderen')

  if (member.role === 'OWNER') {
    const ownerCount = await prisma.stableMember.count({
      where: { stableId: stable.id, role: 'OWNER' },
    })
    if (ownerCount <= 1) throw new Error('Er moet minimaal één eigenaar overblijven')
  }

  await prisma.stableMember.delete({ where: { id: memberId } })

  revalidatePath('/stal/leden')
}
