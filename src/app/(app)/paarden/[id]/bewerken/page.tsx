import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth/session'
import { getHorse } from '@/features/paarden/queries'
import { getStableRole } from '@/lib/auth/authorization'
import { getPaardFotoSignedUrl } from '@/features/paarden/paardFotoStorage'
import PaardForm from '@/features/paarden/PaardForm'
import PaardFotoBeheer from '@/features/paarden/PaardFotoBeheer'

interface Props {
  params: Promise<{ id: string }>
}

export default async function BewerkenPage({ params }: Props) {
  const { id } = await params

  const user = await getAuthUser()
  if (!user) redirect('/login')

  const horse = await getHorse(id)
  if (!horse) notFound()

  const role = await getStableRole(user.id, horse.stableId)
  if (!role) notFound()

  const fotoUrl = await getPaardFotoSignedUrl(id)

  return (
    <main className="page-container">
      <div className="page-header">
        <h1 className="page-title">
          <em>{horse.name}</em> bewerken
        </h1>
        <Link href={`/paarden/${id}`} className="btn-ghost">
          ← Terug
        </Link>
      </div>
      <div className="form-card" style={{ marginBottom: 'var(--velaro-space-4)' }}>
        <PaardFotoBeheer horseId={id} fotoUrl={fotoUrl} />
      </div>
      <PaardForm horse={horse} />
    </main>
  )
}
