import type { LeaseType, Prisma } from '@prisma/client'
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
import { leesGezondheidsplicht, vaccinatieSoortLabel } from './gezondheidsplicht'
import { heeftBerijder, leesBerijder } from './berijder'
import {
  bijlageCategorieLabel,
  formatExtraDienstBedrag,
  frequentieLabel,
  leesExtraDiensten,
} from './bijlagenDiensten'
import {
  kentDagenPerWeek,
  kentKoopoptie,
  leesLeaseContractConfig,
  OPZEGTERMIJN_EENHEID_LABELS,
} from './leaseContract'
import { berekenKosten, KOSTENPOSTEN } from '../lease/leaseKostenConfig'
import { leaseTypeLabel } from '../lease/leaseHelpers'

// ── PDF-databouw (STAL-12) ───────────────────────────────────────────────────
// Bouwt uit een contract + config het stel documentsecties op dat de PDF rendert.
// Hergebruikt bewust dezelfde lees-/labelhelpers als de web-UI (ContractSamenvatting),
// zodat de PDF exact dezelfde labels/teksten toont. Alleen aangezette of ingevulde
// optieblokken leveren een sectie op; uitgeschakelde of lege blokken worden
// weggelaten (geen lege koppen of placeholders).

// Eén waarde-regel binnen een sectie.
export type PdfRegel = {
  label: string
  waarde: string
}

// Eén artikel/sectie in het contract.
export type PdfSectie = {
  titel: string
  regels: PdfRegel[]
}

// De partijen + paard-kop van het document.
export type PdfPartijen = {
  stalNaam: string
  stalAdres: string | null
  // Eigenaar/verleaser-kant. Bij stalling is dit de paardeigenaar; bij lease is dit
  // de verleaser (de stal bij Horse.eigendom = STAL, óf de particuliere eigenaar).
  eigenaarNaam: string
  paardNaam: string
  ingangsdatum: string | null
  // Leaser (alleen bij een leasecontract). Null bij een stallingscontract.
  leaserNaam: string | null
  // Ouder/voogd van een minderjarige berijder (alleen bij lease, en alleen wanneer
  // de berijder minderjarig is). Tekent namens de berijder.
  voogdNaam: string | null
}

// Het volledige, gerenderde model van de PDF.
export type ContractPdfData = {
  titel: string
  // Contract-familie, zodat het document de juiste partijen-labels en
  // ondertekenvakken kiest (stalling vs. lease).
  family: 'STALLING' | 'LEASE'
  versie: number
  generatieDatum: string
  partijen: PdfPartijen
  secties: PdfSectie[]
  // Eigen stallogo als data-URL (#98). Aanwezig wanneer de stal een logo heeft
  // geüpload; anders null en valt de PDF terug op het standaard Velaro-logo.
  stalLogoDataUrl: string | null
  // Profielfoto van het paard als data-URL (#118). Aanwezig wanneer het paard een
  // foto heeft; anders null en bevat de PDF geen lege fotoplaats.
  paardFotoDataUrl: string | null
}

// Minimale contract-vorm die de databouw nodig heeft. Werkt zowel met een uit de
// DB geladen Contract als met een in-memory concept (preview).
export type PdfContractInput = {
  currentVersion: number
  startDate: Date | null
  config: Prisma.JsonValue | null
  // Contract-familie. Bepaalt welke opbouw (stalling- of lease-secties) en titel de
  // PDF krijgt. Standaard STALLING zodat bestaande aanroepen ongewijzigd blijven.
  family?: 'STALLING' | 'LEASE'
  // Leasevorm (Contract.type bij family = LEASE), nodig om vorm-afhankelijke velden
  // te tonen (dagen/week bij deellease, koopoptie). Null/ongezet bij stalling.
  leaseType?: LeaseType | null
  // Door de stal aangeleverde bijlagen (STAL-16). Hier alleen de namen + categorie
  // (geen bestanden): de PDF toont enkel een overzicht van wat er gekoppeld is.
  bijlagen?: { categorie: string; bestandsnaam: string }[]
}

export type PdfContextInput = {
  stalNaam: string
  stalAdres: string | null
  // Eigenaar/verleaser-kant (zie PdfPartijen.eigenaarNaam).
  eigenaarNaam: string
  paardNaam: string
  // Leaser (alleen bij een leasecontract), of null bij stalling.
  leaserNaam?: string | null
  // Eigen stallogo als data-URL (#98), of null voor de Velaro-fallback.
  stalLogoDataUrl?: string | null
  // Profielfoto van het paard als data-URL (#118), of null wanneer er geen foto is.
  paardFotoDataUrl?: string | null
}

const jaNee = (v: boolean) => (v ? 'Ja' : 'Nee')

function formatDatumNL(date: Date): string {
  return new Intl.DateTimeFormat('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

// Bouwt het volledige PDF-datamodel. `vandaag` is injecteerbaar voor tests/preview.
// Een leasecontract (family = LEASE) krijgt een eigen opbouw met lease-secties en de
// titel "Lease-overeenkomst"; alle overige contracten blijven de stalling-PDF.
export function bouwContractPdfData(
  contract: PdfContractInput,
  context: PdfContextInput,
  vandaag: Date = new Date(),
): ContractPdfData {
  if (contract.family === 'LEASE') {
    return bouwLeasePdfData(contract, context, vandaag)
  }
  const huisvesting = leesHuisvesting(contract.config)
  const { voer, weidegang, faciliteiten } = leesDienstpakket(contract.config)
  const { prijs, borg, looptijd } = leesPrijsLooptijd(contract.config)
  const { verzekering, aansprakelijkheid } = leesVerzekeringAansprakelijkheid(
    contract.config,
  )
  const gezondheid = leesGezondheidsplicht(contract.config)
  const berijder = leesBerijder(contract.config)

  const secties: PdfSectie[] = []

  // ── Huisvesting ──
  // Alleen tonen wanneer er minstens één huisvesting-gegeven is vastgelegd.
  {
    const regels: PdfRegel[] = []
    if (huisvesting.boxtype) {
      regels.push({ label: 'Boxtype', waarde: boxtypeLabel(huisvesting.boxtype) })
    }
    if (huisvesting.boxNumber) {
      regels.push({ label: 'Boxnummer', waarde: huisvesting.boxNumber })
    }
    if (huisvesting.boxtype || huisvesting.boxNumber) {
      regels.push({ label: 'Uitmesten door stal', waarde: jaNee(huisvesting.uitmesten) })
      regels.push({ label: 'Opstrooien door stal', waarde: jaNee(huisvesting.opstrooien) })
    }
    if (huisvesting.beddingtype) {
      regels.push({ label: 'Beddingtype', waarde: huisvesting.beddingtype })
    }
    if (huisvesting.toezicht) {
      regels.push({ label: 'Toezicht', waarde: huisvesting.toezicht })
    }
    if (regels.length > 0) {
      secties.push({ titel: 'Huisvesting', regels })
    }
  }

  // ── Voer & verzorging ──
  {
    const regels: PdfRegel[] = []
    if (voer.ruwvoer) regels.push({ label: 'Ruwvoer', waarde: voer.ruwvoer })
    if (voer.krachtvoer) regels.push({ label: 'Krachtvoer', waarde: voer.krachtvoer })
    if (regels.length > 0) {
      secties.push({ titel: 'Voer & verzorging', regels })
    }
  }

  // ── Weidegang ── (alleen bij actieve weidegang)
  if (weidegang.actief) {
    const regels: PdfRegel[] = [{ label: 'Weidegang', waarde: 'Ja' }]
    regels.push({ label: 'Vorm', waarde: weidegangVormLabel(weidegang.vorm) })
    if (weidegang.urenPerDag) {
      regels.push({ label: 'Uren per dag', waarde: weidegang.urenPerDag })
    }
    if (weidegang.seizoen) {
      regels.push({ label: 'Seizoen', waarde: weidegang.seizoen })
    }
    secties.push({ titel: 'Weidegang', regels })
  }

  // ── Faciliteiten ── (alleen wanneer er minstens één is geselecteerd)
  if (faciliteiten.geselecteerd.length > 0) {
    secties.push({
      titel: 'Faciliteiten',
      regels: [
        {
          label: 'Inbegrepen',
          waarde: faciliteiten.geselecteerd.map((f) => faciliteitLabel(f)).join(', '),
        },
      ],
    })
  }

  // ── Prijs, borg & looptijd ── (alleen wanneer een prijs is ingevuld)
  if (prijs.bedrag !== null) {
    const regels: PdfRegel[] = [
      {
        label: 'Pensionprijs (per maand)',
        waarde: `${formatBedrag(prijs.bedrag)} (${btwModusLabel(prijs.btwModus)}${
          prijs.btwPercentage !== null ? `, ${prijs.btwPercentage}% btw` : ''
        })`,
      },
      { label: 'Borg', waarde: borg.actief ? formatBedrag(borg.bedrag) : 'Geen borg' },
      { label: 'Looptijd', waarde: looptijdAardLabel(looptijd.aard) },
    ]
    if (looptijd.aard === 'BEPAALD' && looptijd.einddatum) {
      regels.push({ label: 'Einddatum', waarde: looptijd.einddatum })
    }
    if (looptijd.minimumperiode) {
      regels.push({ label: 'Minimumperiode', waarde: looptijd.minimumperiode })
    }
    regels.push({
      label: 'Opzegtermijn',
      waarde: `${looptijd.opzegtermijn.waarde} ${opzegtermijnEenheidLabel(
        looptijd.opzegtermijn.eenheid,
      )}${looptijd.opzegtermijn.schriftelijk ? ', schriftelijk' : ''}`,
    })
    regels.push({ label: 'Verlenging', waarde: verlengingLabel(looptijd.verlenging) })
    if (looptijd.proefperiode.actief) {
      regels.push({
        label: 'Proefperiode',
        waarde: looptijd.proefperiode.duur ?? 'Ja',
      })
    }
    if (looptijd.indexering.actief) {
      regels.push({
        label: 'Indexering',
        waarde: looptijd.indexering.grondslag ?? 'Ja',
      })
    }
    secties.push({ titel: 'Prijs, borg & looptijd', regels })
  }

  // ── Verzekering & aansprakelijkheid ──
  // Alleen tonen wanneer er inhoudelijk iets is vastgelegd (een verplicht blok bij
  // aanbieden, maar een leeg conceptblok levert geen lege sectie op).
  {
    const heeftInhoud =
      verzekering.waVerzekeringEigenaar ||
      verzekering.polisnummer !== null ||
      verzekering.verzekeraar !== null ||
      verzekering.brandverzekeringPaard ||
      verzekering.eigenaarVerzekertZelf ||
      aansprakelijkheid.risicoAcceptatieEigenaar ||
      aansprakelijkheid.bezitterAansprakelijkheid ||
      aansprakelijkheid.bedrijfsmatigGebruikNotitie !== null ||
      aansprakelijkheid.zorgplichtStal ||
      aansprakelijkheid.aansprakelijkheidStalBeperkt
    if (heeftInhoud) {
      const regels: PdfRegel[] = [
        {
          label: 'WA-/aansprakelijkheidsverzekering eigenaar',
          waarde: jaNee(verzekering.waVerzekeringEigenaar),
        },
      ]
      if (verzekering.verzekeraar) {
        regels.push({ label: 'Verzekeraar', waarde: verzekering.verzekeraar })
      }
      if (verzekering.polisnummer) {
        regels.push({ label: 'Polisnummer', waarde: verzekering.polisnummer })
      }
      regels.push({
        label: 'Brandverzekering paard',
        waarde: jaNee(verzekering.brandverzekeringPaard),
      })
      regels.push({
        label: 'Risico-acceptatie eigenaar',
        waarde: jaNee(aansprakelijkheid.risicoAcceptatieEigenaar),
      })
      if (aansprakelijkheid.bedrijfsmatigGebruikNotitie) {
        regels.push({
          label: 'Bedrijfsmatig gebruik',
          waarde: aansprakelijkheid.bedrijfsmatigGebruikNotitie,
        })
      }
      secties.push({ titel: 'Verzekering & aansprakelijkheid', regels })
    }
  }

  // ── Entings- & gezondheidsplicht ── (alleen actieve onderdelen)
  if (
    gezondheid.vaccinatie.actief ||
    gezondheid.ontworming.actief ||
    gezondheid.hoefsmid.actief ||
    gezondheid.dierenartsDrempel.actief
  ) {
    const regels: PdfRegel[] = []
    if (gezondheid.vaccinatie.actief) {
      regels.push({
        label: 'Vaccinatieplicht',
        waarde:
          gezondheid.vaccinatie.soorten.length > 0
            ? gezondheid.vaccinatie.soorten.map((s) => vaccinatieSoortLabel(s)).join(', ')
            : 'Ja',
      })
    }
    if (gezondheid.ontworming.actief) {
      regels.push({
        label: 'Ontworming / mestonderzoek',
        waarde: gezondheid.ontworming.beleid ?? 'Ja',
      })
    }
    if (gezondheid.hoefsmid.actief) {
      regels.push({
        label: 'Hoefverzorging',
        waarde:
          gezondheid.hoefsmid.intervalWeken !== null
            ? `Elke ${gezondheid.hoefsmid.intervalWeken} weken`
            : 'Ja',
      })
    }
    if (gezondheid.dierenartsDrempel.actief) {
      regels.push({
        label: 'Dierenarts-drempel',
        waarde:
          gezondheid.dierenartsDrempel.bedrag !== null
            ? formatBedrag(gezondheid.dierenartsDrempel.bedrag)
            : 'Ja',
      })
    }
    secties.push({ titel: 'Entings- & gezondheidsplicht', regels })
  }

  // ── Berijder ── (alleen wanneer een naam is vastgelegd)
  if (heeftBerijder(berijder)) {
    const regels: PdfRegel[] = [{ label: 'Naam', waarde: berijder.naam as string }]
    if (berijder.geboortedatum) {
      regels.push({ label: 'Geboortedatum', waarde: berijder.geboortedatum })
    }
    if (berijder.relatieTotEigenaar) {
      regels.push({ label: 'Relatie tot eigenaar', waarde: berijder.relatieTotEigenaar })
    }
    secties.push({ titel: 'Berijder', regels })
  }

  // ── Extra diensten / prijslijst (STAL-16) ── (alleen bij minstens één post)
  // Naast de reguliere pensionprijs vastgelegde posten die los gefactureerd kunnen
  // worden. Elke post als regel: "omschrijving — bedrag (frequentie)".
  const extraDiensten = leesExtraDiensten(contract.config)
  if (extraDiensten.posten.length > 0) {
    secties.push({
      titel: 'Extra diensten (prijslijst)',
      regels: extraDiensten.posten.map((post) => ({
        label: post.omschrijving,
        waarde: `${formatExtraDienstBedrag(post.bedrag)} (${frequentieLabel(
          post.frequentie,
        )})`,
      })),
    })
  }

  // ── Bijlagen (STAL-16) ── (alleen wanneer er bijlagen gekoppeld zijn)
  // Een overzicht van de gekoppelde documenten (geen bestandsinhoud in de PDF).
  const bijlagen = contract.bijlagen ?? []
  if (bijlagen.length > 0) {
    secties.push({
      titel: 'Bijlagen',
      regels: bijlagen.map((b) => ({
        label: bijlageCategorieLabel(b.categorie),
        waarde: b.bestandsnaam,
      })),
    })
  }

  return {
    titel: 'Stallingsovereenkomst',
    family: 'STALLING',
    versie: contract.currentVersion,
    generatieDatum: formatDatumNL(vandaag),
    partijen: {
      stalNaam: context.stalNaam,
      stalAdres: context.stalAdres,
      eigenaarNaam: context.eigenaarNaam,
      paardNaam: context.paardNaam,
      ingangsdatum: contract.startDate ? formatDatumNL(contract.startDate) : null,
      leaserNaam: null,
      voogdNaam: null,
    },
    secties,
    stalLogoDataUrl: context.stalLogoDataUrl ?? null,
    paardFotoDataUrl: context.paardFotoDataUrl ?? null,
  }
}

// ── Lease-PDF-databouw (#140) ────────────────────────────────────────────────
// Bouwt de secties voor een leasecontract uit Contract.config.lease. Hergebruikt
// bewust dezelfde lees-/labelhelpers als de lease-stepper (leaseContract.ts,
// leaseKostenConfig.ts, leaseVerzekeringConfig.ts), zodat de PDF exact dezelfde
// teksten/labels toont als de web-UI. Net als de stalling-PDF: lege of uitgeschakelde
// blokken leveren geen lege koppen of placeholders op.
export function bouwLeasePdfData(
  contract: PdfContractInput,
  context: PdfContextInput,
  vandaag: Date = new Date(),
): ContractPdfData {
  const lease = leesLeaseContractConfig(contract.config)
  const leaseType = contract.leaseType ?? null
  const secties: PdfSectie[] = []

  // ── Gebruiksrecht & disciplines ──
  {
    const regels: PdfRegel[] = []
    if (leaseType) {
      regels.push({ label: 'Leasevorm', waarde: leaseTypeLabel(leaseType) })
    }
    if (lease.gebruiksrecht) {
      regels.push({ label: 'Gebruiksrecht', waarde: lease.gebruiksrecht })
    }
    if (lease.disciplines) {
      regels.push({ label: 'Disciplines', waarde: lease.disciplines })
    }
    if (lease.dagenPerWeek !== null && (!leaseType || kentDagenPerWeek(leaseType))) {
      regels.push({
        label: 'Dagen per week',
        waarde: `${lease.dagenPerWeek}`,
      })
    }
    if (lease.maxGewichtRuiterKg !== null) {
      regels.push({
        label: 'Max. gewicht ruiter',
        waarde: `${lease.maxGewichtRuiterKg} kg`,
      })
    }
    if (lease.beperkingen) {
      regels.push({ label: 'Beperkingen / aandachtspunten paard', waarde: lease.beperkingen })
    }
    if (regels.length > 0) {
      secties.push({ titel: 'Gebruiksrecht & disciplines', regels })
    }
  }

  // ── Kosten & leasevergoeding ── (alleen wanneer een vergoeding of kostenpost is ingevuld)
  {
    const k = lease.kosten
    const heeftPost = KOSTENPOSTEN.some((def) => k.posten[def.key]?.bedrag !== null)
    if (k.vergoeding !== null || heeftPost) {
      const berekening = berekenKosten(k)
      const regels: PdfRegel[] = []
      if (k.vergoeding !== null) {
        regels.push({
          label: 'Leasevergoeding per maand (excl. btw)',
          waarde: formatBedrag(k.vergoeding),
        })
        if (k.btw) {
          regels.push({ label: 'Btw (21%)', waarde: formatBedrag(berekening.btwBedrag) })
          regels.push({
            label: 'Leasevergoeding per maand (incl. btw)',
            waarde: formatBedrag(berekening.totaalVergoeding),
          })
        }
      }
      // Kostenverdeling per post — alleen posten met een bedrag of expliciet
      // 'onvoorzien'-markering tonen, zodat lege posten geen ruis opleveren.
      for (const def of KOSTENPOSTEN) {
        const post = k.posten[def.key]
        if (!post) continue
        if (post.bedrag === null && !post.onvoorzien) continue
        const betalerLabel = post.betaler === 'LEASER' ? 'Leaser' : 'Eigenaar'
        const bedragDeel = post.bedrag !== null ? ` — ${formatBedrag(post.bedrag)}` : ''
        const onvoorzienDeel = post.onvoorzien ? ' (incl. onvoorzien)' : ''
        regels.push({
          label: def.label,
          waarde: `${betalerLabel}${bedragDeel}${onvoorzienDeel}`,
        })
      }
      regels.push({
        label: 'Leaser betaalt per maand',
        waarde: formatBedrag(berekening.leaserMaand),
      })
      regels.push({
        label: 'Eigenaar draagt per maand',
        waarde: formatBedrag(berekening.eigenaarMaand),
      })
      secties.push({ titel: 'Kosten & leasevergoeding', regels })
    }
  }

  // ── Verzekering & aansprakelijkheid (6:179 BW) ──
  {
    const v = lease.verzekering
    const heeftInhoud =
      v.meeverzekerd !== null ||
      v.risicoAcceptatie ||
      v.dekkingOngevallen ||
      v.risicoBevestigd
    if (heeftInhoud) {
      const regels: PdfRegel[] = []
      if (v.meeverzekerd !== null) {
        regels.push({
          label: 'Leaser meeverzekerd op WA/AVP eigenaar',
          waarde: v.meeverzekerd === 'JA' ? 'Ja' : 'Nee',
        })
      }
      if (v.risicoAcceptatie) {
        regels.push({ label: 'Risico-acceptatie (art. 6:179 BW)', waarde: 'Ja' })
      }
      if (v.dekkingOngevallen) {
        regels.push({ label: 'Dekking ongevallen ruiter', waarde: 'Ja' })
      }
      if (v.risicoBevestigd) {
        regels.push({ label: 'Risico bevestigd door leaser', waarde: 'Ja' })
      }
      secties.push({ titel: 'Verzekering & aansprakelijkheid', regels })
    }
  }

  // ── Looptijd / proefperiode / opzegging ──
  {
    const l = lease.looptijd
    const regels: PdfRegel[] = []
    if (l.einddatum) {
      regels.push({ label: 'Einddatum', waarde: l.einddatum })
    }
    if (l.minimumTermijnMaanden !== null) {
      regels.push({
        label: 'Minimale looptijd',
        waarde: `${l.minimumTermijnMaanden} maanden`,
      })
    }
    if (l.opzegtermijnDagen !== null) {
      regels.push({
        label: 'Opzegtermijn',
        waarde: `${l.opzegtermijnDagen} ${OPZEGTERMIJN_EENHEID_LABELS[l.opzegtermijnEenheid]}`,
      })
    }
    if (l.proefperiode.actief) {
      regels.push({
        label: 'Proefperiode',
        waarde: l.proefperiode.einddatum ? `Tot ${l.proefperiode.einddatum}` : 'Ja',
      })
    }
    if (lease.doorbetalingBijBlessureDagen !== null) {
      regels.push({
        label: 'Doorbetaling bij blessure',
        waarde: `${lease.doorbetalingBijBlessureDagen} dagen`,
      })
    }
    if (regels.length > 0) {
      secties.push({ titel: 'Looptijd / proefperiode / opzegging', regels })
    }
  }

  // ── Berijder ── (alleen wanneer een naam is vastgelegd)
  if (lease.berijder.naam) {
    const regels: PdfRegel[] = [{ label: 'Naam', waarde: lease.berijder.naam }]
    if (lease.berijder.geboortedatum) {
      regels.push({ label: 'Geboortedatum', waarde: lease.berijder.geboortedatum })
    }
    if (lease.berijder.minderjarig) {
      regels.push({ label: 'Minderjarig', waarde: 'Ja' })
      if (lease.berijder.voogdNaam) {
        regels.push({ label: 'Ouder/voogd', waarde: lease.berijder.voogdNaam })
      }
    }
    secties.push({ titel: 'Berijder', regels })
  }

  // ── Koop ── (eerste recht van koop / koopoptie)
  {
    const k = lease.koop
    const koopoptieVorm = leaseType ? kentKoopoptie(leaseType) : k.koopoptie
    const regels: PdfRegel[] = []
    if (koopoptieVorm && k.koopoptie) {
      regels.push({ label: 'Koopoptie', waarde: 'Ja' })
      if (k.koopprijs) {
        regels.push({ label: 'Koopprijs', waarde: k.koopprijs })
      }
    }
    if (k.eersteRechtVanKoop) {
      regels.push({ label: 'Eerste recht van koop', waarde: 'Ja' })
    }
    if (regels.length > 0) {
      secties.push({
        titel: koopoptieVorm ? 'Koopoptie' : 'Eerste recht van koop',
        regels,
      })
    }
  }

  // ── Bijzonderheden ── (alleen wanneer ingevuld)
  if (lease.bijzonderheden) {
    secties.push({
      titel: 'Bijzonderheden',
      regels: [{ label: 'Bijzonderheden', waarde: lease.bijzonderheden }],
    })
  }

  // ── Bijlagen (STAL-16) ── (alleen wanneer er bijlagen gekoppeld zijn)
  const bijlagen = contract.bijlagen ?? []
  if (bijlagen.length > 0) {
    secties.push({
      titel: 'Bijlagen',
      regels: bijlagen.map((b) => ({
        label: bijlageCategorieLabel(b.categorie),
        waarde: b.bestandsnaam,
      })),
    })
  }

  return {
    titel: 'Lease-overeenkomst',
    family: 'LEASE',
    versie: contract.currentVersion,
    generatieDatum: formatDatumNL(vandaag),
    partijen: {
      stalNaam: context.stalNaam,
      stalAdres: context.stalAdres,
      eigenaarNaam: context.eigenaarNaam,
      paardNaam: context.paardNaam,
      ingangsdatum: contract.startDate ? formatDatumNL(contract.startDate) : null,
      leaserNaam: context.leaserNaam ?? null,
      // De voogd komt uit de lease-config (berijder.voogdNaam), alleen bij een
      // minderjarige berijder.
      voogdNaam:
        lease.berijder.minderjarig && lease.berijder.voogdNaam
          ? lease.berijder.voogdNaam
          : null,
    },
    secties,
    stalLogoDataUrl: context.stalLogoDataUrl ?? null,
    paardFotoDataUrl: context.paardFotoDataUrl ?? null,
  }
}
