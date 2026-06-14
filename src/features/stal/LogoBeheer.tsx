'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
import { uploadStableLogo, deleteStableLogo } from './logoActions'
import {
  LOGO_MAX_BYTES,
  LOGO_MIN_DIMENSION,
  LOGO_MAX_DIMENSION,
} from './logoValidatie'

// ── Stallogo beheren (#98) ───────────────────────────────────────────────────
// Preview + uploaden/vervangen/verwijderen van het stallogo. De autorisatie (OWNER)
// en de harde validatie (type/grootte/afmetingen) lopen server-side in de acties.
// Hier doen we een vriendelijke client-side voorcontrole op afmetingen vóór upload,
// zodat de gebruiker direct feedback krijgt; de server blijft de harde grens.

export default function LogoBeheer({ logoUrl }: { logoUrl: string | null }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  // Leest de pixel-afmetingen van een afbeelding in de browser (best-effort, niet
  // voor SVG). Geeft null wanneer dat niet lukt — de server valideert dan alsnog.
  function leesAfmetingenClient(file: File): Promise<{ w: number; h: number } | null> {
    if (file.type === 'image/svg+xml') return Promise.resolve(null)
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file)
      const img = new Image()
      img.onload = () => {
        URL.revokeObjectURL(url)
        resolve({ w: img.naturalWidth, h: img.naturalHeight })
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
        resolve(null)
      }
      img.src = url
    })
  }

  function handleUpload(formData: FormData) {
    setError(null)
    const file = formData.get('logo')
    startTransition(async () => {
      // Client-side voorcontrole op afmetingen (vriendelijke, vroege feedback).
      if (file instanceof File && file.size > 0) {
        const afm = await leesAfmetingenClient(file)
        if (afm) {
          if (afm.w < LOGO_MIN_DIMENSION || afm.h < LOGO_MIN_DIMENSION) {
            setError(
              `De afbeelding is te klein (${afm.w}x${afm.h} px). Minimaal ${LOGO_MIN_DIMENSION}x${LOGO_MIN_DIMENSION} px.`,
            )
            return
          }
          if (afm.w > LOGO_MAX_DIMENSION || afm.h > LOGO_MAX_DIMENSION) {
            setError(
              `De afbeelding is te groot in afmetingen (${afm.w}x${afm.h} px). Maximaal ${LOGO_MAX_DIMENSION}x${LOGO_MAX_DIMENSION} px.`,
            )
            return
          }
        }
      }

      const result = await uploadStableLogo(formData)
      if (result?.error) {
        setError(result.error)
        return
      }
      formRef.current?.reset()
      router.refresh()
    })
  }

  function handleDelete() {
    if (!confirm('Het stallogo verwijderen? De contract-PDF gebruikt daarna weer het standaard Velaro-logo.')) {
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await deleteStableLogo()
      if (result?.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  const maxMb = Math.round(LOGO_MAX_BYTES / (1024 * 1024))

  return (
    <div className="form-section">
      <div className="form-section-title">Stallogo</div>
      <p className="form-hint" style={{ marginBottom: 'var(--velaro-space-3)' }}>
        Dit logo verschijnt op de contract-PDF die je naar paardeneigenaren stuurt.
        Toegestaan: PNG, JPG/JPEG of SVG, maximaal {maxMb} MB, tussen{' '}
        {LOGO_MIN_DIMENSION}x{LOGO_MIN_DIMENSION} en {LOGO_MAX_DIMENSION}x
        {LOGO_MAX_DIMENSION} px. Gebruik bij voorkeur een PNG met transparante
        achtergrond.
      </p>

      <div style={{ marginBottom: 'var(--velaro-space-4)' }}>
        {logoUrl ? (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: 'var(--velaro-space-3)',
              background: 'var(--velaro-color-surface-2)',
              borderRadius: 'var(--velaro-radius-md, 8px)',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl}
              alt="Huidig stallogo"
              style={{ maxHeight: 96, maxWidth: 240, objectFit: 'contain' }}
            />
          </div>
        ) : (
          <p className="form-hint">
            Nog geen logo ingesteld — de contract-PDF gebruikt het standaard
            Velaro-logo.
          </p>
        )}
      </div>

      <form ref={formRef} action={handleUpload}>
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="logo" className="form-label">
              {logoUrl ? 'Logo vervangen' : 'Logo uploaden'}
            </label>
            <input
              id="logo"
              name="logo"
              type="file"
              className="input"
              accept="image/png,image/jpeg,image/svg+xml"
              required
            />
          </div>
          <div className="form-group" style={{ alignSelf: 'end' }}>
            <button type="submit" className="btn-primary" disabled={pending}>
              {pending ? 'Bezig…' : logoUrl ? 'Vervangen' : 'Uploaden'}
            </button>
          </div>
        </div>
      </form>

      {logoUrl && (
        <div style={{ marginTop: 'var(--velaro-space-3)' }}>
          <button
            type="button"
            className="btn-ghost"
            onClick={handleDelete}
            disabled={pending}
          >
            Logo verwijderen
          </button>
        </div>
      )}

      {error && (
        <span className="form-error" style={{ display: 'block', marginTop: 'var(--velaro-space-2)' }}>
          {error}
        </span>
      )}
    </div>
  )
}
