'use client'

import { useState, useTransition } from 'react'
import { toggleTask, deleteTask, updateTask } from './actions'
import type { ZorgType } from '@prisma/client'

type Horse = { id: string; name: string }

type Task = {
  id: string
  title: string
  date: Date
  isCompleted: boolean
  zorgType: ZorgType | null
  horse: { id: string; name: string } | null
}

const ZORG_TYPE_LABELS: Record<ZorgType, string> = {
  VACCINATIE: 'Vaccinatie',
  ONTWORMING: 'Ontworming',
  DIERENARTS: 'Dierenarts',
  HOEFSMIT: 'Hoefsmit',
}

export default function TaakItem({ task, horses }: { task: Task; horses: Horse[] }) {
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [toggling, startToggle] = useTransition()
  const [deleting, startDelete] = useTransition()
  const [saving, startSave] = useTransition()

  const dateInput = new Date(task.date).toISOString().slice(0, 10)

  function handleToggle() {
    setError(null)
    startToggle(async () => {
      try { await toggleTask(task.id) }
      catch (err) { setError(err instanceof Error ? err.message : 'Fout') }
    })
  }

  function handleDelete() {
    setError(null)
    startDelete(async () => {
      try { await deleteTask(task.id) }
      catch (err) { setError(err instanceof Error ? err.message : 'Fout') }
    })
  }

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    startSave(async () => {
      const result = await updateTask(task.id, fd)
      if (result?.error) {
        setError(result.error)
      } else {
        setEditing(false)
      }
    })
  }

  if (editing) {
    return (
      <div className="taak-item taak-item--editing">
        <form onSubmit={handleSave} className="taak-edit-form">
          {error && <div className="form-feedback form-feedback--error" style={{ marginBottom: 6 }}>{error}</div>}
          <div className="taak-edit-form__row">
            <input
              name="title"
              className="input"
              defaultValue={task.title}
              required
              autoFocus
              autoComplete="off"
            />
            <input
              name="date"
              type="date"
              className="input taak-edit-form__date"
              defaultValue={dateInput}
              required
            />
            {horses.length > 0 && (
              <select name="horseId" className="input select--taak">
                <option value="">Geen paard</option>
                {horses.map((h) => (
                  <option key={h.id} value={h.id} selected={task.horse?.id === h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="taak-edit-form__actions">
            <button type="submit" className="btn-primary btn-primary--sm" disabled={saving}>
              {saving ? '...' : 'Opslaan'}
            </button>
            <button type="button" className="btn-ghost btn-ghost--sm" onClick={() => { setEditing(false); setError(null) }}>
              Annuleren
            </button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className={`taak-item${task.isCompleted ? ' taak-item--done' : ''}`}>
      <button
        type="button"
        className="taak-item__check"
        onClick={handleToggle}
        disabled={toggling}
        aria-label={task.isCompleted ? 'Markeer als openstaand' : 'Markeer als gedaan'}
      >
        {task.isCompleted ? '✓' : ''}
      </button>
      <div className="taak-item__body">
        <span className="taak-item__title">
          {task.title}
          {task.zorgType && (
            <span className="zorg-badge" data-type={task.zorgType.toLowerCase()}>
              {ZORG_TYPE_LABELS[task.zorgType]}
            </span>
          )}
        </span>
        {task.horse && (
          <span className="taak-item__paard">{task.horse.name}</span>
        )}
        {error && <span className="taak-item__error">{error}</span>}
      </div>
      <button
        type="button"
        className="btn-ghost btn-ghost--sm taak-item__edit"
        onClick={() => setEditing(true)}
        disabled={deleting}
      >
        Bewerken
      </button>
      <button
        type="button"
        className="btn-danger btn-danger--sm taak-item__delete"
        onClick={handleDelete}
        disabled={deleting}
      >
        Verwijder
      </button>
    </div>
  )
}
