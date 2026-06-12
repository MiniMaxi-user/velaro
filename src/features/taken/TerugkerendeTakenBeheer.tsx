'use client'

import { useState, useTransition } from 'react'
import { createRecurringTask, deleteRecurringTask } from './actions'
import type { RecurringFreq, ZorgType } from '@prisma/client'

type Horse = { id: string; name: string }

type RecurringTask = {
  id: string
  title: string
  frequency: RecurringFreq
  dayOfWeek: number | null
  dayOfMonth: number | null
  zorgType: ZorgType | null
  horse: { id: string; name: string } | null
}

const ZORG_TYPE_LABELS: Record<ZorgType, string> = {
  VACCINATIE: 'Vaccinatie',
  ONTWORMING: 'Ontworming',
  DIERENARTS: 'Dierenarts',
  HOEFSMIT: 'Hoefsmit',
}

const WEEKDAGEN = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag']

function frequentieLabel(task: RecurringTask): string {
  switch (task.frequency) {
    case 'DAILY':
      return 'Dagelijks'
    case 'WEEKLY':
      return `Wekelijks op ${task.dayOfWeek !== null ? WEEKDAGEN[task.dayOfWeek] : '?'}`
    case 'MONTHLY':
      return `Maandelijks op dag ${task.dayOfMonth}`
    default:
      return task.frequency
  }
}

export default function TerugkerendeTakenBeheer({
  recurringTasks,
  horses,
}: {
  recurringTasks: RecurringTask[]
  horses: Horse[]
}) {
  const [open, setOpen] = useState(false)
  const [frequency, setFrequency] = useState<RecurringFreq>('DAILY')
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [creating, startCreate] = useTransition()
  const [deleting, startDelete] = useTransition()

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError(null)
    const fd = new FormData(e.currentTarget)
    startCreate(async () => {
      const result = await createRecurringTask(fd)
      if (result?.error) {
        setFormError(result.error)
      } else {
        ;(e.target as HTMLFormElement).reset()
        setFrequency('DAILY')
      }
    })
  }

  function handleDelete(id: string, title: string) {
    if (!confirm(`Verwijder het sjabloon "${title}"? Eerder aangemaakte taken blijven bestaan.`)) return
    setDeleteError(null)
    startDelete(async () => {
      const result = await deleteRecurringTask(id)
      if (result?.error) setDeleteError(result.error)
    })
  }

  return (
    <div className="panel" style={{ marginTop: 'var(--velaro-space-6)' }}>
      <div className="panel-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="gezondheid-sectie__titel">Terugkerende taken</span>
        <button
          type="button"
          className="btn-ghost btn-ghost--sm"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? 'Verbergen' : 'Beheren'}
        </button>
      </div>

      {open && (
        <div style={{ padding: 'var(--velaro-space-4)' }}>
          {/* Lijst van actieve sjablonen */}
          {recurringTasks.length === 0 ? (
            <p style={{ color: 'var(--velaro-color-muted)', fontSize: 'var(--velaro-text-sm)', marginBottom: 'var(--velaro-space-4)' }}>
              Nog geen terugkerende taken ingesteld.
            </p>
          ) : (
            <div className="taken-lijst" style={{ marginBottom: 'var(--velaro-space-4)', border: '1px solid var(--velaro-color-border)', borderRadius: 'var(--velaro-radius-md)' }}>
              {recurringTasks.map((t) => (
                <div key={t.id} className="taak-item">
                  <div className="taak-item__body">
                    <span className="taak-item__title">
                      {t.title}
                      {t.zorgType && (
                        <span className="zorg-badge" data-type={t.zorgType.toLowerCase()}>
                          {ZORG_TYPE_LABELS[t.zorgType]}
                        </span>
                      )}
                    </span>
                    <span className="taak-item__paard">
                      {frequentieLabel(t)}{t.horse ? ` · ${t.horse.name}` : ''}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn-danger btn-danger--sm taak-item__delete"
                    onClick={() => handleDelete(t.id, t.title)}
                    disabled={deleting}
                  >
                    Verwijder
                  </button>
                </div>
              ))}
            </div>
          )}

          {deleteError && (
            <div className="form-feedback form-feedback--error" style={{ marginBottom: 'var(--velaro-space-3)' }}>
              {deleteError}
            </div>
          )}

          {/* Formulier nieuw sjabloon */}
          <div style={{ borderTop: '1px solid var(--velaro-color-border)', paddingTop: 'var(--velaro-space-4)' }}>
            <div className="label" style={{ marginBottom: 'var(--velaro-space-3)' }}>Nieuw sjabloon toevoegen</div>
            <form onSubmit={handleCreate}>
              {formError && (
                <div className="form-feedback form-feedback--error" style={{ marginBottom: 'var(--velaro-space-3)' }}>
                  {formError}
                </div>
              )}

              <div className="form-row" style={{ gap: 'var(--velaro-space-3)' }}>
                <div className="form-group" style={{ flex: 2 }}>
                  <label className="form-label">Omschrijving</label>
                  <input
                    name="title"
                    className="input"
                    placeholder="Bijv. Paarden voeren"
                    required
                    autoComplete="off"
                  />
                </div>

                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Zorgtype (optioneel)</label>
                  <select name="zorgType" className="input">
                    <option value="">Geen (gewone taak)</option>
                    <option value="VACCINATIE">Vaccinatie</option>
                    <option value="ONTWORMING">Ontworming</option>
                    <option value="DIERENARTS">Dierenarts</option>
                    <option value="HOEFSMIT">Hoefsmit</option>
                  </select>
                </div>
              </div>

              <div className="form-row" style={{ gap: 'var(--velaro-space-3)' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Frequentie</label>
                  <select
                    name="frequency"
                    className="input"
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as RecurringFreq)}
                  >
                    <option value="DAILY">Dagelijks</option>
                    <option value="WEEKLY">Wekelijks</option>
                    <option value="MONTHLY">Maandelijks</option>
                  </select>
                </div>

                {frequency === 'WEEKLY' && (
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Dag van de week</label>
                    <select name="dayOfWeek" className="input">
                      {WEEKDAGEN.map((dag, i) => (
                        <option key={i} value={i}>{dag}</option>
                      ))}
                    </select>
                  </div>
                )}

                {frequency === 'MONTHLY' && (
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Dag van de maand (1–28)</label>
                    <input
                      name="dayOfMonth"
                      type="number"
                      className="input"
                      min={1}
                      max={28}
                      defaultValue={1}
                      required
                    />
                  </div>
                )}

                {horses.length > 0 && (
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Paard (optioneel)</label>
                    <select name="horseId" className="input">
                      <option value="">Geen paard</option>
                      {horses.map((h) => (
                        <option key={h.id} value={h.id}>{h.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <button type="submit" className="btn-primary" disabled={creating}>
                {creating ? '...' : 'Sjabloon toevoegen'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
