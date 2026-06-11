'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const STAL_NAV = [
  { href: '/stal',       label: 'Dashboard', icon: 'dashboard', exact: true },
  { href: '/paarden',    label: 'Paarden',   icon: 'horse',     exact: false },
  { href: '/stal/taken', label: 'Taken',     icon: 'check',     exact: false },
  { href: '/stal/leden', label: 'Team',      icon: 'team',      exact: false },
]

const EIGENAAR_NAV = [
  { href: '/paarden', label: 'Mijn paarden', icon: 'horse', exact: false },
]

function NavIcon({ name }: { name: string }) {
  if (name === 'dashboard') return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
      <rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
      <rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
      <rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
    </svg>
  )
  if (name === 'horse') return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 13c0-3 2-5 4-5h4c2 0 4 2 4 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.4"/>
    </svg>
  )
  if (name === 'check') return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M3 8l4 4 6-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
  if (name === 'team') return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M1 14c0-2.5 2-4 5-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <circle cx="12" cy="5" r="2" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M10 14c0-2 1-3.5 3-3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  )
  return null
}

interface Props {
  isStableMember: boolean
  userEmail: string | undefined
  userRole?: string
}

export default function SidebarClient({ isStableMember, userEmail, userRole }: Props) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const links = isStableMember ? STAL_NAV : EIGENAAR_NAV

  const initials = userEmail
    ? userEmail.slice(0, 2).toUpperCase()
    : 'VL'

  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        {collapsed ? (
          <Image
            src="/logo_icon.png"
            alt="Velaro"
            width={32}
            height={32}
            priority
            style={{ objectFit: 'contain' }}
          />
        ) : (
          <Image
            src="/velaro_logo_white.png"
            alt="Velaro"
            height={24}
            width={120}
            priority
            className="sidebar-logo-img"
          />
        )}
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        <div className="nav-section">
          {!collapsed && (
            <div className="nav-section-label">Navigatie</div>
          )}
          {links.map(({ href, label, icon, exact }) => {
            const isActive = exact ? pathname === href : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`nav-item${isActive ? ' active' : ''}`}
                title={collapsed ? label : undefined}
              >
                <span className="nav-icon"><NavIcon name={icon} /></span>
                <span className="nav-label">{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user-avatar">{initials}</div>
        <div className="sidebar-user-info">
          <div className="sidebar-user-name">{userEmail ?? 'Gebruiker'}</div>
          {userRole && <div className="sidebar-user-role">{userRole}</div>}
        </div>
        <button
          className="sidebar-toggle-btn"
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? 'Uitklappen' : 'Inklappen'}
          aria-label={collapsed ? 'Sidebar uitklappen' : 'Sidebar inklappen'}
        >
          {collapsed ? (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>
      </div>
    </aside>
  )
}
