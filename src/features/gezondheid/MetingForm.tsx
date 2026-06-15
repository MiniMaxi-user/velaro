'use client'

import Link from 'next/link'
import SubmitButton from '@/components/SubmitButton'

interface DefaultValues {
  date?: string
  weightKg?: string
  heightCm?: string
  bodyConditionScore?: string
  measuredBy?: string
  notes?: string
}

export default function MetingForm({
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
          <label htmlFor="weightKg" className="form-label">Gewicht (kg)</label>
          <input
            id="weightKg"
            name="weightKg"
            type="number"
            step="0.1"
            min="0"
            className="input"
            placeholder="bv. 520"
            defaultValue={defaultValues?.weightKg}
          />
        </div>

        <div className="form-group">
          <label htmlFor="heightCm" className="form-label">Stokmaat (cm)</label>
          <input
            id="heightCm"
            name="heightCm"
            type="number"
            step="1"
            min="0"
            className="input"
            placeholder="bv. 168"
            defaultValue={defaultValues?.heightCm}
          />
        </div>

        <div className="form-group">
          <label htmlFor="bodyConditionScore" className="form-label">Body Condition Score (1–9)</label>
          <input
            id="bodyConditionScore"
            name="bodyConditionScore"
            type="number"
            step="0.5"
            min="1"
            max="9"
            className="input"
            placeholder="bv. 5"
            defaultValue={defaultValues?.bodyConditionScore}
          />
        </div>

        <div className="form-group">
          <label htmlFor="measuredBy" className="form-label">Gemeten door</label>
          <input
            id="measuredBy"
            name="measuredBy"
            type="text"
            className="input"
            placeholder="bv. Jan de Vries"
            defaultValue={defaultValues?.measuredBy}
          />
        </div>

        <div className="form-group form-grid--full">
          <label htmlFor="notes" className="form-label">Notities</label>
          <textarea id="notes" name="notes" className="input" rows={3} defaultValue={defaultValues?.notes} />
        </div>
      </div>

      <p className="form-hint">Vul naast de datum ten minste één meetwaarde in (gewicht, stokmaat of BCS).</p>

      <div className="action-buttons">
        <SubmitButton label="Opslaan" />
        <Link href={`/paarden/${horseId}`} className="btn-ghost">Annuleren</Link>
      </div>
    </form>
  )
}
