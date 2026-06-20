'use client'

import { useState, useEffect, useActionState } from 'react'
import type { Horse } from '@prisma/client'
import { createHorse, updateHorse } from './actions'
import {
  GESLACHT_LABELS,
  DISCIPLINE_OPTIES,
  RELATIETYPE_LABELS,
  STALLINGSVORM_LABELS,
  formatDateForInput,
} from './paardHelpers'
import SubmitButton from '@/components/SubmitButton'
import Link from 'next/link'

interface Props {
  horse?: Horse
}

// Veldgebonden fout (`fieldError`) wordt bij het betreffende veld getoond;
// `error` blijft als vangnet-balk voor niet-veld-gebonden fouten.
type State = { error?: string; fieldError?: { field: string; message: string }; submittedAt?: number }

export default function PaardForm({ horse }: Props) {
  const serverAction = horse ? updateHorse.bind(null, horse.id) : createHorse
  const cancelHref = horse ? `/paarden/${horse.id}` : '/paarden'
  const [uitgesloten, setUitgesloten] = useState(horse?.excludedFromConsumption ?? false)

  async function action(prev: State, formData: FormData): Promise<State> {
    try {
      await serverAction(formData)
      return {}
    } catch (e) {
      if ((e as { digest?: string }).digest?.startsWith('NEXT_REDIRECT')) throw e
      const raw = (e as Error).message
      // Veldgebonden fout? De server codeert die als JSON { field, message }.
      try {
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed.field === 'string' && typeof parsed.message === 'string') {
          return { fieldError: parsed, submittedAt: Date.now() }
        }
      } catch {
        // Geen JSON → generieke fout.
      }
      return { error: raw, submittedAt: Date.now() }
    }
  }

  const [state, formAction] = useActionState(action, {})
  const fieldError = state.fieldError

  // Helpers om een veldfout aan het juiste veld te koppelen.
  const errClass = (field: string) => (fieldError?.field === field ? ' is-error' : '')
  const fieldMsg = (field: string) =>
    fieldError?.field === field ? (
      <div id={`${field}-error`} className="form-error">{fieldError.message}</div>
    ) : null

  // Scroll naar en focus het eerste foutieve veld na een mislukte poging.
  useEffect(() => {
    if (!fieldError?.field || !state.submittedAt) return
    const el = document.getElementById(fieldError.field)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      ;(el as HTMLElement).focus({ preventScroll: true })
    }
  }, [fieldError?.field, state.submittedAt])

  return (
    <form action={formAction} className="form-card">
      {state.error && (
        <div className="form-feedback form-feedback--error">{state.error}</div>
      )}

      {/* ── Sectie: Algemeen ── */}
      <div className="profiel-sectie-label">Algemeen</div>
      <div className="form-grid">
        <div className="form-group form-grid--full">
          <label htmlFor="name" className="form-label">Naam *</label>
          <input
            id="name" name="name" type="text" className={`input${errClass('name')}`}
            placeholder="bv. Shadowfax"
            defaultValue={horse?.name ?? ''}
            required
            aria-invalid={fieldError?.field === 'name' || undefined}
            aria-describedby={fieldError?.field === 'name' ? 'name-error' : undefined}
          />
          {fieldMsg('name')}
        </div>

        <div className="form-group">
          <label htmlFor="breed" className="form-label">Ras</label>
          <input
            id="breed" name="breed" type="text" className="input"
            placeholder="bv. KWPN"
            defaultValue={horse?.breed ?? ''}
          />
        </div>

        <div className="form-group">
          <label htmlFor="sex" className="form-label">Geslacht</label>
          <select id="sex" name="sex" className="input" defaultValue={horse?.sex ?? ''}>
            <option value="">— selecteer —</option>
            {(Object.keys(GESLACHT_LABELS) as Array<keyof typeof GESLACHT_LABELS>).map((key) => (
              <option key={key} value={key}>{GESLACHT_LABELS[key]}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="dateOfBirth" className="form-label">Geboortedatum</label>
          <input
            id="dateOfBirth" name="dateOfBirth" type="date" className="input"
            defaultValue={formatDateForInput(horse?.dateOfBirth ?? null)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="color" className="form-label">Vachtkleur</label>
          <input
            id="color" name="color" type="text" className="input"
            placeholder="bv. Zwart"
            defaultValue={horse?.color ?? ''}
          />
        </div>

        <div className="form-group">
          <label htmlFor="boxNumber" className="form-label">Stalplek / Box</label>
          <input
            id="boxNumber" name="boxNumber" type="text" className="input"
            placeholder="bv. B12"
            defaultValue={horse?.boxNumber ?? ''}
          />
        </div>

        <div className="form-group">
          <label htmlFor="relatietype" className="form-label">Relatietype</label>
          <select
            id="relatietype"
            name="relatietype"
            className="input"
            defaultValue={horse?.relatietype ?? ''}
          >
            <option value="">— selecteer —</option>
            {(Object.keys(RELATIETYPE_LABELS) as Array<keyof typeof RELATIETYPE_LABELS>).map((key) => (
              <option key={key} value={key}>{RELATIETYPE_LABELS[key]}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="stallingsvorm" className="form-label">Stallingsvorm</label>
          <select
            id="stallingsvorm"
            name="stallingsvorm"
            className="input"
            defaultValue={horse?.stallingsvorm ?? ''}
          >
            <option value="">— selecteer —</option>
            {(Object.keys(STALLINGSVORM_LABELS) as Array<keyof typeof STALLINGSVORM_LABELS>).map((key) => (
              <option key={key} value={key}>{STALLINGSVORM_LABELS[key]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Sectie: Identificatie ── */}
      <div className="profiel-sectie-label" style={{ marginTop: 'var(--velaro-space-8)' }}>Identificatie</div>
      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="chipNumber" className="form-label">Chipnummer</label>
          <input
            id="chipNumber" name="chipNumber" type="text" className={`input${errClass('chipNumber')}`}
            placeholder="15 cijfers (bv. 528246000XXXXXX)"
            defaultValue={horse?.chipNumber ?? ''}
            maxLength={20}
            aria-invalid={fieldError?.field === 'chipNumber' || undefined}
            aria-describedby={fieldError?.field === 'chipNumber' ? 'chipNumber-error' : undefined}
          />
          {fieldMsg('chipNumber')}
        </div>

        <div className="form-group">
          <label htmlFor="ueln" className="form-label">UELN</label>
          <input
            id="ueln" name="ueln" type="text" className="input"
            placeholder="bv. 528003XXXXXXXXX"
            defaultValue={horse?.ueln ?? ''}
          />
        </div>

        <div className="form-group">
          <label htmlFor="passportNumber" className="form-label">Paspoortnummer</label>
          <input
            id="passportNumber" name="passportNumber" type="text" className="input"
            placeholder="bv. NL000000000"
            defaultValue={horse?.passportNumber ?? ''}
          />
        </div>
      </div>

      {/* ── Sectie: Afstamming ── */}
      <div className="profiel-sectie-label" style={{ marginTop: 'var(--velaro-space-8)' }}>Afstamming</div>
      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="sireName" className="form-label">Vader</label>
          <input
            id="sireName" name="sireName" type="text" className="input"
            placeholder="Naam hengst"
            defaultValue={horse?.sireName ?? ''}
          />
        </div>

        <div className="form-group">
          <label htmlFor="damName" className="form-label">Moeder</label>
          <input
            id="damName" name="damName" type="text" className="input"
            placeholder="Naam merrie"
            defaultValue={horse?.damName ?? ''}
          />
        </div>
      </div>

      {/* ── Sectie: Sport ── */}
      <div className="profiel-sectie-label" style={{ marginTop: 'var(--velaro-space-8)' }}>Sport</div>
      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="discipline" className="form-label">Discipline</label>
          <select id="discipline" name="discipline" className="input" defaultValue={horse?.discipline ?? ''}>
            <option value="">— selecteer —</option>
            {DISCIPLINE_OPTIES.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="disciplineLevel" className="form-label">Niveau</label>
          <input
            id="disciplineLevel" name="disciplineLevel" type="text" className="input"
            placeholder="bv. B, L, M, Z, ZZ"
            defaultValue={horse?.disciplineLevel ?? ''}
          />
        </div>
      </div>

      {/* ── Sectie: Welzijn / EU ── */}
      <div className="profiel-sectie-label" style={{ marginTop: 'var(--velaro-space-8)' }}>Welzijn / EU</div>
      <div className="form-grid">
        <div className="form-group form-grid--full">
          <label className="profiel-checkbox-label">
            <input
              type="checkbox"
              name="excludedFromConsumption"
              value="true"
              defaultChecked={horse?.excludedFromConsumption ?? false}
              onChange={(e) => setUitgesloten(e.target.checked)}
              className="profiel-checkbox"
            />
            Uitgesloten van slacht (EU-verplicht)
          </label>
        </div>

        {uitgesloten && (
          <div className="form-group">
            <label htmlFor="excludedFromConsumptionDate" className="form-label">Datum uitsluiting</label>
            <input
              id="excludedFromConsumptionDate"
              name="excludedFromConsumptionDate"
              type="date"
              className="input"
              defaultValue={formatDateForInput(horse?.excludedFromConsumptionDate ?? null)}
            />
          </div>
        )}
      </div>

      <div className="action-buttons">
        <SubmitButton label={horse ? 'Wijzigingen opslaan' : 'Paard aanmaken'} />
        <Link href={cancelHref} className="btn-ghost">Annuleren</Link>
      </div>
    </form>
  )
}
