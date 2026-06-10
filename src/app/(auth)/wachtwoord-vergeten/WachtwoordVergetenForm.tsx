'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function WachtwoordVergetenForm() {
  const [email, setEmail] = useState('')
  const [verzonden, setVerzonden] = useState(false)
  const [laden, setLaden] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLaden(true)

    const supabase = createClient()
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    })

    setVerzonden(true)
    setLaden(false)
  }

  if (verzonden) {
    return (
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: 'var(--velaro-color-muted)', marginBottom: '24px' }}>
          Als dit e-mailadres bij ons bekend is, ontvang je een link om je wachtwoord te
          herstellen.
        </p>
        <Link href="/login" className="form-link">
          Terug naar inloggen
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label className="form-label">E-mailadres</label>
        <input
          type="email"
          className="input"
          placeholder="naam@voorbeeld.nl"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
      </div>

      <button
        type="submit"
        className="btn-primary btn-primary--full"
        disabled={laden}
        style={{ marginBottom: '16px' }}
      >
        {laden ? 'Laden…' : 'Verstuur herstelmail'}
      </button>

      <div className="auth-footer">
        <Link href="/login" className="form-link">
          Terug naar inloggen
        </Link>
      </div>
    </form>
  )
}
