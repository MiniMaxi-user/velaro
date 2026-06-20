'use client'

import { useState } from 'react'
import type { LeaseType } from '@prisma/client'
import { LEASE_TYPE_LABELS } from '../lease/leaseHelpers'
import ContractStepper, { Toggle, type StapDef } from './ContractStepper'
import {
  kentDagenPerWeek,
  kentKoopoptie,
  type LeaseContractStepperConfig,
} from './leaseContract'

type OwnerOption = { userId: string; label: string }

// ── Lease-consument van de generieke stepper-schil ([Unify 04] #130) ──────────
// Analoog aan ContractStepperForm (stalling): deze client-component houdt de
// lease-specifieke client-state vast, bouwt de data-gedreven stappen-config
// (metadata + render van de velden) en voedt die aan `ContractStepper`. De schil
// (`ContractStepper`) kent geen lease-velden of -teksten — die zitten hier.
//
// De gekozen leasevorm (read-only afgeleid van Contract.type) bepaalt welke
// velden/blokken relevant zijn: dagen/week alleen bij deellease, een prominent
// koopoptie-blok bij KOOPOPTIE-lease. Alleen geldige verplichte velden tellen mee
// voor de voortgang (via de `voorwaarde`-conditie op de schil).
export default function LeaseContractStepperForm({
  horseId,
  contractId,
  leaseType,
  action,
  owners,
  defaultCounterpartyUserId,
  defaultStartDate,
  lease,
  submitLabel = 'Wijzigingen opslaan',
}: {
  horseId: string
  contractId: string
  leaseType: LeaseType
  action: (formData: FormData) => Promise<void>
  owners: OwnerOption[]
  defaultCounterpartyUserId?: string
  defaultStartDate?: string
  lease: LeaseContractStepperConfig
  submitLabel?: string
}) {
  const deellease = kentDagenPerWeek(leaseType)
  const koopoptieVorm = kentKoopoptie(leaseType)

  // Client-state voor conditioneel verplichte velden / zichtbaarheid.
  const [proefActief, setProefActief] = useState<boolean>(lease.looptijd.proefperiode.actief)
  const [minderjarig, setMinderjarig] = useState<boolean>(lease.berijder.minderjarig)
  const [koopoptieActief, setKoopoptieActief] = useState<boolean>(lease.koop.koopoptie)

  const ster = <span className="required">*</span>

  const stappen: StapDef[] = [
    {
      id: 'stap-basis',
      naam: 'Basisgegevens',
      sub: 'Leasevorm, wederpartij en ingangsdatum',
      verplicht: [{ naam: 'counterpartyUserId' }],
      render: () => (
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="leaseType" className="form-label">Leasevorm</label>
            <input
              id="leaseType"
              type="text"
              className="input"
              value={LEASE_TYPE_LABELS[leaseType]}
              readOnly
              disabled
            />
          </div>

          <div className="form-group">
            <label htmlFor="counterpartyUserId" className="form-label">
              Wederpartij (eigenaar) {ster}
            </label>
            <select
              id="counterpartyUserId"
              name="counterpartyUserId"
              className="input"
              required
              defaultValue={
                defaultCounterpartyUserId ??
                (owners.length === 1 ? owners[0].userId : '')
              }
            >
              <option value="" disabled>
                Kies een eigenaar
              </option>
              {owners.map((o) => (
                <option key={o.userId} value={o.userId}>
                  {o.label}
                </option>
              ))}
            </select>
            <span className="form-hint">
              Het contract wordt met de (meerderjarige) eigenaar gesloten. Een eventuele
              berijder benoem je verderop, los van de wederpartij.
            </span>
          </div>

          <div className="form-group">
            <label htmlFor="startDate" className="form-label">Ingangsdatum</label>
            <input
              id="startDate"
              name="startDate"
              type="date"
              className="input"
              defaultValue={defaultStartDate}
            />
          </div>
        </div>
      ),
    },
    {
      id: 'stap-gebruik',
      naam: 'Gebruiksrecht & disciplines',
      sub: 'Wat mag de leaser en in welke disciplines',
      verplicht: [
        { naam: 'gebruiksrecht' },
        { naam: 'dagenPerWeek', voorwaarde: () => deellease },
      ],
      render: () => (
        <div className="form-grid">
          <div className="form-group form-grid--full">
            <label htmlFor="gebruiksrecht" className="form-label">Gebruiksrecht {ster}</label>
            <textarea
              id="gebruiksrecht"
              name="gebruiksrecht"
              rows={2}
              className="input"
              placeholder="Wat mag de leaser (buitenrijden, wedstrijd, lessen)?"
              defaultValue={lease.gebruiksrecht ?? ''}
            />
          </div>

          <div className="form-group">
            <label htmlFor="disciplines" className="form-label">Disciplines</label>
            <input
              id="disciplines"
              name="disciplines"
              type="text"
              className="input"
              placeholder="bijv. dressuur, springen"
              defaultValue={lease.disciplines ?? ''}
            />
          </div>

          {deellease && (
            <div className="form-group">
              <label htmlFor="dagenPerWeek" className="form-label">Dagen per week {ster}</label>
              <input
                id="dagenPerWeek"
                name="dagenPerWeek"
                type="number"
                min="1"
                max="7"
                step="1"
                className="input"
                placeholder="bijv. 3"
                defaultValue={lease.dagenPerWeek ?? ''}
              />
              <span className="form-hint">Het vaste aantal dagen per week bij een deellease.</span>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'stap-vergoeding',
      naam: 'Leasevergoeding',
      sub: 'De maandelijkse leasevergoeding',
      verplicht: [{ naam: 'leasevergoeding' }],
      render: () => (
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="leasevergoeding" className="form-label">Leasevergoeding {ster}</label>
            <input
              id="leasevergoeding"
              name="leasevergoeding"
              type="text"
              className="input"
              placeholder="bijv. € 250 per maand"
              defaultValue={lease.leasevergoeding ?? ''}
            />
            <span className="form-hint">
              Kostenverdeling (hoefsmid, dierenarts, voer) komt in een volgend blok
              (Kosten) zodra dat beschikbaar is.
            </span>
          </div>
        </div>
      ),
    },
    {
      id: 'stap-looptijd',
      naam: 'Looptijd / proefperiode / opzegging',
      sub: 'Duur, proeftijd en opzegtermijn',
      verplicht: [
        { naam: 'opzegtermijnDagen' },
        { naam: 'proefEinddatum', voorwaarde: () => proefActief },
      ],
      render: () => (
        <>
          <div className="form-subblock-title">Looptijd</div>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="looptijdEinddatum" className="form-label">Einddatum</label>
              <input
                id="looptijdEinddatum"
                name="looptijdEinddatum"
                type="date"
                className="input"
                defaultValue={lease.looptijd.einddatum ?? ''}
              />
              <span className="form-hint">Laat leeg voor een lease voor onbepaalde tijd.</span>
            </div>

            <div className="form-group">
              <label htmlFor="minimumTermijnMaanden" className="form-label">Minimale looptijd (maanden)</label>
              <input
                id="minimumTermijnMaanden"
                name="minimumTermijnMaanden"
                type="number"
                min="0"
                step="1"
                className="input"
                placeholder="bijv. 6"
                defaultValue={lease.looptijd.minimumTermijnMaanden ?? ''}
              />
            </div>

            <div className="form-group">
              <label htmlFor="opzegtermijnDagen" className="form-label">Opzegtermijn (dagen) {ster}</label>
              <input
                id="opzegtermijnDagen"
                name="opzegtermijnDagen"
                type="number"
                min="0"
                step="1"
                className="input"
                placeholder="bijv. 30"
                defaultValue={lease.looptijd.opzegtermijnDagen ?? ''}
              />
            </div>
          </div>

          <div className="form-subblock-title" style={{ marginTop: 'var(--velaro-space-6)' }}>Proefperiode</div>
          <div className="form-grid">
            <Toggle
              name="proefActief"
              label="Proefperiode van toepassing"
              defaultChecked={lease.looptijd.proefperiode.actief}
              onChange={(checked) => setProefActief(checked)}
            />

            <div className="form-group">
              <label htmlFor="proefEinddatum" className="form-label">
                Einde proefperiode {proefActief && ster}
              </label>
              <input
                id="proefEinddatum"
                name="proefEinddatum"
                type="date"
                className="input"
                defaultValue={lease.looptijd.proefperiode.einddatum ?? ''}
              />
              <span className="form-hint">Verplicht wanneer er een proefperiode geldt.</span>
            </div>
          </div>
        </>
      ),
    },
    {
      id: 'stap-berijder',
      naam: 'Berijder',
      sub: 'Berijder + minderjarigheid (voogd)',
      // Verplicht: bij een minderjarige berijder moet de voogd benoemd zijn (die
      // ondertekent in #132). Een meerderjarige/lege berijder kent geen verplichting.
      verplicht: [{ naam: 'voogdNaam', voorwaarde: () => minderjarig }],
      render: () => (
        <>
          <p className="form-hint" style={{ marginBottom: 'var(--velaro-space-3)' }}>
            Het contract wordt met de (meerderjarige) eigenaar gesloten. Een minderjarige
            wordt alleen als berijder benoemd en ondertekent niet — de ouder/voogd tekent
            namens de minderjarige.
          </p>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="berijderNaam" className="form-label">Naam berijder</label>
              <input
                id="berijderNaam"
                name="berijderNaam"
                type="text"
                className="input"
                placeholder="bijv. Sanne de Vries"
                defaultValue={lease.berijder.naam ?? ''}
              />
              <span className="form-hint">Laat leeg als er geen aparte berijder benoemd wordt.</span>
            </div>

            <div className="form-group">
              <label htmlFor="berijderGeboortedatum" className="form-label">Geboortedatum</label>
              <input
                id="berijderGeboortedatum"
                name="berijderGeboortedatum"
                type="date"
                className="input"
                defaultValue={lease.berijder.geboortedatum ?? ''}
              />
            </div>

            <Toggle
              name="berijderMinderjarig"
              label="Berijder is minderjarig"
              defaultChecked={lease.berijder.minderjarig}
              onChange={(checked) => setMinderjarig(checked)}
            />

            <div className="form-group">
              <label htmlFor="voogdNaam" className="form-label">
                Naam ouder/voogd {minderjarig && ster}
              </label>
              <input
                id="voogdNaam"
                name="voogdNaam"
                type="text"
                className="input"
                placeholder="bijv. Karin de Vries"
                defaultValue={lease.berijder.voogdNaam ?? ''}
              />
              <span className="form-hint">Verplicht bij een minderjarige berijder; de voogd ondertekent.</span>
            </div>
          </div>
        </>
      ),
    },
    {
      id: 'stap-koop',
      naam: koopoptieVorm ? 'Koopoptie' : 'Eerste recht van koop',
      sub: koopoptieVorm
        ? 'Voorwaarden om het paard later te kopen'
        : 'Optioneel — voorrang bij verkoop',
      // Bij een KOOPOPTIE-lease is het koopoptie-blok prominent: wordt de koopoptie
      // aangezet, dan is een koopprijs verplicht. Bij andere vormen is dit blok optioneel.
      verplicht: [
        { naam: 'koopprijs', voorwaarde: () => koopoptieVorm && koopoptieActief },
      ],
      render: () =>
        koopoptieVorm ? (
          <div className="form-grid">
            <Toggle
              name="koopoptie"
              label="Koopoptie van toepassing"
              hint="De leaser krijgt de mogelijkheid het paard tijdens of na de lease te kopen."
              defaultChecked={lease.koop.koopoptie}
              onChange={(checked) => setKoopoptieActief(checked)}
            />

            <div className="form-group">
              <label htmlFor="koopprijs" className="form-label">
                Koopprijs {koopoptieActief && ster}
              </label>
              <input
                id="koopprijs"
                name="koopprijs"
                type="text"
                className="input"
                placeholder="bijv. € 12.500"
                defaultValue={lease.koop.koopprijs ?? ''}
              />
              <span className="form-hint">Verplicht wanneer de koopoptie van toepassing is.</span>
            </div>

            <Toggle
              name="eersteRechtVanKoop"
              label="Eerste recht van koop"
              hint="De leaser krijgt voorrang wanneer het paard verkocht wordt."
              defaultChecked={lease.koop.eersteRechtVanKoop}
            />
          </div>
        ) : (
          <div className="form-grid">
            <p className="form-hint" style={{ marginBottom: 'var(--velaro-space-3)' }}>
              Optioneel. Bij een eerste recht van koop krijgt de leaser voorrang wanneer
              het paard verkocht wordt.
            </p>
            <Toggle
              name="eersteRechtVanKoop"
              label="Eerste recht van koop"
              defaultChecked={lease.koop.eersteRechtVanKoop}
            />
          </div>
        ),
    },
    {
      id: 'stap-bijzonderheden',
      naam: 'Bijzonderheden',
      sub: 'Optioneel — aanvullende afspraken',
      verplicht: [],
      render: () => (
        <div className="form-grid">
          <div className="form-group form-grid--full">
            <label htmlFor="bijzonderheden" className="form-label">Bijzonderheden</label>
            <textarea
              id="bijzonderheden"
              name="bijzonderheden"
              rows={3}
              className="input"
              placeholder="Aanvullende afspraken die op de overeenkomst moeten staan."
              defaultValue={lease.bijzonderheden ?? ''}
            />
          </div>
        </div>
      ),
    },
  ]

  return (
    <ContractStepper
      horseId={horseId}
      contractId={contractId}
      action={action}
      stappen={stappen}
      submitLabel={submitLabel}
    />
  )
}
