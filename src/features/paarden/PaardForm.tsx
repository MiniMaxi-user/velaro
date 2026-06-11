'use client'

import { useState } from 'react'
import type { Horse } from '@prisma/client'
import { createHorse, updateHorse } from './actions'
import { GESLACHT_LABELS, DISCIPLINE_OPTIES, formatDateForInput } from './paardHelpers'
import SubmitButton from '@/components/SubmitButton'
import Link from 'next/link'

interface Props {
  horse?: Horse
}

export default function PaardForm({ horse }: Props) {
  const action = horse ? updateHorse.bind(null, horse.id) : createHorse
  const cancelHref = horse ? `/paarden/${horse.id}` : '/paarden'
  const [uitgesloten, setUitgesloten] = useState(horse?.excludedFromConsumption ?? false)

  return (
    <form action={action} className="form-card">

      {/* ── Sectie: Algemeen ── */}
      <div className="profiel-sectie-label">Algemeen</div>
      <div className="form-grid">
        <div className="form-group form-grid--full">
          <label htmlFor="name" className="form-label">Naam *</label>
          <input
            id="name" name="name" type="text" className="input"
            placeholder="bv. Shadowfax"
            defaultValue={horse?.name ?? ''}
            required
          />
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
      </div>

      {/* ── Sectie: Identificatie ── */}
      <div className="profiel-sectie-label" style={{ marginTop: 'var(--velaro-space-8)' }}>Identificatie</div>
      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="chipNumber" className="form-label">Chipnummer</label>
          <input
            id="chipNumber" name="chipNumber" type="text" className="input"
            placeholder="15 cijfers (bv. 528246000XXXXXX)"
            defaultValue={horse?.chipNumber ?? ''}
            maxLength={20}
          />
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
