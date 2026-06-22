'use client'

import { useActionState } from 'react'
import { updateStable } from './actions'
import SubmitButton from '@/components/SubmitButton'

type Stable = {
  id: string
  name: string
  address: string | null
  postalCode: string | null
  city: string | null
  phone: string | null
  email: string | null
  website: string | null
  description: string | null
  openingHours: string | null
  invoiceAddress: string | null
  invoicePostalCode: string | null
  invoiceCity: string | null
  iban: string | null
  accountHolder: string | null
}

type State = { error?: string }

function makeAction(stableId: string) {
  return async function action(prev: State, formData: FormData): Promise<State> {
    try {
      await updateStable(stableId, formData)
      return {}
    } catch (e) {
      if ((e as { digest?: string }).digest?.startsWith('NEXT_REDIRECT')) throw e
      return { error: (e as Error).message }
    }
  }
}

export default function StalBewerkenForm({ stable }: { stable: Stable }) {
  const [state, formAction] = useActionState(makeAction(stable.id), {})

  return (
    <form action={formAction}>
      {state.error && (
        <div className="form-feedback form-feedback--error">{state.error}</div>
      )}

      {/* Basisgegevens */}
      <div className="form-section-title" style={{ marginBottom: 'var(--velaro-space-4)' }}>
        <strong>Basisgegevens</strong>
      </div>

      <div className="form-group">
        <label className="form-label">Stalnaam <span style={{ color: 'var(--velaro-color-amber)' }}>*</span></label>
        <input name="name" type="text" className="input" defaultValue={stable.name} required />
      </div>

      <div className="form-group">
        <label className="form-label">Omschrijving</label>
        <textarea
          name="description"
          className="input"
          rows={3}
          defaultValue={stable.description ?? ''}
          placeholder="Korte beschrijving van de stal voor eigenaren"
        />
      </div>

      {/* Contactgegevens */}
      <div className="form-section-title" style={{ margin: 'var(--velaro-space-6) 0 var(--velaro-space-4)' }}>
        <strong>Contactgegevens</strong>
      </div>

      <div className="form-row">
        <div className="form-group" style={{ flex: 1 }}>
          <label className="form-label">Telefoonnummer</label>
          <input name="phone" type="tel" className="input" defaultValue={stable.phone ?? ''} placeholder="+31 6 12345678" />
        </div>
        <div className="form-group" style={{ flex: 1 }}>
          <label className="form-label">E-mailadres</label>
          <input name="email" type="email" className="input" defaultValue={stable.email ?? ''} placeholder="info@stal.nl" />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Website</label>
        <input name="website" type="url" className="input" defaultValue={stable.website ?? ''} placeholder="https://www.jouwstal.nl" />
      </div>

      {/* Bezoekadres */}
      <div className="form-section-title" style={{ margin: 'var(--velaro-space-6) 0 var(--velaro-space-4)' }}>
        <strong>Bezoekadres</strong>
      </div>

      <div className="form-row">
        <div className="form-group" style={{ flex: 2 }}>
          <label className="form-label">Adres</label>
          <input name="address" type="text" className="input" defaultValue={stable.address ?? ''} placeholder="Stalweg 12" />
        </div>
        <div className="form-group" style={{ flex: 1 }}>
          <label className="form-label">Postcode</label>
          <input name="postalCode" type="text" className="input" defaultValue={stable.postalCode ?? ''} placeholder="1234 AB" />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Stad / dorp</label>
        <input name="city" type="text" className="input" defaultValue={stable.city ?? ''} placeholder="Amsterdam" />
      </div>

      {/* Openingstijden */}
      <div className="form-section-title" style={{ margin: 'var(--velaro-space-6) 0 var(--velaro-space-4)' }}>
        <strong>Openingstijden</strong>
      </div>

      <div className="form-group">
        <label className="form-label">Openingstijden</label>
        <textarea
          name="openingHours"
          className="input"
          rows={3}
          defaultValue={stable.openingHours ?? ''}
          placeholder={`Ma–vr: 07:00–21:00\nZa–zo: 08:00–20:00`}
        />
        <span style={{ fontSize: 'var(--velaro-text-xs)', color: 'var(--velaro-color-muted)', marginTop: 4, display: 'block' }}>
          Vrij in te vullen, bijv. per dag of als blok.
        </span>
      </div>

      {/* Factuuradres */}
      <div className="form-section-title" style={{ margin: 'var(--velaro-space-6) 0 var(--velaro-space-4)' }}>
        <strong>Factuuradres <span style={{ fontWeight: 400, fontSize: 'var(--velaro-text-sm)', color: 'var(--velaro-color-muted)' }}>(indien afwijkend van bezoekadres)</span></strong>
      </div>

      <div className="form-row">
        <div className="form-group" style={{ flex: 2 }}>
          <label className="form-label">Factuuradres</label>
          <input name="invoiceAddress" type="text" className="input" defaultValue={stable.invoiceAddress ?? ''} placeholder="Kantoorstraat 5" />
        </div>
        <div className="form-group" style={{ flex: 1 }}>
          <label className="form-label">Postcode</label>
          <input name="invoicePostalCode" type="text" className="input" defaultValue={stable.invoicePostalCode ?? ''} placeholder="5678 CD" />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Stad / dorp</label>
        <input name="invoiceCity" type="text" className="input" defaultValue={stable.invoiceCity ?? ''} placeholder="Rotterdam" />
      </div>

      {/* Betaalgegevens ([Fact 06] #151): voeden de overboekingsinstructie op de factuur. */}
      <div className="form-section-title" style={{ margin: 'var(--velaro-space-6) 0 var(--velaro-space-4)' }}>
        <strong>Betaalgegevens <span style={{ fontWeight: 400, fontSize: 'var(--velaro-text-sm)', color: 'var(--velaro-color-muted)' }}>(voor de overboekingsinstructie op facturen)</span></strong>
      </div>

      <div className="form-row">
        <div className="form-group" style={{ flex: 2 }}>
          <label className="form-label">IBAN</label>
          <input name="iban" type="text" className="input" defaultValue={stable.iban ?? ''} placeholder="NL91 ABNA 0417 1643 00" />
        </div>
        <div className="form-group" style={{ flex: 2 }}>
          <label className="form-label">Tenaamstelling</label>
          <input name="accountHolder" type="text" className="input" defaultValue={stable.accountHolder ?? ''} placeholder="Pensionstal De Vries B.V." />
        </div>
      </div>

      <div style={{ marginTop: 'var(--velaro-space-6)' }}>
        <SubmitButton label="Wijzigingen opslaan" loadingLabel="Opslaan…" />
      </div>
    </form>
  )
}
