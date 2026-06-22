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
  setAlgemeneVoorwaardenMeegevoegd,
  uploadContractBijlage,
  verwijderContractBijlage,
} from './actions'
import InfoTooltip from '@/components/InfoTooltip'

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
  heeftAlgemeneVoorwaarden,
  algemeneVoorwaardenMeegevoegd,
}: {
  horseId: string
  contractId: string
  bijlagen: Bijlage[]
  // Of de stal een algemene-voorwaarden-PDF heeft geüpload (stalniveau). Zonder
  // AV-PDF is er niets mee te voegen en tonen we enkel een hint richting stalbeheer.
  heeftAlgemeneVoorwaarden: boolean
  // Of de AV-PDF voor dit contract is aangevinkt (= meegevoegd in het samengevoegde
  // document). Default aan wanneer de stal een AV-PDF heeft (#143).
  algemeneVoorwaardenMeegevoegd: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [avMeegevoegd, setAvMeegevoegd] = useState(algemeneVoorwaardenMeegevoegd)
  const formRef = useRef<HTMLFormElement>(null)

  function handleAvToggle(meegevoegd: boolean) {
    setAvMeegevoegd(meegevoegd)
    setError(null)
    startTransition(async () => {
      try {
        await setAlgemeneVoorwaardenMeegevoegd(horseId, contractId, meegevoegd)
        router.refresh()
      } catch (e) {
        // Bij een fout de toggle terugzetten naar de vorige stand.
        setAvMeegevoegd(!meegevoegd)
        setError(
          e instanceof Error ? e.message : 'Algemene voorwaarden aan/uit zetten is mislukt.',
        )
      }
    })
  }

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
      <div className="form-section-title">
        Algemene voorwaarden
        <InfoTooltip
          label="Algemene voorwaarden"
          text="Algemene voorwaarden = de juridische voorwaarden die bij de overeenkomst horen (bijv. aansprakelijkheid & risico, verzekering, privacy/AVG, betalings- en opzegvoorwaarden). Eénmalig per stal als PDF geüpload en per contract aan/uit te zetten; aangevinkt = meegevoegd in het ene contractdocument."
        />
      </div>
      {heeftAlgemeneVoorwaarden ? (
        <label
          className="profiel-checkbox-label"
          style={{ marginBottom: 'var(--velaro-space-2)' }}
        >
          <input
            className="profiel-checkbox"
            type="checkbox"
            checked={avMeegevoegd}
            onChange={(e) => handleAvToggle(e.target.checked)}
            disabled={pending}
          />
          <span>
            De algemene voorwaarden van de stal meevoegen in het samengevoegde
            contractdocument.
          </span>
        </label>
      ) : (
        <p className="form-hint" style={{ marginBottom: 'var(--velaro-space-4)' }}>
          Er is nog geen algemene-voorwaarden-PDF voor deze stal geüpload. Upload die
          eerst in het stalbeheer om hem per contract te kunnen meevoegen.
        </p>
      )}

      <div
        className="form-section-title"
        style={{ marginTop: 'var(--velaro-space-5)' }}
      >
        Gekoppelde bijlagen
        <InfoTooltip
          label="Stalreglement"
          text="Stalreglement = de praktische huisregels van de stal (bijv. openingstijden, gebruik van faciliteiten, veiligheid, parkeren, gedrag op het erf). Een document dat als pagina's wordt meegezonden met het contract (geen contractuele clausules)."
        />
      </div>
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
