'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { prisma } from '@/lib/prisma'
import { getMemberships } from '@/lib/auth/authorization'

/**
 * Bepaalt de OWNER-context voor accountbeheer: de stal-ids waarvan de ingelogde
 * gebruiker OWNER is. Verwijderen is uitsluitend toegestaan door een OWNER.
 */
async function getOwnerStableIds(): Promise<
  | { ok: true; ownerStableIds: string[] }
  | { ok: false; error: string }
> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const memberships = await getMemberships(user.id)
  const ownerStableIds = memberships
    .filter((m) => m.role === 'OWNER')
    .map((m) => m.stableId)

  if (ownerStableIds.length === 0) {
    return { ok: false, error: 'Alleen staleigenaren kunnen externe accounts verwijderen' }
  }

  return { ok: true, ownerStableIds }
}

/**
 * Verwijdert een extern account (paardeneigenaar/bereider) definitief — zowel de
 * `User`-rij als de Supabase-auth-user — maar uitsluitend wanneer:
 *  - de ingelogde gebruiker OWNER is van minstens één stal waaraan het account
 *    gekoppeld is (server-side autorisatie), en
 *  - het account nergens meer in gebruik is: geen `HorsePerson`-koppeling, geen
 *    `Contract.counterpartyUserId`, geen `StableMember`-lidmaatschap.
 *
 * Is het account nog in gebruik, dan wordt verwijderen geblokkeerd met een concrete
 * melding over waar en waarom.
 */
export async function deleteExternalAccount(
  targetUserId: string,
): Promise<{ error: string } | undefined> {
  const ctx = await getOwnerStableIds()
  if (!ctx.ok) return { error: ctx.error }

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, isPlatformAdmin: true, maxStables: true },
  })
  if (!target) return { error: 'Account niet gevonden' }

  // Een platform-admin of staleigenaar-account (maxStables > 0) is geen extern
  // account en hoort niet vanaf dit scherm verwijderd te worden.
  if (target.isPlatformAdmin || target.maxStables > 0) {
    return { error: 'Dit account kan niet vanaf dit scherm worden verwijderd' }
  }

  // Autorisatie: het account moet via minstens één paard aan een stal van deze
  // OWNER gekoppeld zijn. Zo voorkomen we dat een OWNER willekeurige accounts wist.
  const linksInOwnerStables = await prisma.horsePerson.findMany({
    where: {
      userId: targetUserId,
      horse: { stableId: { in: ctx.ownerStableIds } },
    },
    include: {
      horse: {
        select: {
          name: true,
          stable: { select: { name: true } },
        },
      },
    },
  })

  if (linksInOwnerStables.length === 0) {
    return { error: 'Je hebt geen rechten om dit account te verwijderen' }
  }

  // In-gebruik-check 1: nog gekoppeld aan een paard via HorsePerson (waar dan ook).
  const horsePeople = await prisma.horsePerson.findMany({
    where: { userId: targetUserId },
    include: {
      horse: {
        select: {
          name: true,
          stable: { select: { name: true } },
        },
      },
    },
  })
  if (horsePeople.length > 0) {
    const first = horsePeople[0]
    const rollen = first.isOwner && first.isRider
      ? 'eigenaar/bereider'
      : first.isOwner
        ? 'eigenaar'
        : 'bereider'
    const stalNaam = first.horse.stable?.name ?? 'onbekende stal'
    return {
      error: `Nog gekoppeld als ${rollen} aan: ${first.horse.name} (${stalNaam}). Ontkoppel dit account eerst op het paardprofiel.`,
    }
  }

  // In-gebruik-check 2: wederpartij van een contract. De DB blokkeert dit niet
  // (onDelete: SetNull), dus expliciet controleren.
  const contract = await prisma.contract.findFirst({
    where: { counterpartyUserId: targetUserId },
    include: { stable: { select: { name: true } } },
  })
  if (contract) {
    const stalNaam = contract.stable?.name ?? 'onbekende stal'
    return {
      error: `Dit account is wederpartij van een contract (${stalNaam}). Beëindig of ontkoppel het contract eerst.`,
    }
  }

  // In-gebruik-check 3: lid van een stal via StableMember (stalmedewerker).
  const member = await prisma.stableMember.findFirst({
    where: { userId: targetUserId },
  })
  if (member) {
    return {
      error: 'Dit account is ook stalmedewerker. Beheer dit via het Team-scherm.',
    }
  }

  // Nergens meer in gebruik: definitief verwijderen (User-rij + Supabase-auth-user).
  await prisma.user.delete({ where: { id: targetUserId } })

  const adminClient = createAdminClient()
  const { error: authError } = await adminClient.auth.admin.deleteUser(targetUserId)
  if (authError) {
    // De DB-rij is al weg; de auth-user kon niet worden verwijderd. Meld dit zodat
    // een beheerder het kan opschonen, maar laat het scherm wel bijwerken.
    revalidatePath('/stal/accounts')
    return {
      error: `Account verwijderd, maar de inlog kon niet volledig worden opgeruimd: ${authError.message}`,
    }
  }

  revalidatePath('/stal/accounts')
}
