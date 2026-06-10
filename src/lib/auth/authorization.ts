import { prisma } from '@/lib/prisma'
import type { StableRole } from '@prisma/client'

export async function getStableRole(
  userId: string,
  stableId: string
): Promise<StableRole | null> {
  const member = await prisma.stableMember.findUnique({
    where: { stableId_userId: { stableId, userId } },
    select: { role: true },
  })
  return member?.role ?? null
}

export async function isStableMember(
  userId: string,
  stableId: string
): Promise<boolean> {
  const role = await getStableRole(userId, stableId)
  return role !== null
}

export async function canViewHorse(
  userId: string,
  horseId: string
): Promise<boolean> {
  const horse = await prisma.horse.findUnique({
    where: { id: horseId },
    select: { stableId: true },
  })
  if (!horse) return false

  const [member, owner] = await Promise.all([
    isStableMember(userId, horse.stableId),
    prisma.horseOwner.findUnique({
      where: { horseId_userId: { horseId, userId } },
    }),
  ])

  return member || owner !== null
}
