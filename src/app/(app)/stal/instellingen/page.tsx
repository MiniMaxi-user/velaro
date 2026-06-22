import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth/session'
import { getUserStable } from '@/features/paarden/queries'
import { getStableRole } from '@/lib/auth/authorization'
import { getStableLogoSignedUrl } from '@/features/stal/logoStorage'
import { getAlgemeneVoorwaardenSignedUrl } from '@/features/stal/algemeneVoorwaardenStorage'
import LogoBeheer from '@/features/stal/LogoBeheer'
import AlgemeneVoorwaardenBeheer from '@/features/stal/AlgemeneVoorwaardenBeheer'

// ── Stal-instellingen (#98) ──────────────────────────────────────────────────
// Centrale plek voor instellingen van de actieve stal, alleen voor de OWNER. Eerste
// (en voorlopig enige) instelling: het stallogo voor de contract-PDF. STAFF en
// paardeneigenaren krijgen geen toegang (redirect naar het staldashboard).

export default async function StalInstellingenPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  const stable = await getUserStable(user.id)
  if (!stable) redirect('/stal')

  // Autorisatie: uitsluitend de OWNER van de actieve stal mag de instellingen zien.
  const role = await getStableRole(user.id, stable.id)
  if (role !== 'OWNER') redirect('/stal')

  const logoUrl = await getStableLogoSignedUrl(stable.id)
  const algemeneVoorwaardenUrl = await getAlgemeneVoorwaardenSignedUrl(stable.id)

  return (
    <main className="page-container">
      <div className="page-header">
        <div>
          <div className="label">Stalbeheer</div>
          <h1 className="page-title">
            <em>Instellingen</em> — {stable.name}
          </h1>
        </div>
        <Link href="/stal" className="btn-ghost">
          ← Stal
        </Link>
      </div>

      <div
        className="card"
        style={{
          maxWidth: 640,
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--velaro-space-6)',
        }}
      >
        <LogoBeheer logoUrl={logoUrl} />
        <AlgemeneVoorwaardenBeheer algemeneVoorwaardenUrl={algemeneVoorwaardenUrl} />
      </div>
    </main>
  )
}
