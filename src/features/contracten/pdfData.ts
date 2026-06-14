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
import { leesGezondheidsplicht, vaccinatieSoortLabel } from './gezondheidsplicht'
import { heeftBerijder, leesBerijder } from './berijder'
import {
  bijlageCategorieLabel,
  formatExtraDienstBedrag,
  frequentieLabel,
  leesExtraDiensten,
} from './bijlagenDiensten'

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
  eigenaarNaam: string
  paardNaam: string
  ingangsdatum: string | null
}

// Het volledige, gerenderde model van de PDF.
export type ContractPdfData = {
  titel: string
  versie: number
  generatieDatum: string
  partijen: PdfPartijen
  secties: PdfSectie[]
}

// Minimale contract-vorm die de databouw nodig heeft. Werkt zowel met een uit de
// DB geladen Contract als met een in-memory concept (preview).
export type PdfContractInput = {
  currentVersion: number
  startDate: Date | null
  config: Prisma.JsonValue | null
  // Door de stal aangeleverde bijlagen (STAL-16). Hier alleen de namen + categorie
  // (geen bestanden): de PDF toont enkel een overzicht van wat er gekoppeld is.
  bijlagen?: { categorie: string; bestandsnaam: string }[]
}

export type PdfContextInput = {
  stalNaam: string
  stalAdres: string | null
  eigenaarNaam: string
  paardNaam: string
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
export function bouwContractPdfData(
  contract: PdfContractInput,
  context: PdfContextInput,
  vandaag: Date = new Date(),
): ContractPdfData {
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
    versie: contract.currentVersion,
    generatieDatum: formatDatumNL(vandaag),
    partijen: {
      stalNaam: context.stalNaam,
      stalAdres: context.stalAdres,
      eigenaarNaam: context.eigenaarNaam,
      paardNaam: context.paardNaam,
      ingangsdatum: contract.startDate ? formatDatumNL(contract.startDate) : null,
    },
    secties,
  }
}
