'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useRef } from 'react'
import { switchActiveStable } from '@/features/stallen/actions'
import { ALLE_STALLEN } from '@/lib/stable-constants'

const EIGENAAR_NAV = [
  { href: '/eigenaar', label: 'Dashboard',    icon: 'dashboard', exact: true },
  { href: '/paarden',  label: 'Mijn paarden', icon: 'horse',     exact: false },
  { href: '/lease',    label: 'Marktplaats',  icon: 'lease',     exact: false },
]

const ADMIN_NAV = [
  { href: '/admin',           label: 'Dashboard',  icon: 'dashboard', exact: true  },
  { href: '/admin/eigenaren', label: 'Eigenaren',  icon: 'team',      exact: false },
  { href: '/admin/stallen',   label: 'Stallen',    icon: 'stallen',   exact: false },
  { href: '/admin/paarden',   label: 'Paarden',    icon: 'horse',     exact: false },
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
  if (name === 'lease') return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 6.5 8 2l6 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3.5 7v6h9V7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M6.5 13v-3h3v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
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
  if (name === 'stallen') return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M1 8L8 2l7 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3 8v5h10V8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
  if (name === 'contract') return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M4 1.5h5L13 5v9.5H4z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M9 1.5V5h4" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M6 8.5h5M6 11h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  )
  if (name === 'invoice') return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M3.5 1.5h9v13l-2-1.2-2 1.2-2-1.2-2 1.2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M6 5h4M6 7.5h4M6 10h2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  )
  if (name === 'admin') return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 1l2 4h4l-3 3 1 4-4-2-4 2 1-4-3-3h4z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
    </svg>
  )
  if (name === 'settings') return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="2.25" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M8 1.5v1.7M8 12.8v1.7M14.5 8h-1.7M3.2 8H1.5M12.6 3.4l-1.2 1.2M4.6 11.4l-1.2 1.2M12.6 12.6l-1.2-1.2M4.6 4.6L3.4 3.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  )
  return null
}

interface Props {
  isStableMember: boolean
  isPlatformAdmin: boolean
  isOwner: boolean
  isOwnerOfAny: boolean
  canManageStables: boolean
  userEmail: string | undefined
  userRole?: string
  stables: { id: string; name: string }[]
  activeStableId: string | null
}

export default function SidebarClient({
  isStableMember,
  isPlatformAdmin,
  isOwner,
  isOwnerOfAny,
  canManageStables,
  userEmail,
  userRole,
  stables,
  activeStableId,
}: Props) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const switchFormRef = useRef<HTMLFormElement>(null)

  // Bouw de navigatielijst op in de vereiste volgorde per rol:
  // Dashboard → Mijn stallen → Paarden → Team → Taken
  // Items die niet van toepassing zijn op de rol worden weggelaten.
  function buildMainLinks() {
    if (isPlatformAdmin) return []
    if (!isStableMember) return EIGENAAR_NAV

    const links = [
      { href: '/stal',       label: 'Dashboard',    icon: 'dashboard', exact: true },
      ...(canManageStables
        ? [{ href: '/stallen', label: 'Mijn stallen', icon: 'stallen', exact: false }]
        : []),
      { href: '/paarden',    label: 'Paarden',      icon: 'horse',     exact: false },
      { href: '/lease',      label: 'Lease',         icon: 'lease',     exact: false },
      { href: '/stal/contracten', label: 'Contracten', icon: 'contract', exact: false },
      { href: '/stal/facturen', label: 'Facturen',    icon: 'invoice',   exact: false },
      { href: '/stal/leden', label: 'Team',          icon: 'team',      exact: false },
      // Externe accounts (paardeneigenaren & bereiders): alleen voor de OWNER (#114).
      ...(isOwnerOfAny
        ? [{ href: '/stal/accounts', label: 'Accounts', icon: 'team', exact: false }]
        : []),
      { href: '/stal/taken', label: 'Taken',         icon: 'check',     exact: false },
      // Alleen voor de OWNER van de actieve stal (#98).
      ...(isOwner
        ? [{ href: '/stal/instellingen', label: 'Instellingen', icon: 'settings', exact: false }]
        : []),
    ]
    return links
  }

  const mainLinks = buildMainLinks()
  const extraLinks: typeof mainLinks = []

  const initials = userEmail
    ? userEmail.slice(0, 2).toUpperCase()
    : 'VL'

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : pathname.startsWith(href)
  }

  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        {collapsed ? (
          <Image src="/logo_icon.png" alt="Velaro" width={32} height={32} priority style={{ objectFit: 'contain' }} />
        ) : (
          <Image src="/velaro_logo_white.png" alt="Velaro" height={24} width={120} priority className="sidebar-logo-img" />
        )}
      </div>

      {/* Stable switcher */}
      {stables.length > 1 && !collapsed && (
        <div className="stalswitcher">
          <span className="stalswitcher-label">Actieve stal</span>
          <form ref={switchFormRef} action={switchActiveStable}>
            {/* Blijf na het wisselen op de huidige pagina; alleen de data herlaadt. */}
            <input type="hidden" name="returnTo" value={pathname} />
            <select
              name="stableId"
              defaultValue={activeStableId ?? ''}
              onChange={() => switchFormRef.current?.requestSubmit()}
              className="stalswitcher-select"
            >
              <option value={ALLE_STALLEN}>Alle stallen</option>
              {stables.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </form>
        </div>
      )}

      {/* Nav */}
      <nav className="sidebar-nav">
        <div className="nav-section">
          {!collapsed && <div className="nav-section-label">Navigatie</div>}
          {[...mainLinks, ...extraLinks].map(({ href, label, icon, exact }) => (
            <Link
              key={href}
              href={href}
              className={`nav-item${isActive(href, exact) ? ' active' : ''}`}
              title={collapsed ? label : undefined}
            >
              <span className="nav-icon"><NavIcon name={icon} /></span>
              <span className="nav-label">{label}</span>
            </Link>
          ))}
        </div>

        {isPlatformAdmin && (
          <div className="nav-section" style={{ marginTop: 'var(--velaro-space-4)' }}>
            {!collapsed && <div className="nav-section-label">Beheer</div>}
            {ADMIN_NAV.map(({ href, label, icon, exact }) => (
              <Link
                key={href}
                href={href}
                className={`nav-item${isActive(href, exact) ? ' active' : ''}`}
                title={collapsed ? label : undefined}
              >
                <span className="nav-icon"><NavIcon name={icon} /></span>
                <span className="nav-label">{label}</span>
              </Link>
            ))}
          </div>
        )}
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
