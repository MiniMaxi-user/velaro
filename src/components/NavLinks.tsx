'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const STAL_LINKS = [
  { href: '/stal', label: 'Stal', exact: true },
  { href: '/paarden', label: 'Paarden', exact: false },
  { href: '/stal/taken', label: 'Taken', exact: false },
]

// Alleen zichtbaar voor de OWNER van de actieve stal (#98).
const OWNER_LINK = { href: '/stal/instellingen', label: 'Instellingen', exact: false }

const EIGENAAR_LINKS = [
  { href: '/paarden', label: 'Mijn paarden', exact: false },
]

export default function NavLinks({
  isStableMember,
  isOwner = false,
}: {
  isStableMember: boolean
  isOwner?: boolean
}) {
  const pathname = usePathname()
  const links = isStableMember
    ? isOwner
      ? [...STAL_LINKS, OWNER_LINK]
      : STAL_LINKS
    : EIGENAAR_LINKS

  return (
    <div className="app-nav__links">
      {links.map(({ href, label, exact }) => {
        const isActive = exact ? pathname === href : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={`app-nav__link${isActive ? ' app-nav__link--active' : ''}`}
          >
            {label}
          </Link>
        )
      })}
    </div>
  )
}
