import { getAuthUser, getDbUser } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { getActiveStableId, ALLE_STALLEN } from '@/lib/active-stable'
import { getMemberships, getStableRole } from '@/lib/auth/authorization'
import SidebarClient from './SidebarClient'

const ROL_LABELS: Record<string, string> = {
  OWNER: 'Staleigenaar',
  STAFF: 'Stalmedewerker',
}

export default async function Sidebar() {
  const user = await getAuthUser()

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

  // OWNER van de actieve stal? Bepaalt of de stal-instellingen-link zichtbaar is (#98).
  // Bij "alle stallen" tonen we de stal-specifieke instellingen-link niet.
  const isOwner =
    activeStableId !== null &&
    activeStableId !== ALLE_STALLEN &&
    (await getStableRole(user.id, activeStableId)) === 'OWNER'

  // OWNER van minstens één stal? Bepaalt of het externe-accounts-scherm (#114)
  // zichtbaar is. Dit scherm aggregeert over alle OWNER-stallen, dus het item
  // blijft ook in "alle stallen"-modus zichtbaar.
  const isOwnerOfAny = memberships.some((m) => m.role === 'OWNER')

  let rolLabel = isPlatformAdmin
    ? 'Platform Admin'
    : activeStableId === ALLE_STALLEN
    ? 'Alle stallen'
    : activeMembership
    ? (ROL_LABELS[activeMembership.role] ?? activeMembership.role)
    : 'Paardeneigenaar'

  const stables = memberships.map((m) => m.stable)

  return (
    <SidebarClient
      isStableMember={isStableMember}
      isPlatformAdmin={isPlatformAdmin}
      isOwner={isOwner}
      isOwnerOfAny={isOwnerOfAny}
      canManageStables={canManageStables}
      userEmail={user.email}
      userRole={rolLabel}
      stables={stables}
      activeStableId={activeStableId}
    />
  )
}
