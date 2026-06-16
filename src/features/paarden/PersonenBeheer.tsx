'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { addHorsePerson, toggleHorsePersonRole, removeHorsePerson } from './actions'

type Person = {
  id: string
  isOwner: boolean
  isRider: boolean
  user: { id: string; name: string | null; email: string }
}

type StableMember = {
  id: string
  name: string | null
  email: string
}

function RolBadge({
  actief,
  label,
  pending,
  onClick,
}: {
  actief: boolean
  label: string
  pending: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={`badge ${actief ? 'badge-gold' : 'badge-neutral'}`}
      style={{
        cursor: pending ? 'wait' : 'pointer',
        opacity: pending ? 0.6 : actief ? 1 : 0.55,
        border: 'none',
      }}
      aria-pressed={actief}
      title={`${label} ${actief ? 'uitzetten' : 'aanzetten'}`}
      disabled={pending}
      onClick={onClick}
    >
      {actief ? '✓ ' : ''}
      {label}
    </button>
  )
}

export default function PersonenBeheer({ horseId, people, members }: {
  horseId: string
  people: Person[]
  members: StableMember[]
}) {
  const [addError, setAddError] = useState<string | null>(null)
  const [addPending, startAdd] = useTransition()
  const [rowError, setRowError] = useState<string | null>(null)
  const [pendingRow, setPendingRow] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [addOwner, setAddOwner] = useState(true)
  const [addRider, setAddRider] = useState(false)

  // Zoek-dropdown (autocomplete) over stalleden — gedrag identiek aan TopbarSearch.
  const [query, setQuery] = useState('')
  const [email, setEmail] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const searchRef = useRef<HTMLDivElement>(null)

  const resultaten = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []
    return members
      .filter((m) => {
        const naam = (m.name ?? '').toLowerCase()
        const mail = m.email.toLowerCase()
        return naam.includes(q) || mail.includes(q)
      })
      .slice(0, 8)
  }, [query, members])

  // Sluit de dropdown bij klikken buiten het zoekveld.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setActiveIndex(-1)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setQuery(val)
    setEmail('')
    setActiveIndex(-1)
    setIsOpen(val.trim().length >= 2)
  }

  function handleSelect(member: StableMember) {
    // Na keuze toont het invoerveld alleen het e-mailadres.
    setQuery(member.email)
    setEmail(member.email)
    setIsOpen(false)
    setActiveIndex(-1)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen || resultaten.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, resultaten.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, -1))
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && activeIndex < resultaten.length) {
        e.preventDefault()
        handleSelect(resultaten[activeIndex])
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      setActiveIndex(-1)
    }
  }

  function resetForm() {
    setShowForm(false)
    setAddError(null)
    setQuery('')
    setEmail('')
    setIsOpen(false)
    setActiveIndex(-1)
    setAddOwner(true)
    setAddRider(false)
  }

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setAddError(null)
    const gekozenEmail = (email || query).trim()
    if (!gekozenEmail) {
      setAddError('Kies een persoon uit de lijst.')
      return
    }
    if (!addOwner && !addRider) {
      setAddError('Kies minstens één rol (eigenaar of bereider).')
      return
    }
    const fd = new FormData()
    fd.set('email', gekozenEmail)
    fd.set('isOwner', addOwner ? 'true' : 'false')
    fd.set('isRider', addRider ? 'true' : 'false')
    startAdd(async () => {
      const result = await addHorsePerson(horseId, fd)
      if (result?.error) {
        setAddError(result.error)
      } else {
        resetForm()
      }
    })
  }

  async function handleToggle(person: Person, role: 'owner' | 'rider') {
    setRowError(null)
    setPendingRow(person.id)
    const enabled = role === 'owner' ? !person.isOwner : !person.isRider
    const result = await toggleHorsePersonRole(horseId, person.id, role, enabled)
    setPendingRow(null)
    if (result?.error) setRowError(result.error)
  }

  async function handleRemove(person: Person) {
    setRowError(null)
    setPendingRow(person.id)
    const result = await removeHorsePerson(horseId, person.id)
    setPendingRow(null)
    if (result?.error) setRowError(result.error)
  }

  return (
    <div className="gezondheid-sectie">
      <div
        className="gezondheid-sectie__header"
        style={{ display: 'flex', justifyContent: 'flex-end' }}
      >
        {!showForm && (
          <button
            type="button"
            className="btn-secondary btn-ghost--sm"
            onClick={() => setShowForm(true)}
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ marginRight: 6 }}>
              <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            Toevoegen
          </button>
        )}
      </div>

      {people.length === 0 ? (
        <div className="gezondheid-leeg">Nog geen personen gekoppeld.</div>
      ) : (
        <table className="gezondheid-tabel">
          <thead>
            <tr>
              <th>Naam</th>
              <th>E-mailadres</th>
              <th>Rollen</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {people.map((p) => {
              const busy = pendingRow === p.id
              return (
                <tr key={p.id}>
                  <td>{p.user.name ?? '—'}</td>
                  <td className="gezondheid-tabel__muted">{p.user.email}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <RolBadge
                        actief={p.isOwner}
                        label="Eigenaar"
                        pending={busy}
                        onClick={() => handleToggle(p, 'owner')}
                      />
                      <RolBadge
                        actief={p.isRider}
                        label="Bereider"
                        pending={busy}
                        onClick={() => handleToggle(p, 'rider')}
                      />
                    </div>
                  </td>
                  <td className="gezondheid-tabel__acties">
                    <button
                      type="button"
                      className="btn-ghost btn-ghost--sm"
                      disabled={busy}
                      onClick={() => handleRemove(p)}
                    >
                      Ontkoppelen
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {rowError && (
        <div className="form-feedback form-feedback--error" style={{ margin: 'var(--velaro-space-4) var(--velaro-space-6)' }}>
          {rowError}
        </div>
      )}

      {showForm && (
        <div style={{ padding: 'var(--velaro-space-5) var(--velaro-space-6)', borderTop: '1px solid var(--velaro-color-border)' }}>
          {addError && <div className="form-feedback form-feedback--error" style={{ marginBottom: 'var(--velaro-space-4)' }}>{addError}</div>}
          <form onSubmit={handleAdd} className="leden-add-row">
            <div className="form-group" style={{ flex: 1, margin: 0, position: 'relative' }} ref={searchRef}>
              <input
                type="text"
                className="input"
                placeholder="Zoek stallid op naam of e-mailadres…"
                value={query}
                onChange={handleQueryChange}
                onKeyDown={handleKeyDown}
                onFocus={() => { if (query.trim().length >= 2) setIsOpen(true) }}
                // Zoekveld, geen login: wachtwoordmanagers (LastPass/1Password) en
                // browser-autofill onderdrukken zodat hun pop-up niet verschijnt (#123).
                autoComplete="off"
                data-lpignore="true"
                data-1p-ignore
                data-form-type="other"
                name="stallid-zoeken"
                role="combobox"
                aria-label="Zoek stallid"
                aria-controls="stallid-zoek-resultaten"
                aria-expanded={isOpen}
                aria-autocomplete="list"
              />
              {isOpen && (
                <div id="stallid-zoek-resultaten" className="topbar-zoek-dropdown" role="listbox" aria-label="Zoekresultaten" style={{ minWidth: '100%' }}>
                  {resultaten.length === 0 ? (
                    <div className="topbar-zoek-leeg">Geen stalleden gevonden</div>
                  ) : (
                    <ul className="topbar-zoek-lijst">
                      {resultaten.map((m, idx) => (
                        <li key={m.id}>
                          <button
                            type="button"
                            className={`topbar-zoek-item${activeIndex === idx ? ' topbar-zoek-item--active' : ''}`}
                            role="option"
                            aria-selected={activeIndex === idx}
                            onClick={() => handleSelect(m)}
                          >
                            <span className="topbar-zoek-tekst">
                              <span className="topbar-zoek-naam">{m.name ?? m.email}</span>
                              <span className="topbar-zoek-sub">{m.email}</span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
            <button type="submit" className="btn-primary" disabled={addPending}>
              {addPending ? '...' : 'Koppelen'}
            </button>
            <button type="button" className="btn-ghost" onClick={resetForm} disabled={addPending}>
              Annuleren
            </button>
          </form>
          <div style={{ display: 'flex', gap: 16, marginTop: 'var(--velaro-space-3)', fontSize: 'var(--velaro-text-sm)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={addOwner}
                onChange={(e) => setAddOwner(e.target.checked)}
              />
              Eigenaar
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={addRider}
                onChange={(e) => setAddRider(e.target.checked)}
              />
              Bereider
            </label>
          </div>
          <div style={{ marginTop: 'var(--velaro-space-3)', fontSize: 'var(--velaro-text-xs)', color: 'var(--velaro-color-muted)' }}>
            Nog geen account?{' '}
            <Link href={`/paarden/${horseId}/personen/nieuw`} className="form-link">
              Klik hier om een nieuw account toe te voegen.
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
