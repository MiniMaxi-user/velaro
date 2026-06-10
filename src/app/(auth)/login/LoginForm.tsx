'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fout, setFout] = useState<string | null>(null)
  const [laden, setLaden] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLaden(true)
    setFout(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setFout('Ongeldig e-mailadres of wachtwoord.')
      setLaden(false)
    } else {
      router.push('/stal')
      router.refresh()
    }
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

      <div className="form-group">
        <label className="form-label">Wachtwoord</label>
        <input
          type="password"
          className="input"
          placeholder="••••••••"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
      </div>

      <div className="form-row">
        <Link href="/wachtwoord-vergeten" className="form-link">
          Wachtwoord vergeten?
        </Link>
      </div>

      {fout && (
        <p style={{ color: 'var(--velaro-color-amber)', fontSize: '14px', marginBottom: '16px' }}>
          {fout}
        </p>
      )}

      <button
        type="submit"
        className="btn-primary btn-primary--full"
        disabled={laden}
      >
        {laden ? 'Laden…' : 'Inloggen'}
      </button>
    </form>
  )
}
