'use client'

import Link from 'next/link'
import SubmitButton from '@/components/SubmitButton'

interface DefaultValues {
  date?: string
  hoefsmid?: string
  nextDate?: string
  notes?: string
}

export default function HoefsmitForm({
  horseId,
  action,
  defaultValues,
}: {
  horseId: string
  action: (formData: FormData) => Promise<void>
  defaultValues?: DefaultValues
}) {
  return (
    <form action={action} className="form-card">
      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="date" className="form-label">Datum *</label>
          <input id="date" name="date" type="date" className="input" required defaultValue={defaultValues?.date} />
        </div>

        <div className="form-group">
          <label htmlFor="hoefsmid" className="form-label">Hoefsmid</label>
          <input
            id="hoefsmid"
            name="hoefsmid"
            type="text"
            className="input"
            placeholder="bv. Jan de Vries"
            defaultValue={defaultValues?.hoefsmid}
          />
        </div>

        <div className="form-group">
          <label htmlFor="nextDate" className="form-label">Volgende afspraak</label>
          <input id="nextDate" name="nextDate" type="date" className="input" defaultValue={defaultValues?.nextDate} />
        </div>

        <div className="form-group form-grid--full">
          <label htmlFor="notes" className="form-label">Notities</label>
          <textarea id="notes" name="notes" className="input" rows={3} defaultValue={defaultValues?.notes} />
        </div>
      </div>

      <div className="action-buttons">
        <SubmitButton label="Opslaan" />
        <Link href={`/paarden/${horseId}`} className="btn-ghost">Annuleren</Link>
      </div>
    </form>
  )
}
