'use client'

import { useCallback, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Cropper from 'react-easy-crop'
import { uploadPaardFoto, deletePaardFoto } from './paardFotoActions'
import { snijdAfbeeldingVierkant, type PixelArea } from './cropImage'
import { PAARDFOTO_MAX_BYTES, PAARDFOTO_TOEGESTANE_TYPES } from './paardFotoValidatie'

// ── Paardfoto beheren (#118) ─────────────────────────────────────────────────
// Preview + uploaden/vervangen/verwijderen van de profielfoto van een paard, met
// een bijsnijd-stap (ronde/vierkante uitsnede). Het ronde masker is enkel weergave;
// opgeslagen wordt een vierkant. De autorisatie (OWNER/STAFF) en de harde validatie
// lopen server-side; hier verzorgen we de interactie en het bijsnijden vóór upload.
// Analoog aan LogoBeheer.tsx (#98), uitgebreid met de cropper.

const MAX_MB = Math.round(PAARDFOTO_MAX_BYTES / (1024 * 1024))

export default function PaardFotoBeheer({
  horseId,
  fotoUrl,
}: {
  horseId: string
  fotoUrl: string | null
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Bijsnijd-staat: de gekozen afbeelding (object-URL) + cropper-positie/zoom.
  const [bron, setBron] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [gebied, setGebied] = useState<PixelArea | null>(null)

  const onCropComplete = useCallback((_: unknown, pixels: PixelArea) => {
    setGebied(pixels)
  }, [])

  function kiesBestand(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null)
    const file = e.target.files?.[0]
    if (!file) return

    if (!PAARDFOTO_TOEGESTANE_TYPES[file.type]) {
      setError('Alleen PNG- of JPG/JPEG-bestanden zijn toegestaan.')
      e.target.value = ''
      return
    }
    if (file.size > PAARDFOTO_MAX_BYTES) {
      setError(`Het bestand is te groot (maximaal ${MAX_MB} MB).`)
      e.target.value = ''
      return
    }

    // Open de bijsnijder met de gekozen afbeelding.
    setBron(URL.createObjectURL(file))
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setGebied(null)
  }

  function sluitBijsnijder() {
    if (bron) URL.revokeObjectURL(bron)
    setBron(null)
    setGebied(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function bevestigBijsnijden() {
    if (!bron || !gebied) return
    setError(null)
    startTransition(async () => {
      try {
        const blob = await snijdAfbeeldingVierkant(bron, gebied)
        const formData = new FormData()
        formData.append('foto', blob, 'paardfoto.png')
        const result = await uploadPaardFoto(horseId, formData)
        if (result?.error) {
          setError(result.error)
          return
        }
        sluitBijsnijder()
        router.refresh()
      } catch (e) {
        setError((e as Error).message || 'Bijsnijden mislukt.')
      }
    })
  }

  function handleDelete() {
    if (!confirm('De foto van dit paard verwijderen? Lijsten en het profiel tonen daarna weer het standaard paard-icoon.')) {
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await deletePaardFoto(horseId)
      if (result?.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="form-section">
      <div className="form-section-title">Foto</div>
      <p className="form-hint" style={{ marginBottom: 'var(--velaro-space-3)' }}>
        Een herkenbare profielfoto verschijnt in de paardenlijst, op het profiel en
        op de contract-PDF. Tip: breng alleen het hoofd van het paard in beeld voor
        een nette ronde avatar. Toegestaan: PNG of JPG/JPEG, maximaal {MAX_MB} MB.
      </p>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--velaro-space-4)',
          marginBottom: 'var(--velaro-space-4)',
        }}
      >
        {fotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={fotoUrl}
            alt="Huidige paardfoto"
            className="paard-foto-avatar paard-foto-avatar--lg"
          />
        ) : (
          <div
            className="paard-foto-avatar paard-foto-avatar--lg paard-foto-avatar--placeholder"
            aria-hidden
          >
            🐴
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--velaro-space-2)' }}>
          <label htmlFor="paard-foto-input" className="btn-secondary" style={{ cursor: 'pointer' }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9.5 2.5l2 2L4 12H2v-2L9.5 2.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
            </svg>
            {fotoUrl ? 'Foto vervangen' : 'Foto toevoegen'}
          </label>
          <input
            id="paard-foto-input"
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg"
            onChange={kiesBestand}
            style={{ display: 'none' }}
          />
          {fotoUrl && (
            <button
              type="button"
              className="btn-ghost"
              onClick={handleDelete}
              disabled={pending}
            >
              Foto verwijderen
            </button>
          )}
        </div>
      </div>

      {error && (
        <span className="form-error" style={{ display: 'block', marginTop: 'var(--velaro-space-2)' }}>
          {error}
        </span>
      )}

      {bron && (
        <div className="paard-foto-crop-overlay" role="dialog" aria-modal>
          <div className="paard-foto-crop-dialog">
            <div className="form-section-title" style={{ marginBottom: 'var(--velaro-space-2)' }}>
              Foto bijsnijden
            </div>
            <p className="form-hint" style={{ marginBottom: 'var(--velaro-space-3)' }}>
              Versleep en zoom om het hoofd van het paard binnen de cirkel te plaatsen.
            </p>

            <div className="paard-foto-crop-area">
              <Cropper
                image={bron}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>

            <div style={{ marginTop: 'var(--velaro-space-3)' }}>
              <label htmlFor="paard-foto-zoom" className="form-label">Zoom</label>
              <input
                id="paard-foto-zoom"
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            {error && (
              <span className="form-error" style={{ display: 'block', marginTop: 'var(--velaro-space-2)' }}>
                {error}
              </span>
            )}

            <div className="action-buttons" style={{ marginTop: 'var(--velaro-space-4)' }}>
              <button
                type="button"
                className="btn-primary"
                onClick={bevestigBijsnijden}
                disabled={pending || !gebied}
              >
                {pending ? 'Bezig…' : 'Opslaan'}
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={sluitBijsnijder}
                disabled={pending}
              >
                Annuleren
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
