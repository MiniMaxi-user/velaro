import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth/session'
import { getMemberships, isPlatformAdmin } from '@/lib/auth/authorization'
import { getStableExternalAccounts } from '@/features/stal/accounts/queries'
import AccountsOverzicht from '@/features/stal/accounts/AccountsOverzicht'

// Centraal accountbeheer voor de staleigenaar (OWNER): overzicht van alle externe
// accounts (paardeneigenaren & bereiders) gekoppeld aan de paarden op zijn stal(len),
// met zoeken/filteren en veilig (server-side gevalideerd) verwijderen. Interne
// stalmedewerkers blijven op het Team-scherm; daarnaar verwijst dit scherm. (#114)
export default async function StalAccountsPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  // Platform-admins hebben hun eigen omgeving (/admin/eigenaren).
  if (await isPlatformAdmin(user.id)) redirect('/admin')

  // Alleen OWNER van minstens één stal mag dit scherm zien. STAFF en
  // paardeneigenaar/bereider worden teruggestuurd.
  const memberships = await getMemberships(user.id)
  const isOwner = memberships.some((m) => m.role === 'OWNER')
  if (!isOwner) redirect('/stal')

  const accounts = await getStableExternalAccounts(user.id)

  return (
    <main className="page-container">
      <div className="page-header">
        <div>
          <div className="label">Stalbeheer</div>
          <h1 className="page-title">
            <em>Accounts</em> — paardeneigenaren &amp; bereiders
          </h1>
        </div>
        <Link href="/stal" className="btn-ghost">
          ← Stal
        </Link>
      </div>

      <p style={{ color: 'var(--velaro-color-muted)', marginTop: -8, marginBottom: 'var(--velaro-space-6)', maxWidth: 720 }}>
        Hier zie je alle externe accounts die als paardeneigenaar of bereider aan een
        paard op jouw stal(len) gekoppeld zijn. Stalmedewerkers (eigenaren en
        medewerkers) beheer je op het Team-scherm.
      </p>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          padding: '12px 16px',
          background: 'var(--velaro-color-surface-2)',
          borderRadius: 'var(--velaro-radius-md)',
          marginBottom: 'var(--velaro-space-6)',
        }}
      >
        <span style={{ fontSize: 13, color: 'var(--velaro-color-navy)' }}>
          Stalmedewerkers beheer je op het Team-scherm.
        </span>
        <Link href="/stal/leden" className="btn-ghost" style={{ whiteSpace: 'nowrap' }}>
          Naar Team →
        </Link>
      </div>

      <AccountsOverzicht accounts={accounts} />
    </main>
  )
}
