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
  paymentMethod: 'OVERBOEKING' | 'SEPA_INCASSO'
  sepaAccountHolder: string | null
  sepaIban: string | null
  sepaMandateReference: string | null
  sepaMandateDate: Date | string | null
}

// Formatteert een (mogelijk Date/string) mandaatdatum naar het input[type=date]-formaat
// (YYYY-MM-DD), of een lege string wanneer er geen datum is.
function naarDatumInputWaarde(value: Date | string | null): string {
  if (!value) return ''
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
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
  const [paymentMethod, setPaymentMethod] = useState<'OVERBOEKING' | 'SEPA_INCASSO'>(
    profile?.paymentMethod ?? 'OVERBOEKING',
  )

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

      {/* Betaalwijze ([Fact 06] #151) */}
      <div className="form-section-title" style={{ margin: 'var(--velaro-space-6) 0 var(--velaro-space-4)' }}>
        <strong>Betaalwijze</strong>
      </div>

      <div className="form-group">
        <label className="form-label">Hoe betaalt deze eigenaar?</label>
        <select
          name="paymentMethod"
          className="input"
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value as 'OVERBOEKING' | 'SEPA_INCASSO')}
        >
          <option value="OVERBOEKING">Overboeking</option>
          <option value="SEPA_INCASSO">Doorlopende SEPA-incasso</option>
        </select>
        <span style={{ fontSize: 'var(--velaro-text-xs)', color: 'var(--velaro-color-muted)', marginTop: 6, display: 'block' }}>
          Bij overboeking toont de factuur een overboekingsinstructie; bij SEPA-incasso wordt het bedrag automatisch geïncasseerd.
        </span>
      </div>

      {paymentMethod === 'SEPA_INCASSO' && (
        <>
          <div className="form-group">
            <label className="form-label">
              Tenaamstelling rekeninghouder <span style={{ color: 'var(--velaro-color-amber)' }}>*</span>
            </label>
            <input
              name="sepaAccountHolder"
              type="text"
              className="input"
              defaultValue={profile?.sepaAccountHolder ?? ''}
              placeholder="J. de Vries"
            />
          </div>

          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label className="form-label">
                IBAN <span style={{ color: 'var(--velaro-color-amber)' }}>*</span>
              </label>
              <input
                name="sepaIban"
                type="text"
                className="input"
                defaultValue={profile?.sepaIban ?? ''}
                placeholder="NL91 ABNA 0417 1643 00"
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">
                Mandaatdatum <span style={{ color: 'var(--velaro-color-amber)' }}>*</span>
              </label>
              <input
                name="sepaMandateDate"
                type="date"
                className="input"
                defaultValue={naarDatumInputWaarde(profile?.sepaMandateDate ?? null)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              Mandaatkenmerk <span style={{ color: 'var(--velaro-color-amber)' }}>*</span>
            </label>
            <input
              name="sepaMandateReference"
              type="text"
              className="input"
              defaultValue={profile?.sepaMandateReference ?? ''}
              placeholder="Uniek kenmerk van de machtiging, bv. MND-2026-001"
            />
            <span style={{ fontSize: 'var(--velaro-text-xs)', color: 'var(--velaro-color-muted)', marginTop: 6, display: 'block' }}>
              Tenaamstelling, IBAN, mandaatkenmerk en mandaatdatum zijn verplicht bij SEPA-incasso.
            </span>
          </div>
        </>
      )}

      <div style={{ marginTop: 'var(--velaro-space-6)' }}>
        <SubmitButton label="Wijzigingen opslaan" loadingLabel="Opslaan…" />
      </div>
    </form>
  )
}
