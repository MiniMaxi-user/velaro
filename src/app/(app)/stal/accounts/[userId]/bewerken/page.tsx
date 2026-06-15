import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { getAuthUser } from '@/lib/auth/session'
import { getMemberships, isPlatformAdmin } from '@/lib/auth/authorization'
import { getExternalAccountForEdit } from '@/features/stal/accounts/queries'
import AccountBewerkenForm from '@/features/stal/accounts/AccountBewerkenForm'

interface Props {
  params: Promise<{ userId: string }>
}

// Bewerkpagina voor een extern account (paardeneigenaar/bereider): alleen naam en
// e-mail van de User-rij. De per-paard koppeling blijft op het paardprofiel. (#117)
export default async function AccountBewerkenPage({ params }: Props) {
  const { userId } = await params

  const user = await getAuthUser()
  if (!user) redirect('/login')

  if (await isPlatformAdmin(user.id)) redirect('/admin')

  // Alleen OWNER van minstens één stal mag hier komen; verdere autorisatie
  // (gekoppeld aan dít account) gebeurt in de query.
  const memberships = await getMemberships(user.id)
  const isOwner = memberships.some((m) => m.role === 'OWNER')
  if (!isOwner) redirect('/stal')

  const account = await getExternalAccountForEdit(user.id, userId)
  if (!account) notFound()

  return (
    <main className="page-container">
      <div className="page-header">
        <div>
          <div className="label">Stalbeheer</div>
          <h1 className="page-title">
            <em>{account.name ?? account.email}</em> bewerken
          </h1>
        </div>
        <Link href="/stal/accounts" className="btn-ghost">
          ← Accounts
        </Link>
      </div>

      <div style={{ maxWidth: 600 }}>
        <AccountBewerkenForm account={account} />
      </div>
    </main>
  )
}
