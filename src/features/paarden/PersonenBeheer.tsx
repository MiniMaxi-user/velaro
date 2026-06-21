'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import type { HorseEigendom } from '@prisma/client'
import {
  addHorsePerson,
  toggleHorsePersonRole,
  removeHorsePerson,
  setHorseEigendom,
} from './actions'

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

export default function PersonenBeheer({ horseId, people, members, eigendom, stalNaam }: {
  horseId: string
  people: Person[]
  members: StableMember[]
  eigendom: HorseEigendom
  stalNaam: string
}) {
  // Eigendom (STAL / PARTICULIER) — bron van waarheid voor "wie is eigenaar".
  const [eigendomState, setEigendomState] = useState<HorseEigendom>(eigendom)
  const [eigendomPending, startEigendom] = useTransition()
  const [eigendomError, setEigendomError] = useState<string | null>(null)
  const isStalEigendom = eigendomState === 'STAL'

  function handleEigendom(next: HorseEigendom) {
    if (next === eigendomState) return
    setEigendomError(null)
    const vorige = eigendomState
    setEigendomState(next)
    startEigendom(async () => {
      const result = await setHorseEigendom(horseId, next)
      if (result?.error) {
        setEigendomState(vorige)
        setEigendomError(result.error)
      }
    })
  }

  const [addError, setAddError] = useState<string | null>(null)
  const [addPending, startAdd] = useTransition()
  const [rowError, setRowError] = useState<string | null>(null)
  const [pendingRow, setPendingRow] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [addOwner, setAddOwner] = useState(true)
  const [addRider, setAddRider] = useState(false)

  // Zoek-dropdown (autocomplete) over stalleden — gedrag identiek aan TopbarSearch.
  // `query` is de directe invoerwaarde; `debouncedQuery` wordt pas ~500ms na het
  // stoppen met typen bijgewerkt en stuurt de getoonde resultaten aan (#123).
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [email, setEmail] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const searchRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const resultaten = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase()
    if (q.length < 2) return []
    return members
      .filter((m) => {
        const naam = (m.name ?? '').toLowerCase()
        const mail = m.email.toLowerCase()
        return naam.includes(q) || mail.includes(q)
      })
      .slice(0, 8)
  }, [debouncedQuery, members])

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

  // Debounce-timer opruimen bij unmount.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  function handleQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setQuery(val)
    setEmail('')
    setActiveIndex(-1)
    // Debounce: pas na ~500ms zonder verder typen de resultaten (her)berekenen
    // en de dropdown openen — gelijk aan de topbar-zoekfunctie.
    if (timerRef.current) clearTimeout(timerRef.current)
    if (val.trim().length < 2) {
      setDebouncedQuery('')
      setIsOpen(false)
      return
    }
    timerRef.current = setTimeout(() => {
      setDebouncedQuery(val)
      setIsOpen(true)
    }, 500)
  }

  function handleSelect(member: StableMember) {
    // Na keuze toont het invoerveld alleen het e-mailadres.
    if (timerRef.current) clearTimeout(timerRef.current)
    setQuery(member.email)
    setDebouncedQuery(member.email)
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
    if (timerRef.current) clearTimeout(timerRef.current)
    setShowForm(false)
    setAddError(null)
    setQuery('')
    setDebouncedQuery('')
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
    // Bij stal-eigendom is de stal de eigenaar; een gekoppelde persoon kan dan alleen
    // bereider zijn (geen particuliere eigenaar-rol).
    const wilOwner = isStalEigendom ? false : addOwner
    if (!wilOwner && !addRider) {
      setAddError(
        isStalEigendom
          ? 'Kies de rol bereider.'
          : 'Kies minstens één rol (eigenaar of bereider).'
      )
      return
    }
    const fd = new FormData()
    fd.set('email', gekozenEmail)
    fd.set('isOwner', wilOwner ? 'true' : 'false')
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
    // Eén enkele panel-kaart met het grid direct erin, identiek aan GezondheidTabs.
    // Geen extra bordered container (panel-body) eromheen meer (#121).
    <div className="panel">
      {/* Eigendom: is dit paard van de stal zelf of van een particuliere eigenaar?
          Bron van waarheid voor "wie is eigenaar" (en de contract-poort). */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--velaro-color-border)' }}>
        <div className="form-label" style={{ marginBottom: 6 }}>Eigendom</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className={`badge ${isStalEigendom ? 'badge-gold' : 'badge-neutral'}`}
            style={{ cursor: eigendomPending ? 'wait' : 'pointer', border: 'none', opacity: eigendomPending ? 0.6 : isStalEigendom ? 1 : 0.55 }}
            aria-pressed={isStalEigendom}
            disabled={eigendomPending}
            onClick={() => handleEigendom('STAL')}
          >
            Deze stal
          </button>
          <button
            type="button"
            className={`badge ${!isStalEigendom ? 'badge-gold' : 'badge-neutral'}`}
            style={{ cursor: eigendomPending ? 'wait' : 'pointer', border: 'none', opacity: eigendomPending ? 0.6 : !isStalEigendom ? 1 : 0.55 }}
            aria-pressed={!isStalEigendom}
            disabled={eigendomPending}
            onClick={() => handleEigendom('PARTICULIER')}
          >
            Particuliere eigenaar
          </button>
        </div>
        <p className="form-hint" style={{ marginTop: 8 }}>
          {isStalEigendom
            ? `${stalNaam} is eigenaar van dit paard. Een leasecontract kan rechtstreeks met de stal als eigenaar worden opgesteld; je hoeft geen particuliere eigenaar te koppelen.`
            : 'Het paard is van een particuliere eigenaar. Koppel hieronder de eigenaar (en eventueel een bereider).'}
        </p>
        {eigendomError && (
          <div className="form-feedback form-feedback--error" style={{ marginTop: 8 }}>
            {eigendomError}
          </div>
        )}
        {isStalEigendom && people.some((p) => p.isOwner) && (
          <div className="form-feedback form-feedback--error" style={{ marginTop: 8 }}>
            Er staan nog particuliere eigenaren gekoppeld. Zet hun eigenaar-rol uit —
            bij stal-eigendom is de stal de eigenaar.
          </div>
        )}
      </div>

      {/* Toevoegen-knop rechts boven het grid, zoals de gezondheid-subtabs (#121).
          Geen aparte (bruine) kopbalk meer. */}
      {!showForm && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 18px 0' }}>
          <button
            type="button"
            className="btn-ghost btn-ghost--sm"
            onClick={() => setShowForm(true)}
          >
            + Toevoegen
          </button>
        </div>
      )}

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
                onFocus={() => { if (resultaten.length > 0) setIsOpen(true) }}
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
            {!isStalEigendom && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={addOwner}
                  onChange={(e) => setAddOwner(e.target.checked)}
                />
                Eigenaar
              </label>
            )}
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
