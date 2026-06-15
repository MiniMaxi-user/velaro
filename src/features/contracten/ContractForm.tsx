'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import SubmitButton from '@/components/SubmitButton'
import { BOXTYPE_OPTIES, BOXTYPE_LABELS, type HuisvestingConfig } from './huisvesting'
import {
  FACILITEIT_OPTIES,
  FACILITEIT_LABELS,
  WEIDEGANG_VORM_OPTIES,
  WEIDEGANG_VORM_LABELS,
  type DienstpakketConfig,
} from './dienstpakket'
import {
  BTW_MODUS_OPTIES,
  BTW_MODUS_LABELS,
  LOOPTIJD_AARD_OPTIES,
  LOOPTIJD_AARD_LABELS,
  OPZEGTERMIJN_EENHEID_OPTIES,
  OPZEGTERMIJN_EENHEID_LABELS,
  VERLENGING_OPTIES,
  VERLENGING_LABELS,
  INDEXERING_MOMENT_OPTIES,
  INDEXERING_MOMENT_LABELS,
  isOpzegtermijnKorterDanMaand,
  type PrijsLooptijdConfig,
  type LooptijdAard,
  type OpzegtermijnEenheid,
} from './prijsLooptijd'
import type { VerzekeringAansprakelijkheidConfig } from './verzekeringAansprakelijkheid'
import {
  VACCINATIE_SOORT_OPTIES,
  VACCINATIE_SOORT_LABELS,
  type GezondheidsplichtConfig,
} from './gezondheidsplicht'
import type { BerijderConfig } from './berijder'
import {
  FREQUENTIE_OPTIES,
  FREQUENTIE_LABELS,
  type BijlagenConfig,
  type ExtraDienstenConfig,
  type Frequentie,
} from './bijlagenDiensten'
import { contractTypeLabel, CONTRACT_FAMILY_LABELS } from './contractHelpers'
import type { ContractVoorselectie } from './relatietypeMatching'

type OwnerOption = { userId: string; label: string }

// Voorvulwaarden uit het FeedingPlan van het paard (STAL-04). Wanneer er geen
// voederschema is, is dit object null en wordt de overnemen-knop uitgeschakeld.
type VoerVoorvulling = {
  ruwvoer: string | null
  krachtvoer: string | null
}

export default function ContractForm({
  horseId,
  action,
  owners,
  defaultCounterpartyUserId,
  defaultStartDate,
  huisvesting,
  dienstpakket,
  voederschema,
  prijsLooptijd,
  verzekeringAansprakelijkheid,
  gezondheidsplicht,
  berijder,
  bijlagenConfig,
  extraDiensten,
  typeVoorselectie,
  relatietypeIndicatie,
  submitLabel = 'Concept aanmaken',
}: {
  horseId: string
  action: (formData: FormData) => Promise<void>
  owners: OwnerOption[]
  defaultCounterpartyUserId?: string
  defaultStartDate?: string
  // Overschrijfbare voorselectie van het contracttype op basis van het relatietype
  // van het paard (#105). Standaard STALLING/FULL_PENSION bij een pensionpaard.
  typeVoorselectie?: ContractVoorselectie
  // Informatieve indicatie wanneer het relatietype geen (bouwbare) voorselectie
  // oplevert (#105), bijv. lease/lespaard/opdracht. Puur informatief.
  relatietypeIndicatie?: string
  // Wanneer meegegeven, toont het formulier de sectie "Huisvesting & verzorging".
  // Op het bewerkscherm vullen we boxNumber voor uit het paardprofiel (overschrijfbaar).
  huisvesting?: HuisvestingConfig
  // Wanneer meegegeven, toont het formulier de blokken voer/weidegang/faciliteiten.
  dienstpakket?: DienstpakketConfig
  // Voorvulwaarden uit het FeedingPlan; null wanneer het paard geen voederschema heeft.
  voederschema?: VoerVoorvulling | null
  // Wanneer meegegeven, toont het formulier de sectie "Prijs & looptijd".
  prijsLooptijd?: PrijsLooptijdConfig
  // Wanneer meegegeven, toont het formulier de sectie "Verzekering & aansprakelijkheid".
  verzekeringAansprakelijkheid?: VerzekeringAansprakelijkheidConfig
  // Wanneer meegegeven, toont het formulier de sectie "Entings- & gezondheidsplicht".
  gezondheidsplicht?: GezondheidsplichtConfig
  // Wanneer meegegeven, toont het formulier de sectie "Berijder" (optioneel blok).
  berijder?: BerijderConfig
  // Wanneer meegegeven, toont het formulier de sectie "Bijlagen & extra diensten"
  // (STAL-16): de instelling "stalreglement verplicht" en de prijslijst.
  bijlagenConfig?: BijlagenConfig
  extraDiensten?: ExtraDienstenConfig
  submitLabel?: string
}) {
  const ruwvoerRef = useRef<HTMLInputElement>(null)
  const krachtvoerRef = useRef<HTMLInputElement>(null)

  // Client-state voor de prijs/looptijd-sectie: aard stuurt de zichtbaarheid van de
  // einddatum; de opzegtermijn-velden tonen een waarschuwing als de termijn korter
  // dan 1 kalendermaand is. Harde validatie gebeurt altijd server-side.
  const [looptijdAard, setLooptijdAard] = useState<LooptijdAard>(
    prijsLooptijd?.looptijd.aard ?? 'ONBEPAALD',
  )
  const [opzegWaarde, setOpzegWaarde] = useState<number>(
    prijsLooptijd?.looptijd.opzegtermijn.waarde ?? 1,
  )
  const [opzegEenheid, setOpzegEenheid] = useState<OpzegtermijnEenheid>(
    prijsLooptijd?.looptijd.opzegtermijn.eenheid ?? 'MAANDEN',
  )
  const opzegtermijnKort = isOpzegtermijnKorterDanMaand({
    waarde: opzegWaarde,
    eenheid: opzegEenheid,
    schriftelijk: true,
  })

  // Client-state voor de prijslijst (extra diensten, STAL-16): een dynamische lijst
  // van posten die toegevoegd/verwijderd kan worden. De velden worden als parallelle
  // form-velden (extraDienstOmschrijving[]/Bedrag[]/Frequentie[]) ingestuurd; harde
  // validatie gebeurt server-side. Elke rij krijgt een client-side key om rerenders
  // stabiel te houden.
  type PrijslijstRij = {
    key: string
    omschrijving: string
    bedrag: string
    frequentie: Frequentie
  }
  const [prijslijst, setPrijslijst] = useState<PrijslijstRij[]>(
    (extraDiensten?.posten ?? []).map((p, i) => ({
      key: `bestaand-${i}`,
      omschrijving: p.omschrijving,
      bedrag: String(p.bedrag),
      frequentie: p.frequentie,
    })),
  )
  const voegPostToe = () =>
    setPrijslijst((rijen) => [
      ...rijen,
      {
        key: `nieuw-${Date.now()}-${rijen.length}`,
        omschrijving: '',
        bedrag: '',
        frequentie: 'PER_MAAND',
      },
    ])
  const verwijderPost = (key: string) =>
    setPrijslijst((rijen) => rijen.filter((r) => r.key !== key))
  const wijzigPost = (key: string, veld: keyof PrijslijstRij, waarde: string) =>
    setPrijslijst((rijen) =>
      rijen.map((r) => (r.key === key ? { ...r, [veld]: waarde } : r)),
    )

  // Vult de voervelden vanuit het voederschema (roughage -> ruwvoer, concentrate ->
  // krachtvoer). De velden blijven daarna bewerkbaar. Zonder voederschema is de knop
  // uitgeschakeld, dus deze handler wordt dan niet aangeroepen.
  const overnemenUitVoederschema = () => {
    if (!voederschema) return
    if (ruwvoerRef.current) ruwvoerRef.current.value = voederschema.ruwvoer ?? ''
    if (krachtvoerRef.current) krachtvoerRef.current.value = voederschema.krachtvoer ?? ''
  }

  return (
    <form action={action} className="form-card">
      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="type" className="form-label">Type contract</label>
          <input
            id="type"
            type="text"
            className="input"
            value={
              typeVoorselectie
                ? `${CONTRACT_FAMILY_LABELS[typeVoorselectie.family]} — ${contractTypeLabel(typeVoorselectie.type)}`
                : 'Stalling — Full pension'
            }
            readOnly
            disabled
          />
          {typeVoorselectie && (
            <span className="form-hint">
              Voorgeselecteerd op basis van het relatietype van het paard. Je kunt dit
              wijzigen.
            </span>
          )}
          {relatietypeIndicatie && (
            <span className="form-hint">{relatietypeIndicatie}</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="counterpartyUserId" className="form-label">Wederpartij (eigenaar) *</label>
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

      {huisvesting && (
        <div className="form-section" style={{ marginTop: 'var(--velaro-space-6)' }}>
          <div className="form-section-title">Huisvesting &amp; verzorging</div>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="boxtype" className="form-label">Boxtype</label>
              <select
                id="boxtype"
                name="boxtype"
                className="input"
                defaultValue={huisvesting.boxtype ?? ''}
              >
                <option value="">Niet opgegeven</option>
                {BOXTYPE_OPTIES.map((opt) => (
                  <option key={opt} value={opt}>
                    {BOXTYPE_LABELS[opt]}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="boxNumber" className="form-label">Stalplek / boxnummer</label>
              <input
                id="boxNumber"
                name="boxNumber"
                type="text"
                className="input"
                defaultValue={huisvesting.boxNumber ?? ''}
              />
            </div>

            <div className="form-group">
              <label htmlFor="beddingtype" className="form-label">Beddingtype</label>
              <input
                id="beddingtype"
                name="beddingtype"
                type="text"
                className="input"
                placeholder="bijv. stro, vlas, zaagsel"
                defaultValue={huisvesting.beddingtype ?? ''}
              />
            </div>

            <div className="form-group">
              <label htmlFor="toezicht" className="form-label">Toezicht / verzorging</label>
              <input
                id="toezicht"
                name="toezicht"
                type="text"
                className="input"
                placeholder="bijv. dagelijkse controle"
                defaultValue={huisvesting.toezicht ?? ''}
              />
            </div>

            <div className="form-group">
              <label className="profiel-checkbox-label">
                <input
                  className="profiel-checkbox"
                  type="checkbox"
                  name="uitmesten"
                  value="true"
                  defaultChecked={huisvesting.uitmesten}
                />
                <span>Uitmesten door de stal</span>
              </label>
            </div>

            <div className="form-group">
              <label className="profiel-checkbox-label">
                <input
                  className="profiel-checkbox"
                  type="checkbox"
                  name="opstrooien"
                  value="true"
                  defaultChecked={huisvesting.opstrooien}
                />
                <span>Opstrooien door de stal</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {dienstpakket && (
        <>
          <div className="form-section" style={{ marginTop: 'var(--velaro-space-6)' }}>
            <div className="form-section-title">Voer &amp; verzorging</div>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="voerRuwvoer" className="form-label">Ruwvoer</label>
                <input
                  id="voerRuwvoer"
                  name="voerRuwvoer"
                  type="text"
                  className="input"
                  ref={ruwvoerRef}
                  placeholder="bijv. 3x daags hooi"
                  defaultValue={dienstpakket.voer.ruwvoer ?? ''}
                />
              </div>

              <div className="form-group">
                <label htmlFor="voerKrachtvoer" className="form-label">Krachtvoer</label>
                <input
                  id="voerKrachtvoer"
                  name="voerKrachtvoer"
                  type="text"
                  className="input"
                  ref={krachtvoerRef}
                  placeholder="bijv. 2 scheppen muesli ochtend en avond"
                  defaultValue={dienstpakket.voer.krachtvoer ?? ''}
                />
              </div>
            </div>
            <div style={{ marginTop: 'var(--velaro-space-3)' }}>
              <button
                type="button"
                className="btn-ghost"
                onClick={overnemenUitVoederschema}
                disabled={!voederschema}
                title={
                  voederschema
                    ? undefined
                    : 'Dit paard heeft nog geen voederschema om over te nemen.'
                }
              >
                Overnemen uit voederschema
              </button>
              {!voederschema && (
                <span
                  className="form-hint"
                  style={{ marginLeft: 'var(--velaro-space-3)' }}
                >
                  Geen voederschema beschikbaar voor dit paard.
                </span>
              )}
            </div>
          </div>

          <div className="form-section" style={{ marginTop: 'var(--velaro-space-6)' }}>
            <div className="form-section-title">Weidegang</div>
            <div className="form-grid">
              <div className="form-group">
                <label className="profiel-checkbox-label">
                  <input
                    className="profiel-checkbox"
                    type="checkbox"
                    name="weidegangActief"
                    value="true"
                    defaultChecked={dienstpakket.weidegang.actief}
                  />
                  <span>Weidegang inbegrepen</span>
                </label>
              </div>

              <div className="form-group">
                <label htmlFor="weidegangVorm" className="form-label">Vorm</label>
                <select
                  id="weidegangVorm"
                  name="weidegangVorm"
                  className="input"
                  defaultValue={dienstpakket.weidegang.vorm ?? ''}
                >
                  <option value="">Niet opgegeven</option>
                  {WEIDEGANG_VORM_OPTIES.map((opt) => (
                    <option key={opt} value={opt}>
                      {WEIDEGANG_VORM_LABELS[opt]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="weidegangUren" className="form-label">Uren per dag</label>
                <input
                  id="weidegangUren"
                  name="weidegangUren"
                  type="text"
                  className="input"
                  placeholder="bijv. 6 uur"
                  defaultValue={dienstpakket.weidegang.urenPerDag ?? ''}
                />
              </div>

              <div className="form-group">
                <label htmlFor="weidegangSeizoen" className="form-label">Seizoen</label>
                <input
                  id="weidegangSeizoen"
                  name="weidegangSeizoen"
                  type="text"
                  className="input"
                  placeholder="bijv. april t/m oktober"
                  defaultValue={dienstpakket.weidegang.seizoen ?? ''}
                />
              </div>
            </div>
          </div>

          <div className="form-section" style={{ marginTop: 'var(--velaro-space-6)' }}>
            <div className="form-section-title">Faciliteiten</div>
            <div className="form-grid">
              {FACILITEIT_OPTIES.map((opt) => (
                <div className="form-group" key={opt}>
                  <label className="profiel-checkbox-label">
                    <input
                      className="profiel-checkbox"
                      type="checkbox"
                      name="faciliteiten"
                      value={opt}
                      defaultChecked={dienstpakket.faciliteiten.geselecteerd.includes(opt)}
                    />
                    <span>{FACILITEIT_LABELS[opt]}</span>
                  </label>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {prijsLooptijd && (
        <>
          <div className="form-section" style={{ marginTop: 'var(--velaro-space-6)' }}>
            <div className="form-section-title">Prijs &amp; borg</div>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="prijsBedrag" className="form-label">Pensionprijs (€ per maand)</label>
                <input
                  id="prijsBedrag"
                  name="prijsBedrag"
                  type="number"
                  min="0"
                  step="0.01"
                  className="input"
                  placeholder="bijv. 450"
                  defaultValue={prijsLooptijd.prijs.bedrag ?? ''}
                />
              </div>

              <div className="form-group">
                <label htmlFor="prijsBtwModus" className="form-label">Btw</label>
                <select
                  id="prijsBtwModus"
                  name="prijsBtwModus"
                  className="input"
                  defaultValue={prijsLooptijd.prijs.btwModus}
                >
                  {BTW_MODUS_OPTIES.map((opt) => (
                    <option key={opt} value={opt}>
                      {BTW_MODUS_LABELS[opt]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="prijsBtwPercentage" className="form-label">Btw-percentage (%)</label>
                <input
                  id="prijsBtwPercentage"
                  name="prijsBtwPercentage"
                  type="number"
                  min="0"
                  step="0.1"
                  className="input"
                  placeholder="bijv. 21"
                  defaultValue={prijsLooptijd.prijs.btwPercentage ?? ''}
                />
              </div>

              <div className="form-group">
                <label className="profiel-checkbox-label">
                  <input
                    className="profiel-checkbox"
                    type="checkbox"
                    name="borgActief"
                    value="true"
                    defaultChecked={prijsLooptijd.borg.actief}
                  />
                  <span>Borg van toepassing</span>
                </label>
              </div>

              <div className="form-group">
                <label htmlFor="borgBedrag" className="form-label">Borgbedrag (€)</label>
                <input
                  id="borgBedrag"
                  name="borgBedrag"
                  type="number"
                  min="0"
                  step="0.01"
                  className="input"
                  placeholder="bijv. 500"
                  defaultValue={prijsLooptijd.borg.bedrag ?? ''}
                />
                <span className="form-hint">Verplicht wanneer borg van toepassing is.</span>
              </div>
            </div>
          </div>

          <div className="form-section" style={{ marginTop: 'var(--velaro-space-6)' }}>
            <div className="form-section-title">Looptijd</div>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="looptijdAard" className="form-label">Aard van de looptijd</label>
                <select
                  id="looptijdAard"
                  name="looptijdAard"
                  className="input"
                  value={looptijdAard}
                  onChange={(e) => setLooptijdAard(e.target.value as LooptijdAard)}
                >
                  {LOOPTIJD_AARD_OPTIES.map((opt) => (
                    <option key={opt} value={opt}>
                      {LOOPTIJD_AARD_LABELS[opt]}
                    </option>
                  ))}
                </select>
              </div>

              {looptijdAard === 'BEPAALD' && (
                <div className="form-group">
                  <label htmlFor="looptijdEinddatum" className="form-label">Einddatum *</label>
                  <input
                    id="looptijdEinddatum"
                    name="looptijdEinddatum"
                    type="date"
                    className="input"
                    defaultValue={prijsLooptijd.looptijd.einddatum ?? ''}
                  />
                  <span className="form-hint">Verplicht bij een contract voor bepaalde tijd.</span>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="looptijdMinimumperiode" className="form-label">Minimumperiode</label>
                <input
                  id="looptijdMinimumperiode"
                  name="looptijdMinimumperiode"
                  type="text"
                  className="input"
                  placeholder="bijv. 3 maanden"
                  defaultValue={prijsLooptijd.looptijd.minimumperiode ?? ''}
                />
              </div>

              <div className="form-group">
                <label htmlFor="opzegtermijnWaarde" className="form-label">Opzegtermijn</label>
                <div className="form-row">
                  <input
                    id="opzegtermijnWaarde"
                    name="opzegtermijnWaarde"
                    type="number"
                    min="0"
                    step="1"
                    className="input"
                    value={opzegWaarde}
                    onChange={(e) => setOpzegWaarde(Number(e.target.value))}
                  />
                  <select
                    name="opzegtermijnEenheid"
                    className="input"
                    value={opzegEenheid}
                    onChange={(e) => setOpzegEenheid(e.target.value as OpzegtermijnEenheid)}
                  >
                    {OPZEGTERMIJN_EENHEID_OPTIES.map((opt) => (
                      <option key={opt} value={opt}>
                        {OPZEGTERMIJN_EENHEID_LABELS[opt]}
                      </option>
                    ))}
                  </select>
                </div>
                {opzegtermijnKort && (
                  <span className="form-error">
                    Waarschuwing: de opzegtermijn is korter dan 1 kalendermaand.
                  </span>
                )}
              </div>

              <div className="form-group">
                <label className="profiel-checkbox-label">
                  <input
                    className="profiel-checkbox"
                    type="checkbox"
                    name="opzegtermijnSchriftelijk"
                    value="true"
                    defaultChecked={prijsLooptijd.looptijd.opzegtermijn.schriftelijk}
                  />
                  <span>Opzeggen dient schriftelijk te gebeuren</span>
                </label>
              </div>

              <div className="form-group">
                <label htmlFor="looptijdVerlenging" className="form-label">Verlenging</label>
                <select
                  id="looptijdVerlenging"
                  name="looptijdVerlenging"
                  className="input"
                  defaultValue={prijsLooptijd.looptijd.verlenging}
                >
                  {VERLENGING_OPTIES.map((opt) => (
                    <option key={opt} value={opt}>
                      {VERLENGING_LABELS[opt]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="profiel-checkbox-label">
                  <input
                    className="profiel-checkbox"
                    type="checkbox"
                    name="proefperiodeActief"
                    value="true"
                    defaultChecked={prijsLooptijd.looptijd.proefperiode.actief}
                  />
                  <span>Proefperiode</span>
                </label>
              </div>

              <div className="form-group">
                <label htmlFor="proefperiodeDuur" className="form-label">Duur proefperiode</label>
                <input
                  id="proefperiodeDuur"
                  name="proefperiodeDuur"
                  type="text"
                  className="input"
                  placeholder="bijv. 1 maand"
                  defaultValue={prijsLooptijd.looptijd.proefperiode.duur ?? ''}
                />
              </div>

              <div className="form-group">
                <label className="profiel-checkbox-label">
                  <input
                    className="profiel-checkbox"
                    type="checkbox"
                    name="indexeringActief"
                    value="true"
                    defaultChecked={prijsLooptijd.looptijd.indexering.actief}
                  />
                  <span>Indexering van toepassing</span>
                </label>
              </div>

              <div className="form-group">
                <label htmlFor="indexeringGrondslag" className="form-label">Grondslag indexering</label>
                <input
                  id="indexeringGrondslag"
                  name="indexeringGrondslag"
                  type="text"
                  className="input"
                  placeholder="bijv. CBS-prijsindex"
                  defaultValue={prijsLooptijd.looptijd.indexering.grondslag ?? ''}
                />
              </div>

              <div className="form-group">
                <label htmlFor="indexeringMoment" className="form-label">Moment indexering</label>
                <select
                  id="indexeringMoment"
                  name="indexeringMoment"
                  className="input"
                  defaultValue={prijsLooptijd.looptijd.indexering.moment ?? ''}
                >
                  <option value="">Niet opgegeven</option>
                  {INDEXERING_MOMENT_OPTIES.map((opt) => (
                    <option key={opt} value={opt}>
                      {INDEXERING_MOMENT_LABELS[opt]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </>
      )}

      {verzekeringAansprakelijkheid && (
        <>
          <div className="form-section" style={{ marginTop: 'var(--velaro-space-6)' }}>
            <div className="form-section-title">Verzekering</div>
            <div className="form-grid">
              <div className="form-group">
                <label className="profiel-checkbox-label">
                  <input
                    className="profiel-checkbox"
                    type="checkbox"
                    name="verzWaEigenaar"
                    value="true"
                    defaultChecked={verzekeringAansprakelijkheid.verzekering.waVerzekeringEigenaar}
                  />
                  <span>WA-/aansprakelijkheidsverzekering eigenaar *</span>
                </label>
                <span className="form-hint">
                  Verplicht: de eigenaar dient een aansprakelijkheidsverzekering te hebben.
                </span>
              </div>

              <div className="form-group">
                <label htmlFor="verzPolisnummer" className="form-label">Polisnummer *</label>
                <input
                  id="verzPolisnummer"
                  name="verzPolisnummer"
                  type="text"
                  className="input"
                  placeholder="bijv. 1234567"
                  defaultValue={verzekeringAansprakelijkheid.verzekering.polisnummer ?? ''}
                />
                <span className="form-hint">Verplicht voordat het contract aangeboden wordt.</span>
              </div>

              <div className="form-group">
                <label htmlFor="verzVerzekeraar" className="form-label">Verzekeraar/maatschappij *</label>
                <input
                  id="verzVerzekeraar"
                  name="verzVerzekeraar"
                  type="text"
                  className="input"
                  placeholder="bijv. Hippo Verzekeringen"
                  defaultValue={verzekeringAansprakelijkheid.verzekering.verzekeraar ?? ''}
                />
                <span className="form-hint">Verplicht voordat het contract aangeboden wordt.</span>
              </div>

              <div className="form-group">
                <label className="profiel-checkbox-label">
                  <input
                    className="profiel-checkbox"
                    type="checkbox"
                    name="verzEigenaarVerzekertZelf"
                    value="true"
                    defaultChecked={verzekeringAansprakelijkheid.verzekering.eigenaarVerzekertZelf}
                  />
                  <span>De eigenaar verzekert het paard zelf</span>
                </label>
              </div>

              <div className="form-group">
                <label className="profiel-checkbox-label">
                  <input
                    className="profiel-checkbox"
                    type="checkbox"
                    name="verzBrandPaard"
                    value="true"
                    defaultChecked={verzekeringAansprakelijkheid.verzekering.brandverzekeringPaard}
                  />
                  <span>Brandverzekering paard van toepassing</span>
                </label>
              </div>
            </div>
          </div>

          <div className="form-section" style={{ marginTop: 'var(--velaro-space-6)' }}>
            <div className="form-section-title">Aansprakelijkheid</div>
            <div className="form-grid">
              <div className="form-group">
                <label className="profiel-checkbox-label">
                  <input
                    className="profiel-checkbox"
                    type="checkbox"
                    name="aansprRisicoAcceptatie"
                    value="true"
                    defaultChecked={
                      verzekeringAansprakelijkheid.aansprakelijkheid.risicoAcceptatieEigenaar
                    }
                  />
                  <span>Risico-acceptatie eigenaar *</span>
                </label>
                <span className="form-hint">
                  Verplicht: de eigenaar accepteert het risico van stalling.
                </span>
              </div>

              <div className="form-group">
                <label className="profiel-checkbox-label">
                  <input
                    className="profiel-checkbox"
                    type="checkbox"
                    name="aansprBezitter"
                    value="true"
                    defaultChecked={
                      verzekeringAansprakelijkheid.aansprakelijkheid.bezitterAansprakelijkheid
                    }
                  />
                  <span>Bezitter-aansprakelijkheid (art. 6:179 BW)</span>
                </label>
              </div>

              <div className="form-group">
                <label className="profiel-checkbox-label">
                  <input
                    className="profiel-checkbox"
                    type="checkbox"
                    name="aansprZorgplichtStal"
                    value="true"
                    defaultChecked={
                      verzekeringAansprakelijkheid.aansprakelijkheid.zorgplichtStal
                    }
                  />
                  <span>Zorgplicht stal vastgelegd</span>
                </label>
              </div>

              <div className="form-group">
                <label className="profiel-checkbox-label">
                  <input
                    className="profiel-checkbox"
                    type="checkbox"
                    name="aansprStalBeperkt"
                    value="true"
                    defaultChecked={
                      verzekeringAansprakelijkheid.aansprakelijkheid.aansprakelijkheidStalBeperkt
                    }
                  />
                  <span>Aansprakelijkheid stal beperkt en gekoppeld aan dekking</span>
                </label>
              </div>

              <div className="form-group">
                <label htmlFor="aansprBedrijfsmatigNotitie" className="form-label">
                  Notitie bedrijfsmatig gebruik (art. 6:181 BW)
                </label>
                <input
                  id="aansprBedrijfsmatigNotitie"
                  name="aansprBedrijfsmatigNotitie"
                  type="text"
                  className="input"
                  placeholder="bij full pension zonder training: NVT"
                  defaultValue={
                    verzekeringAansprakelijkheid.aansprakelijkheid.bedrijfsmatigGebruikNotitie ?? ''
                  }
                />
              </div>
            </div>
          </div>
        </>
      )}

      {gezondheidsplicht && (
        <>
          <div className="form-section" style={{ marginTop: 'var(--velaro-space-6)' }}>
            <div className="form-section-title">Entings- &amp; gezondheidsplicht</div>
            <div className="form-grid">
              <div className="form-group">
                <label className="profiel-checkbox-label">
                  <input
                    className="profiel-checkbox"
                    type="checkbox"
                    name="vaccinatieActief"
                    value="true"
                    defaultChecked={gezondheidsplicht.vaccinatie.actief}
                  />
                  <span>Vaccinatieplicht van toepassing</span>
                </label>
              </div>

              <div className="form-group">
                <label htmlFor="vaccinatieInterval" className="form-label">
                  Vaccinatie-interval (maanden)
                </label>
                <input
                  id="vaccinatieInterval"
                  name="vaccinatieInterval"
                  type="number"
                  min="0"
                  step="1"
                  className="input"
                  placeholder="bijv. 6"
                  defaultValue={gezondheidsplicht.vaccinatie.intervalMaanden ?? ''}
                />
              </div>

              <div className="form-group">
                <span className="form-label">Verplichte vaccinaties</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--velaro-space-2)' }}>
                  {VACCINATIE_SOORT_OPTIES.map((opt) => (
                    <label className="profiel-checkbox-label" key={opt}>
                      <input
                        className="profiel-checkbox"
                        type="checkbox"
                        name="vaccinatieSoorten"
                        value={opt}
                        defaultChecked={gezondheidsplicht.vaccinatie.soorten.includes(opt)}
                      />
                      <span>{VACCINATIE_SOORT_LABELS[opt]}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="form-section" style={{ marginTop: 'var(--velaro-space-6)' }}>
            <div className="form-section-title">Ontworming &amp; mestonderzoek</div>
            <div className="form-grid">
              <div className="form-group">
                <label className="profiel-checkbox-label">
                  <input
                    className="profiel-checkbox"
                    type="checkbox"
                    name="ontwormingActief"
                    value="true"
                    defaultChecked={gezondheidsplicht.ontworming.actief}
                  />
                  <span>Ontwormings-/mestonderzoekplicht van toepassing</span>
                </label>
              </div>

              <div className="form-group">
                <label htmlFor="ontwormingInterval" className="form-label">
                  Interval (maanden)
                </label>
                <input
                  id="ontwormingInterval"
                  name="ontwormingInterval"
                  type="number"
                  min="0"
                  step="1"
                  className="input"
                  placeholder="bijv. 3"
                  defaultValue={gezondheidsplicht.ontworming.intervalMaanden ?? ''}
                />
              </div>

              <div className="form-group">
                <label htmlFor="ontwormingBeleid" className="form-label">Beleid</label>
                <input
                  id="ontwormingBeleid"
                  name="ontwormingBeleid"
                  type="text"
                  className="input"
                  placeholder="bijv. selectief ontwormen o.b.v. mestonderzoek"
                  defaultValue={gezondheidsplicht.ontworming.beleid ?? ''}
                />
              </div>
            </div>
          </div>

          <div className="form-section" style={{ marginTop: 'var(--velaro-space-6)' }}>
            <div className="form-section-title">Hoefverzorging</div>
            <div className="form-grid">
              <div className="form-group">
                <label className="profiel-checkbox-label">
                  <input
                    className="profiel-checkbox"
                    type="checkbox"
                    name="hoefsmidActief"
                    value="true"
                    defaultChecked={gezondheidsplicht.hoefsmid.actief}
                  />
                  <span>Hoefsmidplicht van toepassing</span>
                </label>
              </div>

              <div className="form-group">
                <label htmlFor="hoefsmidInterval" className="form-label">
                  Hoefsmid-interval (weken)
                </label>
                <input
                  id="hoefsmidInterval"
                  name="hoefsmidInterval"
                  type="number"
                  min="0"
                  step="1"
                  className="input"
                  placeholder="bijv. 8"
                  defaultValue={gezondheidsplicht.hoefsmid.intervalWeken ?? ''}
                />
              </div>
            </div>
          </div>

          <div className="form-section" style={{ marginTop: 'var(--velaro-space-6)' }}>
            <div className="form-section-title">Dierenarts-drempel</div>
            <div className="form-grid">
              <div className="form-group">
                <label className="profiel-checkbox-label">
                  <input
                    className="profiel-checkbox"
                    type="checkbox"
                    name="dierenartsDrempelActief"
                    value="true"
                    defaultChecked={gezondheidsplicht.dierenartsDrempel.actief}
                  />
                  <span>Drempel voor voorafgaande toestemming van toepassing</span>
                </label>
              </div>

              <div className="form-group">
                <label htmlFor="dierenartsDrempelBedrag" className="form-label">
                  Drempelbedrag (€)
                </label>
                <input
                  id="dierenartsDrempelBedrag"
                  name="dierenartsDrempelBedrag"
                  type="number"
                  min="0"
                  step="0.01"
                  className="input"
                  placeholder="bijv. 250"
                  defaultValue={gezondheidsplicht.dierenartsDrempel.bedrag ?? ''}
                />
                <span className="form-hint">
                  Boven dit bedrag is voorafgaande toestemming van de eigenaar vereist.
                </span>
              </div>

              <div className="form-group">
                <label className="profiel-checkbox-label">
                  <input
                    className="profiel-checkbox"
                    type="checkbox"
                    name="dierenartsMeldingsplicht"
                    value="true"
                    defaultChecked={gezondheidsplicht.dierenartsDrempel.meldingsplichtEigenaar}
                  />
                  <span>Meldingsplicht aan de eigenaar</span>
                </label>
              </div>
            </div>
          </div>
        </>
      )}

      {berijder && (
        <div className="form-section" style={{ marginTop: 'var(--velaro-space-6)' }}>
          <div className="form-section-title">Berijder</div>
          <p className="form-hint" style={{ marginBottom: 'var(--velaro-space-3)' }}>
            Optioneel. De berijder wordt alleen informatief op de overeenkomst benoemd
            en ondertekent niet. Een (eventueel minderjarige) berijder blokkeert het
            aanbieden van het contract niet.
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
                defaultValue={berijder.naam ?? ''}
              />
              <span className="form-hint">Laat leeg als er geen berijder benoemd wordt.</span>
            </div>

            <div className="form-group">
              <label htmlFor="berijderGeboortedatum" className="form-label">Geboortedatum</label>
              <input
                id="berijderGeboortedatum"
                name="berijderGeboortedatum"
                type="date"
                className="input"
                defaultValue={berijder.geboortedatum ?? ''}
              />
              <span className="form-hint">
                Optioneel; gebruikt om een minderjarig-indicatie te tonen.
              </span>
            </div>

            <div className="form-group">
              <label htmlFor="berijderRelatie" className="form-label">Relatie tot eigenaar</label>
              <input
                id="berijderRelatie"
                name="berijderRelatie"
                type="text"
                className="input"
                placeholder="bijv. dochter, pupil"
                defaultValue={berijder.relatieTotEigenaar ?? ''}
              />
            </div>
          </div>
        </div>
      )}

      {(bijlagenConfig || extraDiensten) && (
        <div className="form-section" style={{ marginTop: 'var(--velaro-space-6)' }}>
          <div className="form-section-title">Bijlagen &amp; extra diensten</div>

          {bijlagenConfig && (
            <div className="form-group">
              <label className="profiel-checkbox-label">
                <input
                  className="profiel-checkbox"
                  type="checkbox"
                  name="stalreglementVerplicht"
                  value="true"
                  defaultChecked={bijlagenConfig.stalreglementVerplicht}
                />
                <span>Stalreglement verplicht</span>
              </label>
              <span className="form-hint">
                Staat dit aan, dan kan het contract pas worden aangeboden wanneer er een
                stalreglement-bijlage is gekoppeld. Bijlagen koppel je hieronder, los van
                dit formulier.
              </span>
            </div>
          )}

          {extraDiensten && (
            <div style={{ marginTop: 'var(--velaro-space-4)' }}>
              <div className="form-label">Extra diensten / prijslijst</div>
              <p className="form-hint" style={{ marginBottom: 'var(--velaro-space-3)' }}>
                Posten die los van de pensionprijs gefactureerd kunnen worden. Vul per
                post een omschrijving, een bedrag en een frequentie in.
              </p>

              {prijslijst.length === 0 && (
                <p
                  className="form-hint"
                  style={{ marginBottom: 'var(--velaro-space-3)' }}
                >
                  Nog geen posten toegevoegd.
                </p>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--velaro-space-3)' }}>
                {prijslijst.map((rij) => (
                  <div className="form-grid" key={rij.key}>
                    <div className="form-group">
                      <label className="form-label">Omschrijving</label>
                      <input
                        type="text"
                        name="extraDienstOmschrijving"
                        className="input"
                        placeholder="bijv. paard opvangen bij weidegang"
                        value={rij.omschrijving}
                        onChange={(e) =>
                          wijzigPost(rij.key, 'omschrijving', e.target.value)
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Bedrag (€)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        name="extraDienstBedrag"
                        className="input"
                        placeholder="bijv. 25"
                        value={rij.bedrag}
                        onChange={(e) => wijzigPost(rij.key, 'bedrag', e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Frequentie</label>
                      <select
                        name="extraDienstFrequentie"
                        className="input"
                        value={rij.frequentie}
                        onChange={(e) =>
                          wijzigPost(rij.key, 'frequentie', e.target.value)
                        }
                      >
                        {FREQUENTIE_OPTIES.map((opt) => (
                          <option key={opt} value={opt}>
                            {FREQUENTIE_LABELS[opt]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group" style={{ alignSelf: 'end' }}>
                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={() => verwijderPost(rij.key)}
                      >
                        Verwijderen
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 'var(--velaro-space-3)' }}>
                <button type="button" className="btn-ghost" onClick={voegPostToe}>
                  Post toevoegen
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="action-buttons">
        <SubmitButton label={submitLabel} />
        <Link href={`/paarden/${horseId}?tab=contracten`} className="btn-ghost">Annuleren</Link>
      </div>
    </form>
  )
}
