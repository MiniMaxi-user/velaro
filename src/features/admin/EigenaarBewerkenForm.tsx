'use client'

import { useActionState, useState } from 'react'
import { updateOwnerBusinessDetails } from './actions'
import SubmitButton from '@/components/SubmitButton'

type BusinessProfile = {
  companyName: string | null
  address: string | null
  postalCode: string | null
  city: string | null
  country: string | null
  kvkNumber: string | null
  vatNumber: string | null
  separateInvoiceAddress: boolean
  invoiceAddress: string | null
  invoicePostalCode: string | null
  invoiceCity: string | null
  invoiceCountry: string | null
}

type Owner = {
  id: string
  name: string | null
  email: string
  // 1-1 gekoppeld zakelijk profiel; ontbreekt wanneer er nog geen gegevens zijn.
  businessProfile: BusinessProfile | null
}

type State = { error?: string; success?: boolean }

function makeAction(userId: string) {
  return async function action(prev: State, formData: FormData): Promise<State> {
    try {
      await updateOwnerBusinessDetails(userId, formData)
      return { success: true }
    } catch (e) {
      if ((e as { digest?: string }).digest?.startsWith('NEXT_REDIRECT')) throw e
      return { error: (e as Error).message }
    }
  }
}

export default function EigenaarBewerkenForm({ owner }: { owner: Owner }) {
  const profile = owner.businessProfile
  const [state, formAction] = useActionState(makeAction(owner.id), {})
  const [separateInvoice, setSeparateInvoice] = useState(profile?.separateInvoiceAddress ?? false)

  return (
    <form action={formAction}>
      {state.error && (
        <div className="form-feedback form-feedback--error">{state.error}</div>
      )}
      {state.success && (
        <div className="form-feedback form-feedback--success">Gegevens opgeslagen.</div>
      )}

      {/* Account */}
      <div className="form-section-title" style={{ marginBottom: 'var(--velaro-space-4)' }}>
        <strong>Account</strong>
      </div>

      <div className="form-row">
        <div className="form-group" style={{ flex: 1 }}>
          <label className="form-label">Naam</label>
          <input type="text" className="input" value={owner.name ?? '—'} disabled />
        </div>
        <div className="form-group" style={{ flex: 1 }}>
          <label className="form-label">E-mailadres</label>
          <input type="text" className="input" value={owner.email} disabled />
        </div>
      </div>

      {/* Zakelijke gegevens */}
      <div className="form-section-title" style={{ margin: 'var(--velaro-space-6) 0 var(--velaro-space-4)' }}>
        <strong>Zakelijke gegevens</strong>
      </div>

      <div className="form-group">
        <label className="form-label">Bedrijfs- / factuurnaam</label>
        <input name="companyName" type="text" className="input" defaultValue={profile?.companyName ?? ''} placeholder="Pensionstal De Vries B.V." />
      </div>

      <div className="form-row">
        <div className="form-group" style={{ flex: 1 }}>
          <label className="form-label">KvK-nummer</label>
          <input name="kvkNumber" type="text" className="input" defaultValue={profile?.kvkNumber ?? ''} placeholder="12345678" />
        </div>
        <div className="form-group" style={{ flex: 1 }}>
          <label className="form-label">Btw-nummer</label>
          <input name="vatNumber" type="text" className="input" defaultValue={profile?.vatNumber ?? ''} placeholder="NL123456789B01" />
        </div>
      </div>

      {/* Adres */}
      <div className="form-section-title" style={{ margin: 'var(--velaro-space-6) 0 var(--velaro-space-4)' }}>
        <strong>Adres</strong>
      </div>

      <div className="form-group">
        <label className="form-label">Adres</label>
        <input name="address" type="text" className="input" defaultValue={profile?.address ?? ''} placeholder="Stalweg 12" />
      </div>

      <div className="form-row">
        <div className="form-group" style={{ flex: 1 }}>
          <label className="form-label">Postcode</label>
          <input name="postalCode" type="text" className="input" defaultValue={profile?.postalCode ?? ''} placeholder="1234 AB" />
        </div>
        <div className="form-group" style={{ flex: 1 }}>
          <label className="form-label">Plaats</label>
          <input name="city" type="text" className="input" defaultValue={profile?.city ?? ''} placeholder="Amsterdam" />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Land</label>
        <input name="country" type="text" className="input" defaultValue={profile?.country ?? ''} placeholder="Nederland" />
      </div>

      {/* Factuuradres */}
      <div className="form-section-title" style={{ margin: 'var(--velaro-space-6) 0 var(--velaro-space-4)' }}>
        <strong>Factuuradres</strong>
      </div>

      <div className="form-group">
        <label className="toggle-switch">
          <input
            name="separateInvoiceAddress"
            type="checkbox"
            checked={separateInvoice}
            onChange={(e) => setSeparateInvoice(e.target.checked)}
          />
          <span className="toggle-track" />
          <span className="toggle-label">Afwijkend factuuradres gebruiken</span>
        </label>
        <span style={{ fontSize: 'var(--velaro-text-xs)', color: 'var(--velaro-color-muted)', marginTop: 6, display: 'block' }}>
          Staat dit uit, dan geldt het adres hierboven als factuuradres.
        </span>
      </div>

      {separateInvoice && (
        <>
          <div className="form-group">
            <label className="form-label">Factuuradres</label>
            <input name="invoiceAddress" type="text" className="input" defaultValue={profile?.invoiceAddress ?? ''} placeholder="Kantoorstraat 5" />
          </div>

          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Postcode</label>
              <input name="invoicePostalCode" type="text" className="input" defaultValue={profile?.invoicePostalCode ?? ''} placeholder="5678 CD" />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Plaats</label>
              <input name="invoiceCity" type="text" className="input" defaultValue={profile?.invoiceCity ?? ''} placeholder="Rotterdam" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Land</label>
            <input name="invoiceCountry" type="text" className="input" defaultValue={profile?.invoiceCountry ?? ''} placeholder="Nederland" />
          </div>
        </>
      )}

      <div style={{ marginTop: 'var(--velaro-space-6)' }}>
        <SubmitButton label="Wijzigingen opslaan" loadingLabel="Opslaan…" />
      </div>
    </form>
  )
}
