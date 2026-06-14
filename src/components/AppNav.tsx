import Image from 'next/image'
import Link from 'next/link'
import NavLinks from './NavLinks'
import SignOutButton from './SignOutButton'
import { getAuthUser } from '@/lib/auth/session'
import { isAnyStableMember, getStableRole } from '@/lib/auth/authorization'
import { getActiveStableId, ALLE_STALLEN } from '@/lib/active-stable'

export default async function AppNav() {
  const user = await getAuthUser()
  const stableMember = user ? await isAnyStableMember(user.id) : false

  // OWNER van de actieve stal? Bepaalt of de instellingen-link zichtbaar is.
  // Bij "alle stallen" tonen we de stal-specifieke instellingen-link niet.
  let isOwner = false
  if (user && stableMember) {
    const activeStableId = await getActiveStableId(user.id)
    if (activeStableId && activeStableId !== ALLE_STALLEN) {
      isOwner = (await getStableRole(user.id, activeStableId)) === 'OWNER'
    }
  }

  return (
    <nav className="app-nav">
      <div className="app-nav__inner">
        <Link href={stableMember ? '/stal' : '/paarden'} className="app-nav__logo">
          <Image src="/velaro_logo.png" alt="Velaro" height={28} width={90} priority />
        </Link>
        <NavLinks isStableMember={stableMember} isOwner={isOwner} />
        <SignOutButton />
      </div>
    </nav>
  )
}
