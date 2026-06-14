import type { Prisma } from '@prisma/client'
import { boxtypeLabel, leesHuisvesting } from './huisvesting'
import {
  faciliteitLabel,
  leesDienstpakket,
  weidegangVormLabel,
} from './dienstpakket'
import {
  btwModusLabel,
  formatBedrag,
  leesPrijsLooptijd,
  looptijdAardLabel,
  opzegtermijnEenheidLabel,
  verlengingLabel,
} from './prijsLooptijd'
import { leesVerzekeringAansprakelijkheid } from './verzekeringAansprakelijkheid'
import {
  leesGezondheidsplicht,
  vaccinatieSoortLabel,
} from './gezondheidsplicht'
import { heeftBerijder, leesBerijder } from './berijder'
import {
  bijlageCategorieLabel,
  formatExtraDienstBedrag,
  frequentieLabel,
  leesExtraDiensten,
} from './bijlagenDiensten'
import { formatDatum, isMinderjarig } from '@/features/paarden/paardHelpers'

// Eén gekoppelde bijlage met (optioneel) een signed URL om in te zien/downloaden.
export type SamenvattingBijlage = {
  id: string
  categorie: string
  bestandsnaam: string
  url: string | null
}

// Alleen-lezen samenvatting van de inhoud van een stallingscontract (STAL-09, #82).
// Leest alle optieblokken defensief uit Contract.config met de bestaande lees-/
// labelhelpers van STAL-03 t/m STAL-07. Gebruikt in de paardeigenaar-weergave zodat
// de eigenaar het aanbod kan inzien voordat hij accepteert of afwijst. Bevat geen
// acties — die staan los in EigenaarContractActies.
export default function ContractSamenvatting({
  config,
  bijlagen = [],
}: {
  config: Prisma.JsonValue | null
  // Door de stal gekoppelde bijlagen (STAL-16), met signed URL voor inzage. Optioneel:
  // de aanroeper haalt ze op en autoriseert de signed URL's.
  bijlagen?: SamenvattingBijlage[]
}) {
  const huisvesting = leesHuisvesting(config)
  const { voer, weidegang, faciliteiten } = leesDienstpakket(config)
  const { prijs, borg, looptijd } = leesPrijsLooptijd(config)
  const { verzekering, aansprakelijkheid } = leesVerzekeringAansprakelijkheid(config)
  const gezondheid = leesGezondheidsplicht(config)
  const berijder = leesBerijder(config)
  const extraDiensten = leesExtraDiensten(config)

  const jaNee = (v: boolean) => (v ? 'Ja' : 'Nee')

  // Minderjarig-indicatie: alleen wanneer een geboortedatum is ingevuld waaruit
  // volgt dat de berijder minderjarig is (hergebruik isMinderjarig uit paardHelpers).
  const berijderGeboortedatum = berijder.geboortedatum
    ? new Date(berijder.geboortedatum)
    : null
  const berijderMinderjarig = isMinderjarig(berijderGeboortedatum) === true

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Blok titel="Huisvesting">
        <Veld label="Boxtype" waarde={boxtypeLabel(huisvesting.boxtype)} />
        {huisvesting.boxNumber && <Veld label="Boxnummer" waarde={huisvesting.boxNumber} />}
        <Veld label="Uitmesten door stal" waarde={jaNee(huisvesting.uitmesten)} />
        <Veld label="Opstrooien door stal" waarde={jaNee(huisvesting.opstrooien)} />
        {huisvesting.beddingtype && <Veld label="Beddingtype" waarde={huisvesting.beddingtype} />}
        {huisvesting.toezicht && <Veld label="Toezicht" waarde={huisvesting.toezicht} />}
      </Blok>

      <Blok titel="Voer & verzorging">
        <Veld label="Ruwvoer" waarde={voer.ruwvoer ?? '—'} />
        {voer.krachtvoer && <Veld label="Krachtvoer" waarde={voer.krachtvoer} />}
      </Blok>

      <Blok titel="Weidegang">
        <Veld label="Weidegang" waarde={jaNee(weidegang.actief)} />
        {weidegang.actief && (
          <>
            <Veld label="Vorm" waarde={weidegangVormLabel(weidegang.vorm)} />
            {weidegang.urenPerDag && <Veld label="Uren per dag" waarde={weidegang.urenPerDag} />}
            {weidegang.seizoen && <Veld label="Seizoen" waarde={weidegang.seizoen} />}
          </>
        )}
      </Blok>

      {faciliteiten.geselecteerd.length > 0 && (
        <Blok titel="Faciliteiten">
          <Veld
            label="Inbegrepen"
            waarde={faciliteiten.geselecteerd.map((f) => faciliteitLabel(f)).join(', ')}
          />
        </Blok>
      )}

      <Blok titel="Prijs, borg & looptijd">
        <Veld
          label="Pensionprijs (per maand)"
          waarde={`${formatBedrag(prijs.bedrag)} (${btwModusLabel(prijs.btwModus)}${
            prijs.btwPercentage !== null ? `, ${prijs.btwPercentage}% btw` : ''
          })`}
        />
        <Veld
          label="Borg"
          waarde={borg.actief ? formatBedrag(borg.bedrag) : 'Geen borg'}
        />
        <Veld label="Looptijd" waarde={looptijdAardLabel(looptijd.aard)} />
        {looptijd.aard === 'BEPAALD' && looptijd.einddatum && (
          <Veld label="Einddatum" waarde={looptijd.einddatum} />
        )}
        {looptijd.minimumperiode && (
          <Veld label="Minimumperiode" waarde={looptijd.minimumperiode} />
        )}
        <Veld
          label="Opzegtermijn"
          waarde={`${looptijd.opzegtermijn.waarde} ${opzegtermijnEenheidLabel(
            looptijd.opzegtermijn.eenheid,
          )}${looptijd.opzegtermijn.schriftelijk ? ', schriftelijk' : ''}`}
        />
        <Veld label="Verlenging" waarde={verlengingLabel(looptijd.verlenging)} />
        {looptijd.proefperiode.actief && (
          <Veld
            label="Proefperiode"
            waarde={looptijd.proefperiode.duur ?? 'Ja'}
          />
        )}
        {looptijd.indexering.actief && (
          <Veld
            label="Indexering"
            waarde={looptijd.indexering.grondslag ?? 'Ja'}
          />
        )}
      </Blok>

      <Blok titel="Verzekering & aansprakelijkheid">
        <Veld
          label="WA-/aansprakelijkheidsverzekering eigenaar"
          waarde={jaNee(verzekering.waVerzekeringEigenaar)}
        />
        {verzekering.verzekeraar && <Veld label="Verzekeraar" waarde={verzekering.verzekeraar} />}
        {verzekering.polisnummer && <Veld label="Polisnummer" waarde={verzekering.polisnummer} />}
        <Veld label="Brandverzekering paard" waarde={jaNee(verzekering.brandverzekeringPaard)} />
        <Veld
          label="Risico-acceptatie eigenaar"
          waarde={jaNee(aansprakelijkheid.risicoAcceptatieEigenaar)}
        />
        {aansprakelijkheid.bedrijfsmatigGebruikNotitie && (
          <Veld
            label="Bedrijfsmatig gebruik"
            waarde={aansprakelijkheid.bedrijfsmatigGebruikNotitie}
          />
        )}
      </Blok>

      {(gezondheid.vaccinatie.actief ||
        gezondheid.ontworming.actief ||
        gezondheid.hoefsmid.actief ||
        gezondheid.dierenartsDrempel.actief) && (
        <Blok titel="Entings- & gezondheidsplicht">
          {gezondheid.vaccinatie.actief && (
            <Veld
              label="Vaccinatieplicht"
              waarde={
                gezondheid.vaccinatie.soorten.length > 0
                  ? gezondheid.vaccinatie.soorten
                      .map((s) => vaccinatieSoortLabel(s))
                      .join(', ')
                  : 'Ja'
              }
            />
          )}
          {gezondheid.ontworming.actief && (
            <Veld
              label="Ontworming / mestonderzoek"
              waarde={gezondheid.ontworming.beleid ?? 'Ja'}
            />
          )}
          {gezondheid.hoefsmid.actief && (
            <Veld
              label="Hoefverzorging"
              waarde={
                gezondheid.hoefsmid.intervalWeken !== null
                  ? `Elke ${gezondheid.hoefsmid.intervalWeken} weken`
                  : 'Ja'
              }
            />
          )}
          {gezondheid.dierenartsDrempel.actief && (
            <Veld
              label="Dierenarts-drempel"
              waarde={
                gezondheid.dierenartsDrempel.bedrag !== null
                  ? formatBedrag(gezondheid.dierenartsDrempel.bedrag)
                  : 'Ja'
              }
            />
          )}
        </Blok>
      )}

      {heeftBerijder(berijder) && (
        <Blok titel="Berijder">
          <Veld
            label="Naam"
            waarde={
              berijderMinderjarig
                ? `${berijder.naam} (minderjarig)`
                : (berijder.naam as string)
            }
          />
          {berijderGeboortedatum && (
            <Veld label="Geboortedatum" waarde={formatDatum(berijderGeboortedatum)} />
          )}
          {berijder.relatieTotEigenaar && (
            <Veld label="Relatie tot eigenaar" waarde={berijder.relatieTotEigenaar} />
          )}
        </Blok>
      )}

      {extraDiensten.posten.length > 0 && (
        <Blok titel="Extra diensten (prijslijst)">
          {extraDiensten.posten.map((post, i) => (
            <Veld
              key={i}
              label={post.omschrijving}
              waarde={`${formatExtraDienstBedrag(post.bedrag)} (${frequentieLabel(
                post.frequentie,
              )})`}
            />
          ))}
        </Blok>
      )}

      {bijlagen.length > 0 && (
        <Blok titel="Bijlagen">
          {bijlagen.map((bijlage) => (
            <div className="detail-field" key={bijlage.id}>
              <div className="detail-field-label">
                {bijlageCategorieLabel(bijlage.categorie)}
              </div>
              <div className="detail-field-value">
                {bijlage.url ? (
                  <a
                    href={bijlage.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="form-link"
                  >
                    {bijlage.bestandsnaam}
                  </a>
                ) : (
                  bijlage.bestandsnaam
                )}
              </div>
            </div>
          ))}
        </Blok>
      )}
    </div>
  )
}

function Blok({ titel, children }: { titel: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="label" style={{ marginBottom: 8 }}>
        {titel}
      </div>
      <div className="detail-fields">{children}</div>
    </div>
  )
}

function Veld({ label, waarde }: { label: string; waarde: string }) {
  return (
    <div className="detail-field">
      <div className="detail-field-label">{label}</div>
      <div className="detail-field-value">{waarde}</div>
    </div>
  )
}
