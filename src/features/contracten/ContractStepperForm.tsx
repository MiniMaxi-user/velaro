'use client'

import { useRef, useState } from 'react'
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
import ContractStepper, { Toggle, type StapDef } from './ContractStepper'

type OwnerOption = { userId: string; label: string }

// Voorvulwaarden uit het FeedingPlan van het paard (STAL-04). Wanneer er geen
// voederschema is, is dit object null en wordt de overnemen-knop uitgeschakeld.
type VoerVoorvulling = {
  ruwvoer: string | null
  krachtvoer: string | null
}

// ── Stalling-consument van de generieke stepper-schil ────────────────────────
// Deze component houdt de stalling-specifieke client-state vast, bouwt de
// data-gedreven stappen-config (metadata + render van de velden, bron van waarheid
// gelijk aan ontbrekendeAanbiedVelden per blok) en voedt die aan `ContractStepper`.
// De schil (`ContractStepper`) kent geen stalling-velden of -teksten meer.
export default function ContractStepperForm({
  horseId,
  contractId,
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
  heeftStalreglement,
  submitLabel = 'Wijzigingen opslaan',
}: {
  horseId: string
  contractId: string
  action: (formData: FormData) => Promise<void>
  owners: OwnerOption[]
  defaultCounterpartyUserId?: string
  defaultStartDate?: string
  huisvesting: HuisvestingConfig
  dienstpakket: DienstpakketConfig
  voederschema?: VoerVoorvulling | null
  prijsLooptijd: PrijsLooptijdConfig
  verzekeringAansprakelijkheid: VerzekeringAansprakelijkheidConfig
  gezondheidsplicht: GezondheidsplichtConfig
  berijder: BerijderConfig
  bijlagenConfig: BijlagenConfig
  extraDiensten: ExtraDienstenConfig
  // Of er een stalreglement-bijlage aan het contract gekoppeld is (DB-feit). Bepaalt
  // mede de compleetheid van de Bijlagen-stap wanneer "stalreglement verplicht" aanstaat.
  heeftStalreglement: boolean
  submitLabel?: string
}) {
  const ruwvoerRef = useRef<HTMLInputElement>(null)
  const krachtvoerRef = useRef<HTMLInputElement>(null)

  // Client-state voor de prijs/looptijd-sectie.
  const [looptijdAard, setLooptijdAard] = useState<LooptijdAard>(
    prijsLooptijd.looptijd.aard,
  )
  const [opzegWaarde, setOpzegWaarde] = useState<number>(
    prijsLooptijd.looptijd.opzegtermijn.waarde,
  )
  const [opzegEenheid, setOpzegEenheid] = useState<OpzegtermijnEenheid>(
    prijsLooptijd.looptijd.opzegtermijn.eenheid,
  )
  const opzegtermijnKort = isOpzegtermijnKorterDanMaand({
    waarde: opzegWaarde,
    eenheid: opzegEenheid,
    schriftelijk: true,
  })

  // Weidegang actief — bepaalt of de weidegang-vorm verplicht is (mirror van
  // ontbrekendeDienstpakketVelden).
  const [weidegangActief, setWeidegangActief] = useState<boolean>(
    dienstpakket.weidegang.actief,
  )

  // Prijslijst (extra diensten) — dynamische lijst.
  type PrijslijstRij = {
    key: string
    omschrijving: string
    bedrag: string
    frequentie: Frequentie
  }
  const [prijslijst, setPrijslijst] = useState<PrijslijstRij[]>(
    (extraDiensten.posten ?? []).map((p, i) => ({
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

  const overnemenUitVoederschema = () => {
    if (!voederschema) return
    if (ruwvoerRef.current) ruwvoerRef.current.value = voederschema.ruwvoer ?? ''
    if (krachtvoerRef.current) krachtvoerRef.current.value = voederschema.krachtvoer ?? ''
  }

  // Helper voor een verplicht-asterisk.
  const ster = <span className="required">*</span>

  // ── Stalling-stappen: metadata (verplichte velden + voorwaarden) én render van
  // de velden per blok. Bron van waarheid voor verplichte velden = identiek aan de
  // aanbied-validatie (ontbrekendeAanbiedVelden per blok). ────────────────────────
  const stappen: StapDef[] = [
    {
      id: 'stap-basis',
      naam: 'Basisgegevens',
      sub: 'Type, wederpartij en ingangsdatum',
      verplicht: [{ naam: 'counterpartyUserId' }],
      render: () => (
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="type" className="form-label">Type contract</label>
            <input
              id="type"
              type="text"
              className="input"
              value="Stalling — Full pension"
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
      id: 'stap-huisvesting',
      naam: 'Huisvesting & verzorging',
      sub: 'Box, bedding en toezicht',
      verplicht: [{ naam: 'boxtype' }],
      render: () => (
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="boxtype" className="form-label">Boxtype {ster}</label>
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

          <Toggle name="uitmesten" label="Uitmesten door de stal" defaultChecked={huisvesting.uitmesten} />
          <Toggle name="opstrooien" label="Opstrooien door de stal" defaultChecked={huisvesting.opstrooien} />
        </div>
      ),
    },
    {
      id: 'stap-dienstpakket',
      naam: 'Dienstpakket',
      sub: 'Voer, weidegang en faciliteiten',
      verplicht: [
        { naam: 'voerRuwvoer' },
        { naam: 'weidegangVorm', voorwaarde: () => weidegangActief },
      ],
      render: () => (
        <>
          <div className="form-subblock-title">Voer &amp; verzorging</div>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="voerRuwvoer" className="form-label">Ruwvoer {ster}</label>
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
              <span className="form-hint" style={{ marginLeft: 'var(--velaro-space-3)' }}>
                Geen voederschema beschikbaar voor dit paard.
              </span>
            )}
          </div>

          <div className="form-subblock-title" style={{ marginTop: 'var(--velaro-space-6)' }}>Weidegang</div>
          <div className="form-grid">
            <Toggle
              name="weidegangActief"
              label="Weidegang inbegrepen"
              defaultChecked={dienstpakket.weidegang.actief}
              onChange={(checked) => setWeidegangActief(checked)}
            />

            <div className="form-group">
              <label htmlFor="weidegangVorm" className="form-label">
                Vorm {weidegangActief && ster}
              </label>
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

          <div className="form-subblock-title" style={{ marginTop: 'var(--velaro-space-6)' }}>Faciliteiten</div>
          <div className="form-grid">
            {FACILITEIT_OPTIES.map((opt) => (
              <Toggle
                key={opt}
                name="faciliteiten"
                value={opt}
                label={FACILITEIT_LABELS[opt]}
                defaultChecked={dienstpakket.faciliteiten.geselecteerd.includes(opt)}
              />
            ))}
          </div>
        </>
      ),
    },
    {
      id: 'stap-prijs',
      naam: 'Prijs & looptijd',
      sub: 'Pensionprijs, borg en looptijd',
      verplicht: [
        { naam: 'prijsBedrag' },
        { naam: 'looptijdEinddatum', voorwaarde: () => looptijdAard === 'BEPAALD' },
      ],
      render: () => (
        <>
          <div className="form-subblock-title">Prijs &amp; borg</div>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="prijsBedrag" className="form-label">Pensionprijs (€ per maand) {ster}</label>
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

            <Toggle name="borgActief" label="Borg van toepassing" defaultChecked={prijsLooptijd.borg.actief} />

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

          <div className="form-subblock-title" style={{ marginTop: 'var(--velaro-space-6)' }}>Looptijd</div>
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
                <label htmlFor="looptijdEinddatum" className="form-label">Einddatum {ster}</label>
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

            <Toggle
              name="opzegtermijnSchriftelijk"
              label="Opzeggen dient schriftelijk te gebeuren"
              defaultChecked={prijsLooptijd.looptijd.opzegtermijn.schriftelijk}
            />

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

            <Toggle
              name="proefperiodeActief"
              label="Proefperiode"
              defaultChecked={prijsLooptijd.looptijd.proefperiode.actief}
            />

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

            <Toggle
              name="indexeringActief"
              label="Indexering van toepassing"
              defaultChecked={prijsLooptijd.looptijd.indexering.actief}
            />

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
        </>
      ),
    },
    {
      id: 'stap-verzekering',
      naam: 'Verzekering & aansprakelijkheid',
      sub: 'Verplichte juridische bevestigingen',
      verplicht: [
        { naam: 'verzWaEigenaar' },
        { naam: 'verzPolisnummer' },
        { naam: 'verzVerzekeraar' },
        { naam: 'aansprRisicoAcceptatie' },
      ],
      render: () => (
        <>
          <div className="form-subblock-title">Verzekering</div>
          <div className="form-grid">
            <Toggle
              name="verzWaEigenaar"
              label="WA-/aansprakelijkheidsverzekering eigenaar"
              verplicht
              hint="Verplicht: de eigenaar dient een aansprakelijkheidsverzekering te hebben."
              defaultChecked={verzekeringAansprakelijkheid.verzekering.waVerzekeringEigenaar}
            />

            <div className="form-group">
              <label htmlFor="verzPolisnummer" className="form-label">Polisnummer {ster}</label>
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
              <label htmlFor="verzVerzekeraar" className="form-label">Verzekeraar/maatschappij {ster}</label>
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

            <Toggle
              name="verzEigenaarVerzekertZelf"
              label="De eigenaar verzekert het paard zelf"
              defaultChecked={verzekeringAansprakelijkheid.verzekering.eigenaarVerzekertZelf}
            />

            <Toggle
              name="verzBrandPaard"
              label="Brandverzekering paard van toepassing"
              defaultChecked={verzekeringAansprakelijkheid.verzekering.brandverzekeringPaard}
            />
          </div>

          <div className="form-subblock-title" style={{ marginTop: 'var(--velaro-space-6)' }}>Aansprakelijkheid</div>
          <div className="form-grid">
            <Toggle
              name="aansprRisicoAcceptatie"
              label="Risico-acceptatie eigenaar"
              verplicht
              hint="Verplicht: de eigenaar accepteert het risico van stalling."
              defaultChecked={verzekeringAansprakelijkheid.aansprakelijkheid.risicoAcceptatieEigenaar}
            />

            <Toggle
              name="aansprBezitter"
              label="Bezitter-aansprakelijkheid (art. 6:179 BW)"
              defaultChecked={verzekeringAansprakelijkheid.aansprakelijkheid.bezitterAansprakelijkheid}
            />

            <Toggle
              name="aansprZorgplichtStal"
              label="Zorgplicht stal vastgelegd"
              defaultChecked={verzekeringAansprakelijkheid.aansprakelijkheid.zorgplichtStal}
            />

            <Toggle
              name="aansprStalBeperkt"
              label="Aansprakelijkheid stal beperkt en gekoppeld aan dekking"
              defaultChecked={verzekeringAansprakelijkheid.aansprakelijkheid.aansprakelijkheidStalBeperkt}
            />

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
        </>
      ),
    },
    {
      id: 'stap-gezondheid',
      naam: 'Entings- & gezondheidsplicht',
      sub: 'Vaccinatie, ontworming, hoefverzorging',
      verplicht: [],
      render: () => (
        <>
          <div className="form-subblock-title">Vaccinatie</div>
          <div className="form-grid">
            <Toggle
              name="vaccinatieActief"
              label="Vaccinatieplicht van toepassing"
              defaultChecked={gezondheidsplicht.vaccinatie.actief}
            />

            <div className="form-group">
              <label htmlFor="vaccinatieInterval" className="form-label">Vaccinatie-interval (maanden)</label>
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
                  <Toggle
                    key={opt}
                    name="vaccinatieSoorten"
                    value={opt}
                    label={VACCINATIE_SOORT_LABELS[opt]}
                    defaultChecked={gezondheidsplicht.vaccinatie.soorten.includes(opt)}
                    bare
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="form-subblock-title" style={{ marginTop: 'var(--velaro-space-6)' }}>Ontworming &amp; mestonderzoek</div>
          <div className="form-grid">
            <Toggle
              name="ontwormingActief"
              label="Ontwormings-/mestonderzoekplicht van toepassing"
              defaultChecked={gezondheidsplicht.ontworming.actief}
            />

            <div className="form-group">
              <label htmlFor="ontwormingInterval" className="form-label">Interval (maanden)</label>
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

          <div className="form-subblock-title" style={{ marginTop: 'var(--velaro-space-6)' }}>Hoefverzorging</div>
          <div className="form-grid">
            <Toggle
              name="hoefsmidActief"
              label="Hoefsmidplicht van toepassing"
              defaultChecked={gezondheidsplicht.hoefsmid.actief}
            />

            <div className="form-group">
              <label htmlFor="hoefsmidInterval" className="form-label">Hoefsmid-interval (weken)</label>
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

          <div className="form-subblock-title" style={{ marginTop: 'var(--velaro-space-6)' }}>Dierenarts-drempel</div>
          <div className="form-grid">
            <Toggle
              name="dierenartsDrempelActief"
              label="Drempel voor voorafgaande toestemming van toepassing"
              defaultChecked={gezondheidsplicht.dierenartsDrempel.actief}
            />

            <div className="form-group">
              <label htmlFor="dierenartsDrempelBedrag" className="form-label">Drempelbedrag (€)</label>
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

            <Toggle
              name="dierenartsMeldingsplicht"
              label="Meldingsplicht aan de eigenaar"
              defaultChecked={gezondheidsplicht.dierenartsDrempel.meldingsplichtEigenaar}
            />
          </div>
        </>
      ),
    },
    {
      id: 'stap-berijder',
      naam: 'Berijder',
      sub: 'Optioneel — informatief op de overeenkomst',
      verplicht: [],
      render: () => (
        <>
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
        </>
      ),
    },
    {
      id: 'stap-bijlagen',
      naam: 'Bijlagen & extra diensten',
      sub: 'Stalreglement en prijslijst',
      verplicht: [],
      // Familie-specifieke compleetheid: wanneer "stalreglement verplicht" aanstaat
      // maar er nog geen stalreglement-bijlage (DB-feit) gekoppeld is, telt dit blok
      // als "bezig"; anders compleet. Mirror van ontbrekendeAanbiedVelden.
      compleetheid: ({ formRef }) => {
        const toggle = formRef.current?.querySelector<HTMLInputElement>(
          '[name="stalreglementVerplicht"]',
        )
        const verplichtAan = !!toggle?.checked
        if (verplichtAan && !heeftStalreglement) {
          return { pct: 0, status: 'bezig' }
        }
        return { pct: 100, status: 'compleet' }
      },
      render: () => (
        <>
          <Toggle
            name="stalreglementVerplicht"
            label="Stalreglement verplicht"
            hint="Staat dit aan, dan kan het contract pas worden aangeboden wanneer er een stalreglement-bijlage is gekoppeld. Bijlagen koppel je hieronder, los van dit formulier."
            defaultChecked={bijlagenConfig.stalreglementVerplicht}
          />

          <div style={{ marginTop: 'var(--velaro-space-4)' }}>
            <div className="form-label">Extra diensten / prijslijst</div>
            <p className="form-hint" style={{ marginBottom: 'var(--velaro-space-3)' }}>
              Posten die los van de pensionprijs gefactureerd kunnen worden. Vul per
              post een omschrijving, een bedrag en een frequentie in.
            </p>

            {prijslijst.length === 0 && (
              <p className="form-hint" style={{ marginBottom: 'var(--velaro-space-3)' }}>
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
                      onChange={(e) => wijzigPost(rij.key, 'omschrijving', e.target.value)}
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
                      onChange={(e) => wijzigPost(rij.key, 'frequentie', e.target.value)}
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
        </>
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
