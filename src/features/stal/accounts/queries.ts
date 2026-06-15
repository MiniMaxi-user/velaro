import { prisma } from '@/lib/prisma'
import { getMemberships } from '@/lib/auth/authorization'

export type StableExternalAccountHorse = {
  horsePersonId: string
  horseId: string
  horseName: string
  stableId: string | null
  stableName: string | null
  isOwner: boolean
  isRider: boolean
}

export type StableExternalAccount = {
  userId: string
  name: string | null
  email: string
  createdAt: Date
  isOwner: boolean
  isRider: boolean
  horses: StableExternalAccountHorse[]
  stables: { id: string; name: string }[]
}

/**
 * Externe accounts (paardeneigenaren en/of bereiders) gekoppeld aan paarden op de
 * stal(len) waarvan de gegeven gebruiker OWNER is. Eén regel per `User`, met de
 * gegroepeerde paarden, stallen en gecombineerde rollen (eigenaar/bereider).
 *
 * Alleen stallen waar de gebruiker OWNER is tellen mee — STAFF-only memberships
 * geven geen accountbeheer.
 *
 * Optioneel `activeStableId`: beperk het overzicht tot één actieve stal (mits de
 * gebruiker daar OWNER is). Zonder filter (of bij "Alle stallen") tellen alle
 * OWNER-stallen mee. Analoog aan het actieve-stal-patroon van /stal/leden.
 */
export async function getStableExternalAccounts(
  ownerUserId: string,
  activeStableId?: string | null,
): Promise<StableExternalAccount[]> {
  const memberships = await getMemberships(ownerUserId)
  let ownerStableIds = memberships
    .filter((m) => m.role === 'OWNER')
    .map((m) => m.stableId)

  // Specifieke actieve stal: beperk tot die stal, maar alleen wanneer de gebruiker
  // er daadwerkelijk OWNER is (anders valt de filter terug op een lege lijst).
  if (activeStableId) {
    ownerStableIds = ownerStableIds.filter((id) => id === activeStableId)
  }

  if (ownerStableIds.length === 0) return []

  // Alle koppelingen (eigenaar of bereider) op paarden in de OWNER-stallen.
  const links = await prisma.horsePerson.findMany({
    where: {
      OR: [{ isOwner: true }, { isRider: true }],
      horse: { stableId: { in: ownerStableIds } },
    },
    include: {
      user: { select: { id: true, name: true, email: true, createdAt: true } },
      horse: {
        select: {
          id: true,
          name: true,
          stable: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  // Groepeer per User: één regel per account, paarden/stallen/rollen samengevoegd.
  const byUser = new Map<string, StableExternalAccount>()

  for (const link of links) {
    let account = byUser.get(link.userId)
    if (!account) {
      account = {
        userId: link.user.id,
        name: link.user.name,
        email: link.user.email,
        createdAt: link.user.createdAt,
        isOwner: false,
        isRider: false,
        horses: [],
        stables: [],
      }
      byUser.set(link.userId, account)
    }

    account.isOwner = account.isOwner || link.isOwner
    account.isRider = account.isRider || link.isRider

    account.horses.push({
      horsePersonId: link.id,
      horseId: link.horse.id,
      horseName: link.horse.name,
      stableId: link.horse.stable?.id ?? null,
      stableName: link.horse.stable?.name ?? null,
      isOwner: link.isOwner,
      isRider: link.isRider,
    })

    if (link.horse.stable && !account.stables.some((s) => s.id === link.horse.stable!.id)) {
      account.stables.push({ id: link.horse.stable.id, name: link.horse.stable.name })
    }
  }

  return Array.from(byUser.values()).sort((a, b) =>
    (a.name ?? a.email).localeCompare(b.name ?? b.email, 'nl'),
  )
}

export type ExternalAccountForEdit = {
  userId: string
  name: string | null
  email: string
}

/**
 * Haalt één extern account op voor de bewerkpagina, maar uitsluitend wanneer de
 * gegeven OWNER er rechten op heeft: het account moet via minstens één paard aan
 * een stal van deze OWNER gekoppeld zijn (zelfde autorisatie als verwijderen/
 * bewerken). Geeft `null` terug wanneer het account niet bestaat of buiten bereik
 * van de OWNER valt.
 */
export async function getExternalAccountForEdit(
  ownerUserId: string,
  targetUserId: string,
): Promise<ExternalAccountForEdit | null> {
  const memberships = await getMemberships(ownerUserId)
  const ownerStableIds = memberships
    .filter((m) => m.role === 'OWNER')
    .map((m) => m.stableId)

  if (ownerStableIds.length === 0) return null

  const link = await prisma.horsePerson.findFirst({
    where: {
      userId: targetUserId,
      horse: { stableId: { in: ownerStableIds } },
    },
    select: {
      user: { select: { id: true, name: true, email: true, isPlatformAdmin: true, maxStables: true } },
    },
  })

  if (!link) return null
  // Geen platform-admin of staleigenaar-account: dat is geen extern account.
  if (link.user.isPlatformAdmin || link.user.maxStables > 0) return null

  return { userId: link.user.id, name: link.user.name, email: link.user.email }
}
