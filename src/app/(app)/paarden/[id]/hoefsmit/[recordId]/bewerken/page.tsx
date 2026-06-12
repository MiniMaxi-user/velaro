import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth/session'
import { getHorse } from '@/features/paarden/queries'
import { getStableRole } from '@/lib/auth/authorization'
import { getHoefsmitBezoek } from '@/features/gezondheid/queries'
import { updateHoefsmitBezoek } from '@/features/gezondheid/actions'
import HoefsmitForm from '@/features/gezondheid/HoefsmitForm'

interface Props {
  params: Promise<{ id: string; recordId: string }>
}

function toDateInput(d: Date | null | undefined) {
  return d ? new Date(d).toISOString().slice(0, 10) : ''
}

export default async function HoefsmitBezoekBewerkenPage({ params }: Props) {
  const { id, recordId } = await params

  const user = await getAuthUser()
  if (!user) redirect('/login')

  const [horse, record] = await Promise.all([getHorse(id), getHoefsmitBezoek(recordId)])
  if (!horse || !record || record.horseId !== id) notFound()

  const role = await getStableRole(user.id, horse.stableId)
  if (!role) notFound()

  const action = updateHoefsmitBezoek.bind(null, recordId, id)

  return (
    <main className="page-container">
      <div className="page-header">
        <Link href={`/paarden/${id}`} className="btn-ghost">← {horse.name}</Link>
      </div>

      <div style={{ marginBottom: 'var(--velaro-space-8)' }}>
        <div className="label">Hoefsmitbezoek bewerken</div>
        <h1 className="page-title">{horse.name}</h1>
      </div>

      <HoefsmitForm
        horseId={id}
        action={action}
        defaultValues={{
          date: toDateInput(record.date),
          hoefsmid: record.hoefsmid ?? '',
          nextDate: toDateInput(record.nextDate),
          notes: record.notes ?? '',
        }}
      />
    </main>
  )
}
