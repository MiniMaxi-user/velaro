import Link from 'next/link'
import { getAuthUser, getDbUser } from '@/lib/auth/session'
import TopbarUserMenu from './TopbarUserMenu'
import TopbarSearch from './TopbarSearch'
import NotificationBell, { type NotifItem } from './NotificationBell'
import { getNotificationsForUser } from '@/features/berichten/queries'
import { getLeaseUnreadCount } from '@/features/lease/inquiryQueries'

export default async function Topbar() {
  const user = await getAuthUser()

  let displayName = user?.email?.split('@')[0] ?? 'Gebruiker'
  let initials = displayName.slice(0, 2).toUpperCase()
  let notifItems: NotifItem[] = []
  let notifCount = 0
  let leaseUnread = 0

  if (user) {
    const [dbUser, notifications, leaseCount] = await Promise.all([
      getDbUser(user.id),
      getNotificationsForUser(user.id),
      getLeaseUnreadCount(user.id),
    ])
    leaseUnread = leaseCount

    if (dbUser?.name) {
      displayName = dbUser.name
      const parts = dbUser.name.trim().split(' ')
      initials = parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : dbUser.name.slice(0, 2).toUpperCase()
    }

    notifCount = notifications.count
    notifItems = notifications.items.map((m) => ({
      id: m.id,
      subject: m.subject,
      createdAt: m.createdAt,
      type: m.horseId ? 'horse' : 'stable',
      bron: m.horse?.name ?? m.stable?.name ?? 'Onbekend',
    }))
  }

  return (
    <header className="topbar">
      <TopbarSearch />
      <div className="topbar-spacer" />
      <div className="topbar-actions">
        <Link
          href="/berichten"
          className="topbar-icon-btn"
          title="Berichten"
          aria-label="Berichten"
          style={{ position: 'relative' }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 3.5h12v8H5l-3 2.5V3.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
          </svg>
          {leaseUnread > 0 && <span className="notif-badge">{leaseUnread > 9 ? '9+' : leaseUnread}</span>}
        </Link>
        <NotificationBell items={notifItems} count={notifCount} />
        <div className="topbar-divider" />
        <TopbarUserMenu initials={initials} displayName={displayName} />
      </div>
    </header>
  )
}
