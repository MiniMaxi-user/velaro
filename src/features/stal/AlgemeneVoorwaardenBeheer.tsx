'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
import InfoTooltip from '@/components/InfoTooltip'
import {
  uploadAlgemeneVoorwaarden,
  deleteAlgemeneVoorwaarden,
} from './algemeneVoorwaardenActions'

// ── Algemene voorwaarden beheren (#143) ──────────────────────────────────────
// Preview-link + uploaden/vervangen/verwijderen van de algemene-voorwaarden-PDF op
// stalniveau. De AV zijn de juridische voorwaarden bij de overeenkomst en worden per
// contract aan/uit gezet. De autorisatie (OWNER) en validatie lopen server-side in de
// acties; deze component verzorgt enkel de interactie. De "i"-tooltip maakt duidelijk
// dat dit géén stalreglement is (praktische huisregels) maar juridische voorwaarden.

const AV_UITLEG =
  'Algemene voorwaarden = de juridische voorwaarden die bij de overeenkomst horen ' +
  '(bijv. aansprakelijkheid & risico, verzekering, privacy/AVG, betalings- en ' +
  'opzegvoorwaarden, gedrags-/welzijnsbepalingen). Eénmalig per stal als PDF geüpload, ' +
  'per contract aan/uit te zetten en meegevoegd in het ene contractdocument.'

export default function AlgemeneVoorwaardenBeheer({
  algemeneVoorwaardenUrl,
}: {
  algemeneVoorwaardenUrl: string | null
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  function handleUpload(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await uploadAlgemeneVoorwaarden(formData)
      if (result?.error) {
        setError(result.error)
        return
      }
      formRef.current?.reset()
      router.refresh()
    })
  }

  function handleDelete() {
    if (
      !confirm(
        'De algemene voorwaarden verwijderen? Nieuwe contracten voegen ze daarna niet meer mee.',
      )
    ) {
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await deleteAlgemeneVoorwaarden()
      if (result?.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="form-section">
      <div
        className="form-section-title"
        style={{ display: 'flex', alignItems: 'center', gap: 8 }}
      >
        Algemene voorwaarden
        <InfoTooltip label="Algemene voorwaarden" text={AV_UITLEG} />
      </div>
      <p className="form-hint" style={{ marginBottom: 'var(--velaro-space-3)' }}>
        De juridische voorwaarden bij je overeenkomsten als PDF. Per contract aan/uit te
        zetten en — wanneer aan — meegevoegd in het ene ondertekenbare contractdocument.
        Toegestaan: PDF, maximaal 15 MB. Dit is iets anders dan het stalreglement (de
        praktische huisregels), dat je per contract als bijlage koppelt.
      </p>

      <div style={{ marginBottom: 'var(--velaro-space-4)' }}>
        {algemeneVoorwaardenUrl ? (
          <a
            href={algemeneVoorwaardenUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="form-link"
          >
            Huidige algemene voorwaarden bekijken (PDF)
          </a>
        ) : (
          <p className="form-hint">
            Nog geen algemene voorwaarden ingesteld — contracten voegen ze niet mee.
          </p>
        )}
      </div>

      <form ref={formRef} action={handleUpload}>
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="algemeneVoorwaarden" className="form-label">
              {algemeneVoorwaardenUrl
                ? 'Algemene voorwaarden vervangen'
                : 'Algemene voorwaarden uploaden'}
            </label>
            <input
              id="algemeneVoorwaarden"
              name="algemeneVoorwaarden"
              type="file"
              className="input"
              accept="application/pdf"
              required
            />
          </div>
          <div className="form-group" style={{ alignSelf: 'end' }}>
            <button type="submit" className="btn-primary" disabled={pending}>
              {pending ? 'Bezig…' : algemeneVoorwaardenUrl ? 'Vervangen' : 'Uploaden'}
            </button>
          </div>
        </div>
      </form>

      {algemeneVoorwaardenUrl && (
        <div style={{ marginTop: 'var(--velaro-space-3)' }}>
          <button
            type="button"
            className="btn-ghost"
            onClick={handleDelete}
            disabled={pending}
          >
            Algemene voorwaarden verwijderen
          </button>
        </div>
      )}

      {error && (
        <span
          className="form-error"
          style={{ display: 'block', marginTop: 'var(--velaro-space-2)' }}
        >
          {error}
        </span>
      )}
    </div>
  )
}
