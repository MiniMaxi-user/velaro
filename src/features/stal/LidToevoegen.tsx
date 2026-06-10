'use client'

import { useActionState } from 'react'
import { addMember } from './actions'
import SubmitButton from '@/components/SubmitButton'

type State = { error?: string; success?: boolean }

async function addMemberAction(prev: State, formData: FormData): Promise<State> {
  try {
    await addMember(formData)
    return { success: true }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export default function LidToevoegen() {
  const [state, formAction] = useActionState(addMemberAction, {})

  return (
    <div className="form-card" style={{ maxWidth: '100%' }}>
      <div className="label" style={{ marginBottom: 'var(--velaro-space-5)' }}>
        Lid toevoegen
      </div>

      {state.error && (
        <div className="form-feedback form-feedback--error">{state.error}</div>
      )}
      {state.success && (
        <div className="form-feedback form-feedback--success">Lid toegevoegd.</div>
      )}

      <form action={formAction}>
        <div className="leden-add-row">
          <div className="form-group" style={{ flex: 2, margin: 0 }}>
            <label htmlFor="email" className="form-label">E-mailadres</label>
            <input
              id="email"
              name="email"
              type="email"
              className="input"
              placeholder="naam@voorbeeld.nl"
              required
            />
          </div>
          <div className="form-group" style={{ flex: 1, margin: 0 }}>
            <label htmlFor="role" className="form-label">Rol</label>
            <select id="role" name="role" className="input">
              <option value="STAFF">Medewerker</option>
              <option value="OWNER">Eigenaar</option>
            </select>
          </div>
          <div style={{ paddingTop: '28px' }}>
            <SubmitButton label="Toevoegen" loadingLabel="Bezig..." />
          </div>
        </div>
      </form>
    </div>
  )
}
