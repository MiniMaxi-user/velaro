'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
import {
  BIJLAGE_CATEGORIE_OPTIES,
  BIJLAGE_CATEGORIE_LABELS,
  bijlageCategorieLabel,
} from './bijlagenDiensten'
import {
  getBijlageUrlVoorStaf,
  uploadContractBijlage,
  verwijderContractBijlage,
} from './actions'

// ── Bijlagen koppelen/beheren bij een concept-contract (STAL-16) ─────────────
// Door de stal aangeleverde bijlagen (stalreglement, voerschema, prijslijst, kopie
// verzekeringspolis) worden los van het bewerkformulier geüpload, omdat het bestanden
// betreft (multipart) i.p.v. config-data. De autorisatie (OWNER/STAFF) en de
// CONCEPT-only-poort worden server-side in de acties afgedwongen; deze component
// verzorgt enkel de interactie. Wordt alleen gerenderd op het bewerkscherm (CONCEPT).

type Bijlage = {
  id: string
  categorie: string
  bestandsnaam: string
}

export default function BijlagenBeheer({
  horseId,
  contractId,
  bijlagen,
}: {
  horseId: string
  contractId: string
  bijlagen: Bijlage[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  function handleUpload(formData: FormData) {
    setError(null)
    startTransition(async () => {
      try {
        await uploadContractBijlage(horseId, contractId, formData)
        formRef.current?.reset()
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Bijlage koppelen is mislukt.')
      }
    })
  }

  function handleVerwijder(bijlageId: string) {
    if (!confirm('Deze bijlage verwijderen?')) return
    setError(null)
    startTransition(async () => {
      try {
        await verwijderContractBijlage(horseId, contractId, bijlageId)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Verwijderen is mislukt.')
      }
    })
  }

  function handleOpen(bijlageId: string) {
    setError(null)
    startTransition(async () => {
      try {
        const url = await getBijlageUrlVoorStaf(horseId, contractId, bijlageId)
        if (url) window.open(url, '_blank')
        else setError('De bijlage kon niet geopend worden.')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Bijlage openen is mislukt.')
      }
    })
  }

  return (
    <div className="form-section" style={{ marginTop: 'var(--velaro-space-6)' }}>
      <div className="form-section-title">Gekoppelde bijlagen</div>
      <p className="form-hint" style={{ marginBottom: 'var(--velaro-space-3)' }}>
        Koppel documenten aan dit concept-contract (PDF of afbeelding, max. 10 MB). Per
        categorie kun je meerdere of geen bijlagen koppelen.
      </p>

      {bijlagen.length === 0 ? (
        <p className="form-hint" style={{ marginBottom: 'var(--velaro-space-3)' }}>
          Nog geen bijlagen gekoppeld.
        </p>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--velaro-space-2)',
            marginBottom: 'var(--velaro-space-4)',
          }}
        >
          {bijlagen.map((b) => (
            <div
              key={b.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 'var(--velaro-space-3)',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <span className="label" style={{ marginRight: 8 }}>
                  {bijlageCategorieLabel(b.categorie)}
                </span>
                <button
                  type="button"
                  className="form-link"
                  onClick={() => handleOpen(b.id)}
                  disabled={pending}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                  }}
                >
                  {b.bestandsnaam}
                </button>
              </div>
              <button
                type="button"
                className="btn-ghost btn-ghost--sm"
                onClick={() => handleVerwijder(b.id)}
                disabled={pending}
              >
                Verwijderen
              </button>
            </div>
          ))}
        </div>
      )}

      <form ref={formRef} action={handleUpload}>
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="bijlageCategorie" className="form-label">
              Categorie
            </label>
            <select
              id="bijlageCategorie"
              name="categorie"
              className="input"
              defaultValue={BIJLAGE_CATEGORIE_OPTIES[0]}
            >
              {BIJLAGE_CATEGORIE_OPTIES.map((opt) => (
                <option key={opt} value={opt}>
                  {BIJLAGE_CATEGORIE_LABELS[opt]}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="bijlageBestand" className="form-label">
              Bestand
            </label>
            <input
              id="bijlageBestand"
              name="bestand"
              type="file"
              className="input"
              accept="application/pdf,image/png,image/jpeg"
              required
            />
          </div>

          <div className="form-group" style={{ alignSelf: 'end' }}>
            <button type="submit" className="btn-primary" disabled={pending}>
              {pending ? 'Bezig…' : 'Bijlage koppelen'}
            </button>
          </div>
        </div>
      </form>

      {error && <span className="form-error">{error}</span>}
    </div>
  )
}
