'use client'

import { useRef, useState, useTransition } from 'react'
import { addHorseOwner, removeHorseOwner } from './actions'

type Owner = { id: string; userId: string; user: { name: string | null; email: string } }

export default function EigenaarBeheer({ horseId, owners }: { horseId: string; owners: Owner[] }) {
  const [addError, setAddError] = useState<string | null>(null)
  const [addPending, startAdd] = useTransition()
  const [removeError, setRemoveError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setAddError(null)
    const fd = new FormData(e.currentTarget)
    startAdd(async () => {
      const result = await addHorseOwner(horseId, fd)
      if (result?.error) {
        setAddError(result.error)
      } else {
        formRef.current?.reset()
      }
    })
  }

  async function handleRemove(ownershipId: string) {
    setRemoveError(null)
    const result = await removeHorseOwner(horseId, ownershipId)
    if (result?.error) {
      setRemoveError(result.error)
    }
  }

  return (
    <div className="gezondheid-sectie">
      <div className="gezondheid-sectie__header">
        <span className="gezondheid-sectie__titel">Eigenaren</span>
      </div>

      {owners.length === 0 ? (
        <div className="gezondheid-leeg">Nog geen eigenaren gekoppeld.</div>
      ) : (
        <table className="gezondheid-tabel">
          <thead>
            <tr>
              <th>Naam</th>
              <th>E-mailadres</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {owners.map((o) => (
              <tr key={o.id}>
                <td>{o.user.name ?? '—'}</td>
                <td className="gezondheid-tabel__muted">{o.user.email}</td>
                <td className="gezondheid-tabel__acties">
                  <button
                    type="button"
                    className="btn-danger btn-danger--sm"
                    onClick={() => handleRemove(o.id)}
                  >
                    Ontkoppelen
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {removeError && (
        <div className="form-feedback form-feedback--error" style={{ margin: 'var(--velaro-space-4) var(--velaro-space-6)' }}>
          {removeError}
        </div>
      )}

      <div style={{ padding: 'var(--velaro-space-5) var(--velaro-space-6)', borderTop: '1px solid var(--velaro-color-border)' }}>
        {addError && <div className="form-feedback form-feedback--error" style={{ marginBottom: 'var(--velaro-space-4)' }}>{addError}</div>}
        <form ref={formRef} onSubmit={handleAdd} className="leden-add-row">
          <div className="form-group" style={{ flex: 1, margin: 0 }}>
            <input
              name="email"
              type="email"
              className="input"
              placeholder="E-mailadres eigenaar"
              required
              autoComplete="off"
            />
          </div>
          <button type="submit" className="btn-primary" disabled={addPending}>
            {addPending ? '...' : 'Koppelen'}
          </button>
        </form>
      </div>
    </div>
  )
}
