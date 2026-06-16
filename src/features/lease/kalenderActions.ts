'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { canViewHorse, getStableRole } from '@/lib/auth/authorization'
import { isDagdeel, datumVanYmd } from './kalenderHelpers'

// ── Beschikbaarheidskalender-acties (Lease 09, #68) ──────────────────────────

async function authUserId(): Promise<string> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return user.id
}

// Een dagdeel claimen. Conflictpreventie via de unieke sleutel (paard+datum+dagdeel).
// (De contractlimiet "dagen/week" wordt nog niet afgedwongen: het Lease-record heeft
// geen dagen/week-veld; dat is een follow-up.)
export async function claimDagdeel(horseId: string, datumYmd: string, dagdeel: string) {
  const userId = await authUserId()
  if (!(await canViewHorse(userId, horseId))) throw new Error('Geen toegang')
  if (!isDagdeel(dagdeel)) throw new Error('Ongeldig dagdeel')

  const datum = datumVanYmd(datumYmd)

  try {
    await prisma.leaseDagdeelClaim.create({ data: { horseId, userId, datum, dagdeel } })
  } catch {
    throw new Error('Dit dagdeel is al bezet.')
  }

  revalidatePath(`/paarden/${horseId}/beschikbaarheid`)
}

// Een claim vrijgeven: door de claimer zelf of door een stallid.
export async function releaseDagdeel(claimId: string, horseId: string) {
  const userId = await authUserId()
  const claim = await prisma.leaseDagdeelClaim.findUnique({
    where: { id: claimId },
    include: { horse: { select: { stableId: true } } },
  })
  if (!claim || claim.horseId !== horseId) throw new Error('Claim niet gevonden')

  const isEigenaarVanClaim = claim.userId === userId
  const isStal = (await getStableRole(userId, claim.horse.stableId)) !== null
  if (!isEigenaarVanClaim && !isStal) throw new Error('Geen toegang')

  await prisma.leaseDagdeelClaim.delete({ where: { id: claimId } })
  revalidatePath(`/paarden/${horseId}/beschikbaarheid`)
}
