'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import type { ReactNode, RefObject } from 'react'
import Link from 'next/link'
import SubmitButton from '@/components/SubmitButton'
import { offerContract, previewContractPdf } from './actions'

// ── Generieke stepper-schil ──────────────────────────────────────────────────
// Deze component bevat geen familie-specifieke (stalling/lease) velden of teksten.
// Een familie levert een data-gedreven `stappen`-config: per blok metadata
// (id/naam/sub/verplichte velden + voorwaarden) plus de render van de velden.
// De schil rendert de blokken, berekent de voortgang en toont de navigatie +
// aanbieden/preview-knoppen. Zo kan elke contractfamilie door dezelfde UX heen.

// Status per stap, gebruikt voor badge + indicator-kleur.
export type StapStatus = 'leeg' | 'bezig' | 'compleet'

// Eén verplicht veld in de stepper. `naam` wijst (binnen de stap) het form-control
// aan dat ingevuld moet zijn. `voorwaarde` maakt een veld alleen verplicht onder
// een conditie (bijv. einddatum alleen bij bepaalde tijd).
export type VerplichtVeldDef = {
  // Naam van het form-veld (input/select) binnen deze stap.
  naam: string
  // Optioneel: deze eis geldt alleen wanneer de conditie waar is.
  voorwaarde?: () => boolean
}

// Hulpmiddelen die de schil aan een familie-specifieke compleetheids-override geeft.
export type CompleetheidContext = {
  formRef: RefObject<HTMLFormElement | null>
  veldIngevuld: (naam: string) => boolean
}

// Definitie + render van een stap. De familie-config levert deze array; de schil
// gebruikt `verplicht` voor de voortgang/navigatie en `render` voor de inhoud.
export type StapDef = {
  id: string
  naam: string
  sub: string
  verplicht: VerplichtVeldDef[]
  // De velden van dit blok (familie-specifiek).
  render: () => ReactNode
  // Optionele familie-specifieke compleetheids-override. Geeft `null` terug om de
  // standaard (op basis van `verplicht`) te gebruiken. Bijv. de stalling-bijlagen-
  // stap die compleetheid baseert op een DB-feit i.p.v. op form-velden.
  compleetheid?: (ctx: CompleetheidContext) => { pct: number; status: StapStatus } | null
}

export default function ContractStepper({
  horseId,
  contractId,
  action,
  stappen,
  submitLabel = 'Wijzigingen opslaan',
}: {
  horseId: string
  contractId: string
  action: (formData: FormData) => Promise<void>
  // Data-gedreven stappen-set, geleverd door de familie-config.
  stappen: StapDef[]
  submitLabel?: string
}) {
  const formRef = useRef<HTMLFormElement>(null)

  // Leest of een form-control binnen de stepper "ingevuld" is.
  const veldIngevuld = useCallback((naam: string): boolean => {
    const form = formRef.current
    if (!form) return false
    const elementen = form.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
      `[name="${naam}"]`,
    )
    if (elementen.length === 0) return false
    let ingevuld = false
    elementen.forEach((el) => {
      if (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio')) {
        if (el.checked) ingevuld = true
      } else if (el.value && el.value.trim() !== '') {
        ingevuld = true
      }
    })
    return ingevuld
  }, [])

  // ── Voortgangsberekening (client-side UI-state) ──────────────────────────────
  // Per stap: een percentage (ingevulde verplichte velden / totaal verplichte velden)
  // en een status. Blokken zonder verplichte velden gelden direct als compleet.
  const [voortgang, setVoortgang] = useState<
    { pct: number; status: StapStatus }[]
  >(() => stappen.map(() => ({ pct: 0, status: 'leeg' as StapStatus })))

  const herbereken = useCallback(() => {
    setVoortgang(
      stappen.map((stap) => {
        // Familie-specifieke compleetheids-override (bijv. stalreglement-blok).
        const override = stap.compleetheid?.({ formRef, veldIngevuld })
        if (override) return override

        const actief = stap.verplicht.filter(
          (v) => !v.voorwaarde || v.voorwaarde(),
        )
        if (actief.length === 0) {
          return { pct: 100, status: 'compleet' as StapStatus }
        }
        const ingevuld = actief.filter((v) => veldIngevuld(v.naam)).length
        const pct = Math.round((ingevuld / actief.length) * 100)
        const status: StapStatus =
          pct === 100 ? 'compleet' : pct > 0 ? 'bezig' : 'leeg'
        return { pct, status }
      }),
    )
  }, [stappen, veldIngevuld])

  // Herbereken bij wijziging van form-velden en bij mount/config-wijziging.
  useEffect(() => {
    herbereken()
  }, [herbereken])

  // ── Overall voortgang: telt uitsluitend volledig (100%) ingevulde blokken. ────
  const completeBlokken = voortgang.filter((v) => v.status === 'compleet').length
  const totaalBlokken = stappen.length
  const allesCompleet = completeBlokken === totaalBlokken && totaalBlokken > 0
  const overallPct =
    totaalBlokken === 0 ? 0 : Math.round((completeBlokken / totaalBlokken) * 100)

  // ── Aanbieden / Preview-PDF (bestaande server-acties) ────────────────────────
  const [pending, startTransition] = useTransition()
  const [actieFout, setActieFout] = useState<string | null>(null)

  function openBase64Pdf(base64: string) {
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }))
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  function handlePreview() {
    setActieFout(null)
    startTransition(async () => {
      try {
        const base64 = await previewContractPdf(horseId, contractId)
        openBase64Pdf(base64)
      } catch (e) {
        setActieFout(e instanceof Error ? e.message : 'Preview genereren is mislukt.')
      }
    })
  }

  function handleOffer() {
    if (
      !confirm(
        'Het contract aanbieden aan de paardeigenaar? De eigenaar ontvangt hiervan een melding.',
      )
    ) {
      return
    }
    setActieFout(null)
    startTransition(async () => {
      try {
        await offerContract(horseId, contractId)
        window.location.href = `/paarden/${horseId}?tab=contracten`
      } catch (e) {
        setActieFout(e instanceof Error ? e.message : 'Aanbieden is mislukt.')
      }
    })
  }

  return (
    <>
      {/* ── Blauwe overall progress bar: telling van complete blokken ── */}
      <div className="contract-progress">
        <div className="contract-progress-top">
          <div>
            <div className="contract-progress-eyebrow">Voortgang contract</div>
            <div className="contract-progress-title">
              {allesCompleet
                ? 'Alle blokken compleet — klaar om aan te bieden'
                : 'Vul de verplichte velden van elk blok in'}
            </div>
          </div>
          <div className="contract-progress-pct">
            {overallPct}
            <span>%</span>
          </div>
        </div>
        <div className="contract-progress-bar">
          <div
            className="contract-progress-fill"
            style={{ width: `${overallPct}%` }}
          />
        </div>
        <div className="contract-progress-meta">
          <strong>{completeBlokken}</strong> van <strong>{totaalBlokken}</strong>{' '}
          blokken compleet
        </div>
      </div>

      <div className="stepper-layout">
        {/* ── LINKS: de in te vullen blokken ── */}
        <form
          ref={formRef}
          action={action}
          className="stepper-content"
          onInput={herbereken}
          onChange={herbereken}
        >
          {stappen.map((stap, i) => (
            <StapPanel
              key={stap.id}
              stap={stap}
              nummer={i + 1}
              status={voortgang[i]?.status}
            >
              {stap.render()}
            </StapPanel>
          ))}

          <div className="action-buttons">
            <SubmitButton label={submitLabel} />
            <Link href={`/paarden/${horseId}?tab=contracten`} className="btn-ghost">Annuleren</Link>
          </div>
        </form>

        {/* ── RECHTS: sticky stepper-navigatie ── */}
        <aside className="stepper-nav">
          <div className="stepper-nav-card">
            <div className="stepper-nav-title">
              Stappen <span>{completeBlokken} / {totaalBlokken}</span>
            </div>

            <div className="stepper-list">
              {stappen.map((stap, i) => {
                const v = voortgang[i] ?? { pct: 0, status: 'leeg' as StapStatus }
                return (
                  <button
                    type="button"
                    key={stap.id}
                    className={`step-item${v.status === 'compleet' ? ' is-complete' : ''}`}
                    onClick={() =>
                      document
                        .getElementById(stap.id)
                        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }
                  >
                    <div className="step-indicator">
                      {v.status === 'compleet' ? '✓' : i + 1}
                    </div>
                    <div className="step-item-body">
                      <div className="step-item-title">
                        <span className="step-item-name">{stap.naam}</span>
                        <span className="step-item-pct">{v.pct}%</span>
                      </div>
                      <div className="step-item-sub">{stap.sub}</div>
                      <div className="step-progress">
                        <div className="step-progress-fill" style={{ width: `${v.pct}%` }} />
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="stepper-nav-foot">
              <button
                type="button"
                className="btn-primary btn-primary--full"
                onClick={handleOffer}
                disabled={pending || !allesCompleet}
                title={
                  allesCompleet
                    ? undefined
                    : 'Vul eerst de verplichte velden van alle blokken in voordat je kunt aanbieden.'
                }
              >
                {pending ? 'Bezig…' : 'Aanbieden'}
              </button>
              <button
                type="button"
                className="btn-ghost btn-primary--full"
                onClick={handlePreview}
                disabled={pending || !allesCompleet}
                title={
                  allesCompleet
                    ? undefined
                    : 'Beschikbaar zodra alle blokken volledig zijn ingevuld.'
                }
              >
                Preview PDF
              </button>
              {actieFout && <span className="form-error">{actieFout}</span>}
            </div>
          </div>
        </aside>
      </div>
    </>
  )
}

// ── Stap-paneel: een blok links met nummer-indicator + status-badge. ───────────
function StapPanel({
  stap,
  nummer,
  status = 'leeg',
  children,
}: {
  stap: StapDef
  nummer: number
  status?: StapStatus
  children: ReactNode
}) {
  const badgeClass =
    status === 'compleet'
      ? 'badge badge-success'
      : status === 'bezig'
        ? 'badge badge-warning'
        : 'badge badge-neutral'
  const badgeTekst =
    status === 'compleet' ? 'Compleet' : status === 'bezig' ? 'Bezig' : 'Nog te doen'

  return (
    <section
      id={stap.id}
      className={`panel step-section${status === 'compleet' ? ' is-complete' : ''}`}
    >
      <div className="panel-header step-section-head">
        <div className="step-section-headwrap">
          <span className="step-section-num">
            {status === 'compleet' ? '✓' : nummer}
          </span>
          <div>
            <div className="step-section-heading">{stap.naam}</div>
            <div className="step-section-sub">{stap.sub}</div>
          </div>
        </div>
        <span className={badgeClass}>{badgeTekst}</span>
      </div>
      <div className="panel-body">{children}</div>
    </section>
  )
}

// ── Toggle/switch: gedeelde presentatiecomponent voor alle contractfamilies.
// Behoudt dezelfde form-veldnaam en -waarde zodat de server-actie ongewijzigd
// blijft werken. ───────────────────────────────────────────────────────────────
export function Toggle({
  name,
  label,
  value = 'true',
  defaultChecked,
  verplicht = false,
  hint,
  bare = false,
  onChange,
}: {
  name: string
  label: string
  value?: string
  defaultChecked?: boolean
  verplicht?: boolean
  hint?: string
  // `bare` plaatst de toggle zonder form-group-wrapper (voor lijsten).
  bare?: boolean
  onChange?: (checked: boolean) => void
}) {
  const control = (
    <label className="toggle-switch">
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        onChange={(e) => onChange?.(e.target.checked)}
      />
      <span className="toggle-track" aria-hidden="true" />
      <span className="toggle-label">
        {label} {verplicht && <span className="required">*</span>}
      </span>
    </label>
  )

  if (bare) return control

  return (
    <div className="form-group">
      {control}
      {hint && <span className="form-hint">{hint}</span>}
    </div>
  )
}
