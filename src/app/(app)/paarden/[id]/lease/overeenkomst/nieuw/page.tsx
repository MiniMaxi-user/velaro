import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth/session'
import { getHorse } from '@/features/paarden/queries'
import { getStableRole } from '@/lib/auth/authorization'
import { createLease } from '@/features/lease/leaseActions'
import { LEASE_TYPE_LABELS, LEASE_TYPE_OPTIES } from '@/features/lease/leaseHelpers'
import SubmitButton from '@/components/SubmitButton'

interface Props {
  params: Promise<{ id: string }>
}

export default async function NieuweLeasePage({ params }: Props) {
  const { id } = await params

  const user = await getAuthUser()
  if (!user) redirect('/login')

  const horse = await getHorse(id)
  if (!horse) notFound()

  const role = await getStableRole(user.id, horse.stableId)
  if (!role) notFound()

  const action = createLease.bind(null, id)

  return (
    <main className="page-container">
      <div className="page-header">
        <Link href={`/paarden/${id}?tab=lease`} className="btn-ghost">← {horse.name}</Link>
      </div>

      <div style={{ marginBottom: 'var(--velaro-space-8)' }}>
        <div className="label">Lease vastleggen</div>
        <h1 className="page-title">{horse.name}</h1>
      </div>

      <form action={action} className="form-card">
        <div className="form-grid">
          <div className="form-group form-grid--full">
            <label htmlFor="leaserEmail" className="form-label">E-mailadres leaser *</label>
            <input id="leaserEmail" name="leaserEmail" type="email" className="input" required placeholder="account van de leaser" />
            <p className="form-hint">De leaser moet een bestaand Velaro-account hebben.</p>
          </div>

          <div className="form-group">
            <label htmlFor="leaseType" className="form-label">Leasevorm *</label>
            <select id="leaseType" name="leaseType" className="input" required defaultValue="">
              <option value="" disabled>Kies een leasevorm…</option>
              {LEASE_TYPE_OPTIES.map((t) => (
                <option key={t} value={t}>{LEASE_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="startDate" className="form-label">Ingangsdatum</label>
            <input id="startDate" name="startDate" type="date" className="input" />
          </div>

          <div className="form-group">
            <label htmlFor="trialEndsAt" className="form-label">Einde proefperiode</label>
            <input id="trialEndsAt" name="trialEndsAt" type="date" className="input" />
          </div>

          <div className="form-group">
            <label htmlFor="endDate" className="form-label">Einddatum</label>
            <input id="endDate" name="endDate" type="date" className="input" />
          </div>

          <div className="form-group">
            <label htmlFor="minimumTermMonths" className="form-label">Minimale looptijd (maanden)</label>
            <input id="minimumTermMonths" name="minimumTermMonths" type="number" min="0" className="input" />
          </div>

          <div className="form-group">
            <label htmlFor="noticePeriodDays" className="form-label">Opzegtermijn (dagen)</label>
            <input id="noticePeriodDays" name="noticePeriodDays" type="number" min="0" className="input" />
          </div>
        </div>

        <div className="action-buttons">
          <SubmitButton label="Lease aanmaken" />
          <Link href={`/paarden/${id}?tab=lease`} className="btn-ghost">Annuleren</Link>
        </div>
      </form>
    </main>
  )
}
