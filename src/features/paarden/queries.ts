import { prisma } from '@/lib/prisma'
import { getActiveStable } from '@/lib/active-stable'

export async function getHorsesForOwner(userId: string) {
  // Paarden waaraan de gebruiker als eigenaar én/of bereider gekoppeld is.
  const links = await prisma.horsePerson.findMany({
    where: { userId },
    include: { horse: true },
    orderBy: { createdAt: 'asc' },
  })
  return links.map((l) => l.horse)
}

export async function getUserStable(userId: string) {
  return getActiveStable(userId)
}

export async function getHorsesForStable(stableId: string) {
  return prisma.horse.findMany({
    where: { stableId },
    orderBy: { name: 'asc' },
  })
}

// Bouwt een Prisma-where-fragment dat een vrije zoekterm matcht op de relevante
// paardvelden (naam, UELN, chipnummer, paspoortnummer) én op de naam van een
// gekoppelde persoon (eigenaar of bereider). Case-insensitive, deelmatch.
// Levert `undefined` bij een lege zoekterm zodat er niet gefilterd wordt.
function buildHorseSearchWhere(query: string | undefined) {
  const term = query?.trim()
  if (!term) return undefined

  const contains = { contains: term, mode: 'insensitive' as const }
  return {
    OR: [
      { name: contains },
      { ueln: contains },
      { chipNumber: contains },
      { passportNumber: contains },
      // Gekoppelde eigenaar/bereider op naam (HorsePerson → User.name)
      { people: { some: { user: { name: contains } } } },
    ],
  }
}

// Paarden van één of meer stallen, optioneel gefilterd op een vrije zoekterm.
// Gebruikt voor het paardenoverzicht (#119): zoeken op eigenaar-/bereidernaam,
// paardnaam, UELN, chipnummer en paspoortnummer.
export async function searchHorsesForStables(stableIds: string[], query?: string) {
  const search = buildHorseSearchWhere(query)
  return prisma.horse.findMany({
    where: {
      stableId: { in: stableIds },
      ...(search ?? {}),
    },
    include: { stable: { select: { name: true } } },
    orderBy: { name: 'asc' },
  })
}

// Paarden waaraan de gebruiker als eigenaar/bereider gekoppeld is, optioneel
// gefilterd op een vrije zoekterm (#119).
export async function searchHorsesForOwner(userId: string, query?: string) {
  const search = buildHorseSearchWhere(query)
  const horses = await prisma.horse.findMany({
    where: {
      people: { some: { userId } },
      ...(search ?? {}),
    },
    orderBy: { name: 'asc' },
  })
  return horses
}

export async function getFeedingPlan(horseId: string) {
  return prisma.feedingPlan.findUnique({ where: { horseId } })
}

/**
 * Levert de stalleden (StableMember: OWNER/STAFF) van de stal waartoe het gegeven
 * paard behoort. Bron voor de zoek-dropdown bij het koppelen van personen aan een
 * paard op de tab "Eigenaar & bereider".
 */
export async function getStableMembersForHorse(horseId: string) {
  const horse = await prisma.horse.findUnique({
    where: { id: horseId },
    select: { stableId: true },
  })
  if (!horse) return []

  const members = await prisma.stableMember.findMany({
    where: { stableId: horse.stableId },
    select: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { user: { name: 'asc' } },
  })

  return members.map((m) => m.user)
}

export async function getHorse(id: string) {
  return prisma.horse.findUnique({
    where: { id },
    include: {
      people: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
      stable: {
        select: {
          id: true,
          name: true,
          address: true,
          postalCode: true,
          city: true,
          phone: true,
          email: true,
          website: true,
          description: true,
          openingHours: true,
        },
      },
    },
  })
}
