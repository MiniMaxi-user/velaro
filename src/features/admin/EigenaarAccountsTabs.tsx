'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import QuotumForm from './QuotumForm'

type StableOwner = {
  id: string
  name: string | null
  email: string
  maxStables: number
  createdAt: Date
  _count: { stableMemberships: number }
  stableMemberships: {
    stable: { id: string; name: string; city: string | null }
  }[]
}

type HorseOwner = {
  id: string
  name: string | null
  email: string
  maxStables: number
  createdAt: Date
  _count: { horsePeople: number }
  horsePeople: {
    horse: {
      id: string
      name: string
      stable: { id: string; name: string } | null
    }
  }[]
}

interface Props {
  stableOwners: StableOwner[]
  horseOwners: HorseOwner[]
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('nl-NL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

function initials(name: string | null, email: string): string {
  const src = name ?? email
  return src.slice(0, 2).toUpperCase()
}

export default function EigenaarAccountsTabs({ stableOwners, horseOwners }: Props) {
  const [activeTab, setActiveTab] = useState<'staleigenaar' | 'paardeneigenaar'>('staleigenaar')
  const [zoekterm, setZoekterm] = useState('')

  const filteredStableOwners = useMemo(() => {
    if (!zoekterm.trim()) return stableOwners
    const q = zoekterm.toLowerCase()
    return stableOwners.filter(
      (o) =>
        (o.name ?? '').toLowerCase().includes(q) ||
        o.email.toLowerCase().includes(q) ||
        o.stableMemberships.some((m) =>
          m.stable.name.toLowerCase().includes(q) ||
          (m.stable.city ?? '').toLowerCase().includes(q)
        )
    )
  }, [stableOwners, zoekterm])

  const filteredHorseOwners = useMemo(() => {
    if (!zoekterm.trim()) return horseOwners
    const q = zoekterm.toLowerCase()
    return horseOwners.filter(
      (o) =>
        (o.name ?? '').toLowerCase().includes(q) ||
        o.email.toLowerCase().includes(q) ||
        o.horsePeople.some((ho) =>
          ho.horse.name.toLowerCase().includes(q) ||
          (ho.horse.stable?.name ?? '').toLowerCase().includes(q)
        )
    )
  }, [horseOwners, zoekterm])

  return (
    <>
      {/* Tabs + zoekbalk */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        borderBottom: '2px solid var(--velaro-color-border)',
        marginBottom: 16,
        paddingBottom: 0,
      }}>
        <div style={{ display: 'flex', gap: 0 }}>
          <button
            type="button"
            className={`tab-btn${activeTab === 'staleigenaar' ? ' active' : ''}`}
            onClick={() => { setActiveTab('staleigenaar'); setZoekterm('') }}
          >
            Staleigenaren
            <span className="gezondheid-tab-count">{stableOwners.length}</span>
          </button>
          <button
            type="button"
            className={`tab-btn${activeTab === 'paardeneigenaar' ? ' active' : ''}`}
            onClick={() => { setActiveTab('paardeneigenaar'); setZoekterm('') }}
          >
            Paardeneigenaren
            <span className="gezondheid-tab-count">{horseOwners.length}</span>
          </button>
        </div>

        <div style={{ paddingBottom: 8 }}>
          <input
            type="search"
            placeholder="Zoek op naam, e-mail of stal…"
            value={zoekterm}
            onChange={(e) => setZoekterm(e.target.value)}
            className="input"
            style={{ width: 260, fontSize: 13 }}
          />
        </div>
      </div>

      {/* Tab: Staleigenaren */}
      {activeTab === 'staleigenaar' && (
        filteredStableOwners.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__title">
              {zoekterm ? 'Geen resultaten gevonden' : 'Nog geen staleigenaar-accounts'}
            </div>
            {!zoekterm && (
              <p style={{ color: 'var(--velaro-color-muted)', marginTop: 8 }}>
                Maak het eerste eigenaaraccount aan voor een klant.
              </p>
            )}
          </div>
        ) : (
          <div className="data-grid-wrapper">
            <table className="data-grid">
              <thead>
                <tr>
                  <th>Naam</th>
                  <th>Stallen</th>
                  <th>Quotum</th>
                  <th>Aangemaakt</th>
                  <th>Gegevens</th>
                  <th>Quotum beheren</th>
                </tr>
              </thead>
              <tbody>
                {filteredStableOwners.map((owner) => (
                  <tr key={owner.id}>
                    <td>
                      <div className="cell-entity">
                        <div className="cell-avatar">
                          {initials(owner.name, owner.email)}
                        </div>
                        <div>
                          <div className="cell-entity-name">{owner.name ?? '—'}</div>
                          <div className="cell-entity-sub">{owner.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {owner.stableMemberships.length === 0 ? (
                        <span style={{ color: 'var(--velaro-color-muted)', fontSize: 12 }}>—</span>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {owner.stableMemberships.map((m) => (
                            <span key={m.stable.id} style={{ fontSize: 12 }}>
                              {m.stable.name}
                              {m.stable.city ? (
                                <span style={{ color: 'var(--velaro-color-muted)' }}> · {m.stable.city}</span>
                              ) : null}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-neutral">
                        {owner._count.stableMemberships} / {owner.maxStables}
                      </span>
                    </td>
                    <td style={{ color: 'var(--velaro-color-muted)', fontSize: 12 }}>
                      {formatDate(owner.createdAt)}
                    </td>
                    <td>
                      <Link
                        href={`/admin/eigenaren/${owner.id}`}
                        className="btn-ghost"
                        style={{ padding: '6px 12px', fontSize: 13 }}
                      >
                        Zakelijke gegevens
                      </Link>
                    </td>
                    <td>
                      <QuotumForm userId={owner.id} currentMax={owner.maxStables} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Tab: Paardeneigenaren */}
      {activeTab === 'paardeneigenaar' && (
        filteredHorseOwners.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__title">
              {zoekterm ? 'Geen resultaten gevonden' : 'Nog geen paardeneigenaar-accounts'}
            </div>
            {!zoekterm && (
              <p style={{ color: 'var(--velaro-color-muted)', marginTop: 8 }}>
                Paardeneigenaren worden aangemaakt wanneer een staleigenaar hen koppelt aan een paard.
              </p>
            )}
          </div>
        ) : (
          <div className="data-grid-wrapper">
            <table className="data-grid">
              <thead>
                <tr>
                  <th>Naam</th>
                  <th>Paarden</th>
                  <th>Stallen</th>
                  <th>Aangemaakt</th>
                </tr>
              </thead>
              <tbody>
                {filteredHorseOwners.map((owner) => {
                  // Deduplicate stables
                  const stableMap = new Map<string, string>()
                  owner.horsePeople.forEach((ho) => {
                    if (ho.horse.stable) {
                      stableMap.set(ho.horse.stable.id, ho.horse.stable.name)
                    }
                  })
                  const stables = Array.from(stableMap.entries())

                  return (
                    <tr key={owner.id}>
                      <td>
                        <div className="cell-entity">
                          <div className="cell-avatar">
                            {initials(owner.name, owner.email)}
                          </div>
                          <div>
                            <div className="cell-entity-name">{owner.name ?? '—'}</div>
                            <div className="cell-entity-sub">{owner.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        {/* Geen link naar /paarden/{id}: de platform-admin hoort de
                            operationele staldetails van een klant niet in te zien.
                            Alleen de paardnaam als tekst. */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {owner.horsePeople.map((ho) => (
                            <span key={ho.horse.id} style={{ fontSize: 12 }}>
                              {ho.horse.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        {stables.length === 0 ? (
                          <span style={{ color: 'var(--velaro-color-muted)', fontSize: 12 }}>—</span>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {stables.map(([id, name]) => (
                              <span key={id} style={{ fontSize: 12 }}>{name}</span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td style={{ color: 'var(--velaro-color-muted)', fontSize: 12 }}>
                        {formatDate(owner.createdAt)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      )}
    </>
  )
}
