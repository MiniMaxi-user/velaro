import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth/session'
import { getHorse } from '@/features/paarden/queries'
import { getStableRole } from '@/lib/auth/authorization'
import HoefsmitForm from '@/features/gezondheid/HoefsmitForm'
import { createHoefsmitBezoek } from '@/features/gezondheid/actions'

interface Props {
  params: Promise<{ id: string }>
}

export default async function NieuwHoefsmitBezoekPage({ params }: Props) {
  const { id } = await params

  const user = await getAuthUser()
  if (!user) redirect('/login')

  const horse = await getHorse(id)
  if (!horse) notFound()

  const role = await getStableRole(user.id, horse.stableId)
  if (!role) notFound()

  const action = createHoefsmitBezoek.bind(null, id)

  return (
    <main className="page-container">
      <div className="page-header">
        <Link href={`/paarden/${id}`} className="btn-ghost">← {horse.name}</Link>
      </div>

      <div style={{ marginBottom: 'var(--velaro-space-8)' }}>
        <div className="label">Hoefsmitbezoek toevoegen</div>
        <h1 className="page-title">{horse.name}</h1>
      </div>

      <HoefsmitForm horseId={id} action={action} />
    </main>
  )
}
