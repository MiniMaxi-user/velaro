'use client'

import { useState } from 'react'
import type { LeaseType } from '@prisma/client'
import { LEASE_TYPE_LABELS } from '../lease/leaseHelpers'
import {
  berekenKosten,
  KOSTENPOSTEN,
  LEASE_BTW_TARIEF,
  type Betaler,
} from '../lease/leaseKostenConfig'
import { magActiverenVerzekering } from '../lease/leaseVerzekeringConfig'
import ContractStepper, { Toggle, type StapDef } from './ContractStepper'
import {
  kentDagenPerWeek,
  kentKoopoptie,
  type LeaseContractStepperConfig,
} from './leaseContract'

type OwnerOption = { userId: string; label: string }

function euro(n: number): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n)
}

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

  // ── Kosten-blok ([Unify 05] #131): client-state voor het afgeleide maandoverzicht.
  // De berekening hergebruikt berekenKosten (bron van waarheid); we spiegelen de
  // ingevulde waarden in state zodat het overzicht live meeloopt.
  const [postBetaler, setPostBetaler] = useState<Record<string, Betaler>>(() =>
    Object.fromEntries(KOSTENPOSTEN.map((p) => [p.key, lease.kosten.posten[p.key].betaler])),
  )
  const [postBedrag, setPostBedrag] = useState<Record<string, number | null>>(() =>
    Object.fromEntries(KOSTENPOSTEN.map((p) => [p.key, lease.kosten.posten[p.key].bedrag])),
  )
  const [vergoeding, setVergoeding] = useState<number | null>(lease.kosten.vergoeding)
  const [btw, setBtw] = useState<boolean>(lease.kosten.btw)

  // ── Verzekering-blok ([Unify 05] #131): client-state voor de gate-indicatie.
  const [meeverzekerd, setMeeverzekerd] = useState<'JA' | 'NEE' | null>(
    lease.verzekering.meeverzekerd,
  )
  const [risicoBevestigd, setRisicoBevestigd] = useState<boolean>(
    lease.verzekering.risicoBevestigd,
  )

  const berekening = berekenKosten({
    vergoeding,
    btw,
    posten: Object.fromEntries(
      KOSTENPOSTEN.map((p) => [
        p.key,
        { betaler: postBetaler[p.key], bedrag: postBedrag[p.key], onvoorzien: false },
      ]),
    ),
  })

  const magActiveren = magActiverenVerzekering({
    meeverzekerd,
    risicoAcceptatie: lease.verzekering.risicoAcceptatie,
    dekkingOngevallen: lease.verzekering.dekkingOngevallen,
    risicoBevestigd,
    polissen: [],
  })

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
      id: 'stap-kosten',
      naam: 'Kosten & leasevergoeding',
      sub: 'Kostenverdeling per post + de leasevergoeding',
      // Verplicht: de maandelijkse leasevergoeding (excl. btw). De kostenverdeling
      // per post is optioneel (lege posten mogen).
      verplicht: [{ naam: 'leaseVergoeding' }],
      render: () => (
        <>
          <div className="form-subblock-title">Kostenverdeling</div>
          <table className="gezondheid-tabel">
            <thead>
              <tr>
                <th>Post</th>
                <th>Wie betaalt</th>
                <th>Bedrag p/m</th>
                <th>Onvoorzien</th>
              </tr>
            </thead>
            <tbody>
              {KOSTENPOSTEN.map((def) => (
                <tr key={def.key}>
                  <td>{def.label}</td>
                  <td>
                    <select
                      name={`betaler_${def.key}`}
                      className="input"
                      value={postBetaler[def.key]}
                      onChange={(e) =>
                        setPostBetaler((s) => ({ ...s, [def.key]: e.target.value as Betaler }))
                      }
                    >
                      <option value="EIGENAAR">Eigenaar</option>
                      <option value="LEASER">Leaser</option>
                    </select>
                  </td>
                  <td>
                    <input
                      name={`bedrag_${def.key}`}
                      type="number"
                      min="0"
                      step="0.01"
                      className="input"
                      style={{ maxWidth: 120 }}
                      value={postBedrag[def.key] ?? ''}
                      onChange={(e) => {
                        const v = e.target.value.trim()
                        setPostBedrag((s) => ({
                          ...s,
                          [def.key]: v ? Number(v.replace(',', '.')) : null,
                        }))
                      }}
                    />
                  </td>
                  <td>
                    <Toggle
                      name={`onvoorzien_${def.key}`}
                      label=""
                      defaultChecked={lease.kosten.posten[def.key].onvoorzien}
                      bare
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="form-grid" style={{ marginTop: 'var(--velaro-space-4)' }}>
            <div className="form-group">
              <label htmlFor="leaseVergoeding" className="form-label">
                Leasevergoeding p/m (excl. btw) {ster}
              </label>
              <input
                id="leaseVergoeding"
                name="leaseVergoeding"
                type="number"
                min="0"
                step="0.01"
                className="input"
                placeholder="bijv. 250"
                value={vergoeding ?? ''}
                onChange={(e) => {
                  const v = e.target.value.trim()
                  setVergoeding(v ? Number(v.replace(',', '.')) : null)
                }}
              />
            </div>

            <div className="form-group" style={{ alignSelf: 'end' }}>
              <Toggle
                name="leaseBtw"
                label="Btw 21% (lease is belast tegen het hoge tarief)"
                defaultChecked={lease.kosten.btw}
                onChange={(checked) => setBtw(checked)}
              />
            </div>
          </div>

          {/* Afgeleid maandoverzicht (read-only) — berekenKosten als bron van waarheid. */}
          <div className="form-subblock-title" style={{ marginTop: 'var(--velaro-space-6)' }}>
            Maandoverzicht
          </div>
          <div className="form-grid">
            <div className="detail-field">
              <div className="detail-field-label">Subtotaal vergoeding</div>
              <div className="detail-field-value">{euro(berekening.subtotaal)}</div>
            </div>
            <div className="detail-field">
              <div className="detail-field-label">
                Btw {btw ? `${Math.round(LEASE_BTW_TARIEF * 100)}%` : '—'}
              </div>
              <div className="detail-field-value">{euro(berekening.btwBedrag)}</div>
            </div>
            <div className="detail-field">
              <div className="detail-field-label">Leaser betaalt p/m</div>
              <div className="detail-field-value">
                <strong>{euro(berekening.leaserMaand)}</strong>
              </div>
            </div>
            <div className="detail-field">
              <div className="detail-field-label">Eigenaar draagt p/m</div>
              <div className="detail-field-value">{euro(berekening.eigenaarMaand)}</div>
            </div>
          </div>
          <p className="form-hint" style={{ marginTop: 'var(--velaro-space-2)' }}>
            Administratie/overzicht — echte incasso volgt met de facturatie-stap.
          </p>
        </>
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
      id: 'stap-verzekering',
      naam: 'Verzekering & aansprakelijkheid',
      sub: 'Meeverzekerd-vraag + 6:179 BW-checklist',
      // Verplicht: de meeverzekerd-vraag moet beantwoord zijn. De activatie-gate
      // (meeverzekerd JA of risico bevestigd) wordt pas bij aanbieden/activeren hard
      // afgedwongen (#132); hier leveren we de velden + de gate-indicatie.
      verplicht: [{ naam: 'meeverzekerd' }],
      render: () => (
        <>
          <p className="form-hint" style={{ marginBottom: 'var(--velaro-space-3)' }}>
            De bezitter van een dier is aansprakelijk (art. 6:179 BW). Bij (deel)lease sluit dat
            de leaser niet automatisch uit — leg de meeverzekering en risicoverdeling daarom vast.
          </p>

          <div className="form-group">
            <div className="form-label">
              Is de leaser meeverzekerd op de WA/AVP-polis van de eigenaar? {ster}
            </div>
            <div style={{ display: 'flex', gap: 'var(--velaro-space-4)', marginTop: 6 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="meeverzekerd"
                  value="JA"
                  checked={meeverzekerd === 'JA'}
                  onChange={() => setMeeverzekerd('JA')}
                />{' '}
                Ja
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="meeverzekerd"
                  value="NEE"
                  checked={meeverzekerd === 'NEE'}
                  onChange={() => setMeeverzekerd('NEE')}
                />{' '}
                Nee
              </label>
            </div>
          </div>

          <div
            className="form-group"
            style={{ display: 'flex', flexDirection: 'column', gap: 'var(--velaro-space-2)' }}
          >
            <div className="form-label">6:179 BW-checklist</div>
            <Toggle
              name="risicoAcceptatie"
              label="Partijen accepteren de risicoverdeling rond aansprakelijkheid (6:179 BW)."
              defaultChecked={lease.verzekering.risicoAcceptatie}
              bare
            />
            <Toggle
              name="dekkingOngevallen"
              label="Er is dekking voor ongevallen van de ruiter."
              defaultChecked={lease.verzekering.dekkingOngevallen}
              bare
            />
            <Toggle
              name="risicoBevestigd"
              label="Ik begrijp het risico (vereist wanneer de leaser niet meeverzekerd is)."
              defaultChecked={lease.verzekering.risicoBevestigd}
              onChange={(checked) => setRisicoBevestigd(checked)}
              bare
            />
          </div>

          <div className="form-group">
            <span className={`badge ${magActiveren ? 'badge-success' : 'badge-warning'}`}>
              {magActiveren ? 'Gereed voor activatie' : 'Aandacht nodig'}
            </span>
            <span className="form-hint" style={{ marginLeft: 'var(--velaro-space-3)' }}>
              {magActiveren
                ? 'De lease kan straks actief worden (meeverzekerd of risico bevestigd).'
                : 'De lease kan niet actief worden tot de meeverzekerd-vraag "Ja" is óf het risico expliciet is bevestigd.'}
            </span>
          </div>

          <p className="form-hint" style={{ marginTop: 'var(--velaro-space-2)' }}>
            Koppel een kopie van de verzekeringspolis als bijlage (categorie &ldquo;Kopie
            verzekeringspolis&rdquo;) onder dit formulier.
          </p>
        </>
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
