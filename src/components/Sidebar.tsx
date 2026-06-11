import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getActiveStableId } from '@/lib/active-stable'
import { getMemberships } from '@/lib/auth/authorization'
import SidebarClient from './SidebarClient'

const ROL_LABELS: Record<string, string> = {
  OWNER: 'Staleigenaar',
  STAFF: 'Stalmedewerker',
}

export default async function Sidebar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const [dbUser, memberships, activeStableId] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: { name: true, isPlatformAdmin: true, maxStables: true },
    }),
    getMemberships(user.id),
    getActiveStableId(user.id),
  ])

  const isStableMember = memberships.length > 0
  const isPlatformAdmin = dbUser?.isPlatformAdmin ?? false
  const canManageStables = isPlatformAdmin || (dbUser?.maxStables ?? 0) > 0

  const activeMembership = memberships.find((m) => m.stableId === activeStableId)
  let rolLabel = isPlatformAdmin
    ? 'Platform Admin'
    : activeMembership
    ? (ROL_LABELS[activeMembership.role] ?? activeMembership.role)
    : 'Paardeneigenaar'

  const stables = memberships.map((m) => m.stable)

  return (
    <SidebarClient
      isStableMember={isStableMember}
      isPlatformAdmin={isPlatformAdmin}
      canManageStables={canManageStables}
      userEmail={user.email}
      userRole={rolLabel}
      stables={stables}
      activeStableId={activeStableId}
    />
  )
}
