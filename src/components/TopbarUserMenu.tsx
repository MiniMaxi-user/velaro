'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props {
  initials: string
  displayName: string
}

export default function TopbarUserMenu({ initials, displayName }: Props) {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="topbar-user-menu">
      <div className="topbar-user">
        <div className="topbar-user-avatar">{initials}</div>
        <span className="topbar-user-name">{displayName}</span>
        <svg className="topbar-user-chevron" width="10" height="6" viewBox="0 0 10 6" fill="none">
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
      <div className="topbar-user-dropdown">
        <div className="topbar-user-dropdown-header">
          <div className="topbar-user-avatar topbar-user-avatar--lg">{initials}</div>
          <div>
            <div className="topbar-dropdown-name">{displayName}</div>
          </div>
        </div>
        <div className="dropdown-sep" />
        <button className="topbar-dropdown-item topbar-dropdown-item--danger" onClick={handleSignOut}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M5 2H2a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            <path d="M9 10l3-3-3-3M12 7H5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Uitloggen
        </button>
      </div>
    </div>
  )
}
