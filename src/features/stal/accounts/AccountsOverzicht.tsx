'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { deleteExternalAccount } from './actions'
import type { StableExternalAccount } from './queries'

interface Props {
  accounts: StableExternalAccount[]
}

function initials(name: string | null, email: string): string {
  const src = name ?? email
  return src.slice(0, 2).toUpperCase()
}

function AccountRij({ account }: { account: StableExternalAccount }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleDelete() {
    const naam = account.name ?? account.email
    if (!confirm(`Weet je zeker dat je het account van ${naam} definitief wilt verwijderen?`)) return
    setError(null)
    startTransition(async () => {
      const result = await deleteExternalAccount(account.userId)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <tr>
      <td>
        <div className="cell-entity">
          <div className="cell-avatar">{initials(account.name, account.email)}</div>
          <div>
            <div className="cell-entity-name">{account.name ?? '—'}</div>
            <div className="cell-entity-sub">{account.email}</div>
          </div>
        </div>
      </td>
      <td>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {account.isOwner && <span className="badge badge-neutral">Eigenaar</span>}
          {account.isRider && <span className="badge badge-neutral">Bereider</span>}
          {!account.isOwner && !account.isRider && (
            <span style={{ color: 'var(--velaro-color-muted)', fontSize: 12 }}>—</span>
          )}
        </div>
      </td>
      <td>
        {account.horses.length === 0 ? (
          <span style={{ color: 'var(--velaro-color-muted)', fontSize: 12 }}>—</span>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {account.horses.map((h) => (
              <span key={h.horsePersonId} style={{ fontSize: 12 }}>
                <Link href={`/paarden/${h.horseId}`} className="form-link">
                  {h.horseName}
                </Link>
                <span style={{ color: 'var(--velaro-color-muted)' }}>
                  {' '}· {h.isOwner && h.isRider ? 'eigenaar/bereider' : h.isOwner ? 'eigenaar' : 'bereider'}
                </span>
              </span>
            ))}
          </div>
        )}
      </td>
      <td>
        {account.stables.length === 0 ? (
          <span style={{ color: 'var(--velaro-color-muted)', fontSize: 12 }}>—</span>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {account.stables.map((s) => (
              <span key={s.id} style={{ fontSize: 12 }}>{s.name}</span>
            ))}
          </div>
        )}
      </td>
      <td className="leden-tabel__acties">
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="btn-danger btn-danger--sm"
        >
          {isPending ? '...' : 'Verwijderen'}
        </button>
        {error && (
          <div className="rol-error" style={{ marginTop: 6, maxWidth: 280 }}>
            {error}
          </div>
        )}
      </td>
    </tr>
  )
}

export default function AccountsOverzicht({ accounts }: Props) {
  const [zoekterm, setZoekterm] = useState('')

  const filtered = useMemo(() => {
    if (!zoekterm.trim()) return accounts
    const q = zoekterm.toLowerCase()
    return accounts.filter(
      (a) =>
        (a.name ?? '').toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        a.stables.some((s) => s.name.toLowerCase().includes(q)) ||
        a.horses.some((h) => h.horseName.toLowerCase().includes(q)),
    )
  }, [accounts, zoekterm])

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          borderBottom: '2px solid var(--velaro-color-border)',
          marginBottom: 16,
          paddingBottom: 8,
        }}
      >
        <div className="label">{accounts.length} account{accounts.length === 1 ? '' : 's'}</div>
        <input
          type="search"
          placeholder="Zoek op naam, e-mail, stal of paard…"
          value={zoekterm}
          onChange={(e) => setZoekterm(e.target.value)}
          className="input"
          style={{ width: 280, fontSize: 13 }}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__title">
            {zoekterm ? 'Geen resultaten gevonden' : 'Nog geen externe accounts'}
          </div>
          {!zoekterm && (
            <p style={{ color: 'var(--velaro-color-muted)', marginTop: 8 }}>
              Externe accounts ontstaan wanneer je een paardeneigenaar of bereider aan
              een paard koppelt op het paardprofiel.
            </p>
          )}
        </div>
      ) : (
        <div className="data-grid-wrapper">
          <table className="data-grid">
            <thead>
              <tr>
                <th>Naam</th>
                <th>Rol(len)</th>
                <th>Paard(en)</th>
                <th>Stal(len)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((account) => (
                <AccountRij key={account.userId} account={account} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
