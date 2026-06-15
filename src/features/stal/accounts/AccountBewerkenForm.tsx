'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { updateExternalAccount } from './actions'
import SubmitButton from '@/components/SubmitButton'
import type { ExternalAccountForEdit } from './queries'

type State = { error?: string }

export default function AccountBewerkenForm({ account }: { account: ExternalAccountForEdit }) {
  async function formAction(_prev: State, formData: FormData): Promise<State> {
    const result = await updateExternalAccount(account.userId, {
      name: String(formData.get('name') ?? ''),
      email: String(formData.get('email') ?? ''),
    })
    return result ? { error: result.error } : {}
  }

  const [state, dispatch] = useActionState(formAction, {})

  return (
    <form action={dispatch} className="form-card">
      {state.error && (
        <div className="form-feedback form-feedback--error">{state.error}</div>
      )}

      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="name" className="form-label">Naam</label>
          <input
            id="name"
            name="name"
            type="text"
            className="input"
            placeholder="Jan de Vries"
            defaultValue={account.name ?? ''}
          />
        </div>

        <div className="form-group">
          <label htmlFor="email" className="form-label">E-mailadres *</label>
          <input
            id="email"
            name="email"
            type="email"
            className="input"
            placeholder="jan@voorbeeld.nl"
            defaultValue={account.email}
            required
          />
        </div>
      </div>

      <div className="action-buttons">
        <SubmitButton label="Wijzigingen opslaan" loadingLabel="Bezig..." />
        <Link href="/stal/accounts" className="btn-ghost">Annuleren</Link>
      </div>
    </form>
  )
}
