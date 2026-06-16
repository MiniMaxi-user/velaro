import { cache } from 'react'
import { prisma } from '@/lib/prisma'
import { getDbUser } from '@/lib/auth/session'
import type { StableRole } from '@prisma/client'

/**
 * Laadt alle memberships van een gebruiker, inclusief de stabelnaam.
 * Gecacht met React.cache() zodat Sidebar, pagina's en authorization-helpers
 * binnen één render-cyclus dezelfde data hergebruiken.
 */
export const getMemberships = cache(async (userId: string) => {
  return prisma.stableMember.findMany({
    where: { userId },
    include: { stable: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'asc' },
  })
})

export async function isPlatformAdmin(userId: string): Promise<boolean> {
  const user = await getDbUser(userId)
  return user?.isPlatformAdmin ?? false
}

/**
 * Controleert of de gebruiker een nieuwe stal mag aanmaken.
 * Gebruikt de gecachte memberships om de OWNER-count in geheugen te berekenen
 * in plaats van een extra COUNT-query.
 */
export async function canCreateStable(userId: string): Promise<boolean> {
  const user = await getDbUser(userId)
  if (!user) return false
  if (user.isPlatformAdmin) return true

  const memberships = await getMemberships(userId)
  const ownerCount = memberships.filter((m) => m.role === 'OWNER').length
  return ownerCount < (user.maxStables ?? 0)
}

/**
 * Geeft de rol van de gebruiker in een specifieke stal terug.
 * Leidt de rol af uit de gecachte memberships in plaats van een losse query.
 */
export async function getStableRole(
  userId: string,
  stableId: string
): Promise<StableRole | null> {
  const memberships = await getMemberships(userId)
  return memberships.find((m) => m.stableId === stableId)?.role ?? null
}

export async function isStableMember(
  userId: string,
  stableId: string
): Promise<boolean> {
  const role = await getStableRole(userId, stableId)
  return role !== null
}

export async function isAnyStableMember(userId: string): Promise<boolean> {
  const memberships = await getMemberships(userId)
  return memberships.length > 0
}

/**
 * Bestaat er een HorsePerson-rij die deze gebruiker als EIGENAAR (isOwner) van dit
 * paard koppelt? Gebruikt om de paardeigenaar (zonder stalrol) beperkte rechten te
 * geven (bv. wederpartij in een contract).
 */
export async function isHorseOwner(
  userId: string,
  horseId: string
): Promise<boolean> {
  const person = await prisma.horsePerson.findUnique({
    where: { horseId_userId: { horseId, userId } },
  })
  return person?.isOwner === true
}

/**
 * Geeft de actieve lease van deze gebruiker op dit paard terug (of null). Een
 * lease met status ACTIEF maakt de gebruiker leaser, met leestoegang tot het
 * paardprofiel — vergelijkbaar met de paardeneigenaar-weergave (lease-module #59,
 * Lease 02). CONCEPT/OPGEZEGD/BEEINDIGD geven géén toegang.
 */
export async function getLeaseForHorse(userId: string, horseId: string) {
  return prisma.lease.findFirst({
    where: { horseId, leaserUserId: userId, status: 'ACTIEF' },
    orderBy: { startDate: 'desc' },
  })
}

/** Heeft deze gebruiker een actieve lease op dit paard? */
export async function isHorseLeaser(
  userId: string,
  horseId: string
): Promise<boolean> {
  const lease = await getLeaseForHorse(userId, horseId)
  return lease !== null
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

  const [member, person, lease] = await Promise.all([
    isStableMember(userId, horse.stableId),
    prisma.horsePerson.findUnique({
      where: { horseId_userId: { horseId, userId } },
    }),
    getLeaseForHorse(userId, horseId),
  ])

  // Stallid, gekoppeld als eigenaar/bereider, óf actieve leaser.
  return member || person !== null || lease !== null
}
