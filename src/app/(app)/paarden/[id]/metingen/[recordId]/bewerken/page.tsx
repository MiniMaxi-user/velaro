import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth/session'
import { getHorse } from '@/features/paarden/queries'
import { getStableRole } from '@/lib/auth/authorization'
import { getMeting } from '@/features/gezondheid/queries'
import { updateMeting } from '@/features/gezondheid/actions'
import MetingForm from '@/features/gezondheid/MetingForm'

interface Props {
  params: Promise<{ id: string; recordId: string }>
}

function toDateInput(d: Date | null | undefined) {
  return d ? new Date(d).toISOString().slice(0, 10) : ''
}

export default async function MetingBewerkenPage({ params }: Props) {
  const { id, recordId } = await params

  const user = await getAuthUser()
  if (!user) redirect('/login')

  const [horse, record] = await Promise.all([getHorse(id), getMeting(recordId)])
  if (!horse || !record || record.horseId !== id) notFound()

  const role = await getStableRole(user.id, horse.stableId)
  if (!role) notFound()

  const action = updateMeting.bind(null, recordId, id)

  return (
    <main className="page-container">
      <div className="page-header">
        <Link href={`/paarden/${id}`} className="btn-ghost">← {horse.name}</Link>
      </div>

      <div style={{ marginBottom: 'var(--velaro-space-8)' }}>
        <div className="label">Meting bewerken</div>
        <h1 className="page-title">{horse.name}</h1>
      </div>

      <MetingForm
        horseId={id}
        action={action}
        defaultValues={{
          date: toDateInput(record.date),
          weightKg: record.weightKg != null ? String(record.weightKg) : '',
          heightCm: record.heightCm != null ? String(record.heightCm) : '',
          bodyConditionScore: record.bodyConditionScore != null ? String(record.bodyConditionScore) : '',
          measuredBy: record.measuredBy ?? '',
          notes: record.notes ?? '',
        }}
      />
    </main>
  )
}
