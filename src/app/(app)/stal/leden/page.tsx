import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserStable } from '@/features/paarden/queries'
import { getStableWithMembers } from '@/features/stal/queries'
import { getStableRole } from '@/lib/auth/authorization'
import LidToevoegen from '@/features/stal/LidToevoegen'
import LidVerwijderenButton from '@/features/stal/LidVerwijderenButton'
import RolWijzigen from '@/features/stal/RolWijzigen'

const ROL_LABELS = { OWNER: 'Eigenaar', STAFF: 'Medewerker' }

export default async function LedenPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const stable = await getUserStable(user.id)
  if (!stable) {
    return (
      <main className="page-container">
        <div className="empty-state">
          <div className="empty-state__title">Geen stal gevonden</div>
          <p>Je bent nog niet aan een stal gekoppeld.</p>
        </div>
      </main>
    )
  }

  const [stableWithMembers, currentRole] = await Promise.all([
    getStableWithMembers(stable.id),
    getStableRole(user.id, stable.id),
  ])

  const isOwner = currentRole === 'OWNER'

  return (
    <main className="page-container">
      <div className="page-header">
        <div>
          <div className="label">Stalbeheer</div>
          <h1 className="page-title">
            <em>Leden</em> — {stable.name}
          </h1>
        </div>
        <Link href="/stal" className="btn-ghost">
          ← Stal
        </Link>
      </div>

      <div className="leden-tabel-wrapper">
        <table className="leden-tabel">
          <thead>
            <tr>
              <th>Naam</th>
              <th>E-mailadres</th>
              <th>Rol</th>
              {isOwner && <th></th>}
            </tr>
          </thead>
          <tbody>
            {stableWithMembers?.members.map((member) => {
              const isSelf = member.userId === user.id
              return (
                <tr key={member.id} className={isSelf ? 'leden-tabel__self' : ''}>
                  <td>
                    {member.user.name ?? '—'}
                    {isSelf && <span className="leden-badge leden-badge--self">jij</span>}
                  </td>
                  <td className="leden-tabel__muted">{member.user.email}</td>
                  <td>
                    {isOwner && !isSelf ? (
                      <RolWijzigen memberId={member.id} currentRole={member.role} />
                    ) : (
                      <span className={`leden-badge leden-badge--${member.role.toLowerCase()}`}>
                        {ROL_LABELS[member.role]}
                      </span>
                    )}
                  </td>
                  {isOwner && (
                    <td className="leden-tabel__acties">
                      {!isSelf && (
                        <LidVerwijderenButton
                          memberId={member.id}
                          naam={member.user.name ?? member.user.email}
                        />
                      )}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {isOwner && (
        <div style={{ marginTop: 'var(--velaro-space-8)' }}>
          <LidToevoegen />
        </div>
      )}
    </main>
  )
}
