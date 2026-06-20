'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getStableRole } from '@/lib/auth/authorization'
import { BOXTYPE_LABELS, type Boxtype, type HuisvestingConfig } from './huisvesting'
import {
  FACILITEIT_OPTIES,
  WEIDEGANG_VORM_LABELS,
  type DienstpakketConfig,
  type Faciliteit,
  type WeidegangVorm,
} from './dienstpakket'
import {
  BTW_MODUS_LABELS,
  LOOPTIJD_AARD_LABELS,
  OPZEGTERMIJN_EENHEID_LABELS,
  VERLENGING_LABELS,
  INDEXERING_MOMENT_LABELS,
  DEFAULT_OPZEGTERMIJN,
  type BtwModus,
  type LooptijdAard,
  type OpzegtermijnEenheid,
  type Verlenging,
  type IndexeringMoment,
  type PrijsLooptijdConfig,
} from './prijsLooptijd'
import type { VerzekeringAansprakelijkheidConfig } from './verzekeringAansprakelijkheid'
import {
  VACCINATIE_SOORT_OPTIES,
  type GezondheidsplichtConfig,
  type VaccinatieSoort,
} from './gezondheidsplicht'
import type { BerijderConfig } from './berijder'
import {
  BIJLAGE_CATEGORIE_OPTIES,
  isFrequentie,
  type BijlagenConfig,
  type ExtraDienst,
  type ExtraDienstenConfig,
  type Frequentie,
} from './bijlagenDiensten'
import {
  getSignedUrlVoorBijlage,
  heeftStalreglementBijlage,
  slaBijlageOp,
  verwijderBijlage,
} from './bijlagenStorage'
import {
  assertOvergangToegestaan,
  leesStatusHistorie,
  leesVersieGroepId,
} from './statusMachine'
import {
  huidigeEinddatum,
  leesVerlengBevestiging,
  leesVerlengHistorie,
  moetStilzwijgendVerlengen,
  verlengingsModus,
  volgendeEinddatum,
  type VerlengingEntry,
} from './verlenging'
import {
  berekenOpzegEinddatum,
  leesOpzegging,
  opschortEinddatumVerstreken,
  opzegEinddatumVerstreken,
  leesPrijsverlagingen,
} from './beeindiging'
import {
  ontbrekendeAanbiedVelden,
  ontbrekendeVeldenSamenvatting,
} from './aanbiedValidatie'
import {
  genereerEnSlaContractPdfOp,
  getSignedUrlVoorContract,
  renderContractPdfBuffer,
} from './pdf'
import { getStableLogoDataUrl } from '@/features/stal/logoStorage'
import { getPaardFotoDataUrl } from '@/features/paarden/paardFotoStorage'
import { bepaalContractPoort } from './relatietypeMatching'
import { LEASE_TYPE_LABELS } from '../lease/leaseHelpers'
import {
  kentDagenPerWeek,
  kentKoopoptie,
  leesLeaseContractConfig,
  leesLeaseOndertekening,
  isLeaseVolledigOndertekend,
  type LeaseContractStepperConfig,
} from './leaseContract'
import {
  KOSTENPOSTEN,
  type Betaler,
  type KostenPost,
  type LeaseKosten,
} from '../lease/leaseKostenConfig'
import {
  leesVerzekering,
  magActiverenVerzekering,
  type LeaseVerzekering,
  type Meeverzekerd,
} from '../lease/leaseVerzekeringConfig'
import type { ContractStatus, LeaseType, Prisma } from '@prisma/client'

// Leest de huisvesting-opties (STAL-03) uit het formulier. Onbekende boxtypes
// vallen terug op null; lege tekstvelden worden genormaliseerd naar null.
function leesHuisvestingForm(formData: FormData): HuisvestingConfig {
  const boxtypeRaw = (formData.get('boxtype') as string)?.trim()
  const boxtype: Boxtype | null =
    boxtypeRaw && boxtypeRaw in BOXTYPE_LABELS ? (boxtypeRaw as Boxtype) : null
  const boxNumber = (formData.get('boxNumber') as string)?.trim() || null
  const beddingtype = (formData.get('beddingtype') as string)?.trim() || null
  const toezicht = (formData.get('toezicht') as string)?.trim() || null

  return {
    boxtype,
    boxNumber,
    uitmesten: formData.get('uitmesten') === 'true',
    opstrooien: formData.get('opstrooien') === 'true',
    beddingtype,
    toezicht,
  }
}

// Leest het dienstpakket (voer & verzorging, weidegang, faciliteiten — STAL-04)
// uit het formulier. Lege tekstvelden worden genormaliseerd naar null; onbekende
// keuzes vallen terug op null. Voervelden worden los van het FeedingPlan bewaard.
function leesDienstpakketForm(formData: FormData): DienstpakketConfig {
  const ruwvoer = (formData.get('voerRuwvoer') as string)?.trim() || null
  const krachtvoer = (formData.get('voerKrachtvoer') as string)?.trim() || null

  const vormRaw = (formData.get('weidegangVorm') as string)?.trim()
  const vorm: WeidegangVorm | null =
    vormRaw && vormRaw in WEIDEGANG_VORM_LABELS ? (vormRaw as WeidegangVorm) : null
  const urenPerDag = (formData.get('weidegangUren') as string)?.trim() || null
  const seizoen = (formData.get('weidegangSeizoen') as string)?.trim() || null

  // Faciliteiten als checkbox-set; alleen bekende opties, in canonieke volgorde.
  const aangevinkt = new Set(formData.getAll('faciliteiten').map((v) => String(v)))
  const geselecteerd: Faciliteit[] = FACILITEIT_OPTIES.filter((f) => aangevinkt.has(f))

  return {
    voer: { ruwvoer, krachtvoer },
    weidegang: {
      actief: formData.get('weidegangActief') === 'true',
      vorm,
      urenPerDag,
      seizoen,
    },
    faciliteiten: { geselecteerd },
  }
}

// Hulp: leest een niet-negatief bedrag/getal uit het formulier. Lege invoer -> null.
// Gooit een fout bij negatieve of onleesbare waarden (server-side validatie).
function leesNietNegatiefGetal(value: FormDataEntryValue | null, label: string): number | null {
  const raw = (value as string)?.trim()
  if (!raw) return null
  const n = Number(raw.replace(',', '.'))
  if (!Number.isFinite(n)) {
    throw new Error(`${label} moet een geldig getal zijn.`)
  }
  if (n < 0) {
    throw new Error(`${label} mag niet negatief zijn.`)
  }
  return n
}

// Leest prijs, borg & looptijd (STAL-05) uit het formulier en valideert server-side.
// De gegevens worden onder config.prijsLooptijd bewaard. Gooit bij overtreding van
// een acceptatiecriterium een fout (opslaan wordt geweigerd).
function leesPrijsLooptijdForm(formData: FormData): PrijsLooptijdConfig {
  // ── Prijs ──
  const bedrag = leesNietNegatiefGetal(formData.get('prijsBedrag'), 'De pensionprijs')
  const btwModusRaw = (formData.get('prijsBtwModus') as string)?.trim()
  const btwModus: BtwModus =
    btwModusRaw && btwModusRaw in BTW_MODUS_LABELS ? (btwModusRaw as BtwModus) : 'INCL'
  const btwPercentage = leesNietNegatiefGetal(
    formData.get('prijsBtwPercentage'),
    'Het btw-percentage',
  )

  // ── Borg ──
  const borgActief = formData.get('borgActief') === 'true'
  const borgBedrag = leesNietNegatiefGetal(formData.get('borgBedrag'), 'Het borgbedrag')
  if (borgActief && borgBedrag === null) {
    throw new Error('Vul een borgbedrag in wanneer borg is ingeschakeld.')
  }

  // ── Looptijd ──
  const aardRaw = (formData.get('looptijdAard') as string)?.trim()
  const aard: LooptijdAard =
    aardRaw && aardRaw in LOOPTIJD_AARD_LABELS ? (aardRaw as LooptijdAard) : 'ONBEPAALD'

  const einddatum = (formData.get('looptijdEinddatum') as string)?.trim() || null
  if (aard === 'BEPAALD' && !einddatum) {
    throw new Error('Vul een einddatum in bij een contract voor bepaalde tijd.')
  }

  const minimumperiode = (formData.get('looptijdMinimumperiode') as string)?.trim() || null

  const opzegWaardeRaw = leesNietNegatiefGetal(
    formData.get('opzegtermijnWaarde'),
    'De opzegtermijn',
  )
  const opzegEenheidRaw = (formData.get('opzegtermijnEenheid') as string)?.trim()
  const opzegEenheid: OpzegtermijnEenheid =
    opzegEenheidRaw && opzegEenheidRaw in OPZEGTERMIJN_EENHEID_LABELS
      ? (opzegEenheidRaw as OpzegtermijnEenheid)
      : DEFAULT_OPZEGTERMIJN.eenheid
  const opzegtermijn = {
    waarde: opzegWaardeRaw ?? DEFAULT_OPZEGTERMIJN.waarde,
    eenheid: opzegEenheid,
    schriftelijk: formData.get('opzegtermijnSchriftelijk') !== 'false',
  }

  const verlengingRaw = (formData.get('looptijdVerlenging') as string)?.trim()
  const verlenging: Verlenging =
    verlengingRaw && verlengingRaw in VERLENGING_LABELS
      ? (verlengingRaw as Verlenging)
      : 'STILZWIJGEND'

  const proefActief = formData.get('proefperiodeActief') === 'true'
  const proefDuur = (formData.get('proefperiodeDuur') as string)?.trim() || null

  const indexActief = formData.get('indexeringActief') === 'true'
  const indexGrondslag = (formData.get('indexeringGrondslag') as string)?.trim() || null
  const indexMomentRaw = (formData.get('indexeringMoment') as string)?.trim()
  const indexMoment: IndexeringMoment | null =
    indexMomentRaw && indexMomentRaw in INDEXERING_MOMENT_LABELS
      ? (indexMomentRaw as IndexeringMoment)
      : null

  return {
    prijs: {
      bedrag,
      btwModus,
      btwPercentage: btwPercentage ?? 21,
    },
    borg: {
      actief: borgActief,
      bedrag: borgActief ? borgBedrag : null,
    },
    looptijd: {
      aard,
      einddatum: aard === 'BEPAALD' ? einddatum : null,
      minimumperiode,
      opzegtermijn,
      verlenging,
      proefperiode: { actief: proefActief, duur: proefActief ? proefDuur : null },
      indexering: {
        actief: indexActief,
        grondslag: indexActief ? indexGrondslag : null,
        moment: indexActief ? indexMoment : null,
      },
    },
  }
}

// Leest het verzekerings- & aansprakelijkheidsblok (STAL-06) uit het formulier.
// De gegevens worden onder config.verzekeringAansprakelijkheid bewaard. Niet-
// verplichte velden mogen leeg blijven; de compleetheid van de verplichte velden
// wordt niet hier afgedwongen maar via de validatiehulp (poort in STAL-08 #81),
// zodat een onvolledig blok wél als concept opgeslagen kan worden.
function leesVerzekeringAansprakelijkheidForm(
  formData: FormData,
): VerzekeringAansprakelijkheidConfig {
  const polisnummer = (formData.get('verzPolisnummer') as string)?.trim() || null
  const verzekeraar = (formData.get('verzVerzekeraar') as string)?.trim() || null
  const bedrijfsmatigGebruikNotitie =
    (formData.get('aansprBedrijfsmatigNotitie') as string)?.trim() || null

  return {
    verzekering: {
      waVerzekeringEigenaar: formData.get('verzWaEigenaar') === 'true',
      polisnummer,
      verzekeraar,
      brandverzekeringPaard: formData.get('verzBrandPaard') === 'true',
      eigenaarVerzekertZelf: formData.get('verzEigenaarVerzekertZelf') === 'true',
    },
    aansprakelijkheid: {
      risicoAcceptatieEigenaar: formData.get('aansprRisicoAcceptatie') === 'true',
      bezitterAansprakelijkheid: formData.get('aansprBezitter') === 'true',
      bedrijfsmatigGebruikNotitie,
      zorgplichtStal: formData.get('aansprZorgplichtStal') === 'true',
      aansprakelijkheidStalBeperkt: formData.get('aansprStalBeperkt') === 'true',
    },
  }
}

// Leest de entings- & gezondheidsplicht (STAL-07) uit het formulier en valideert
// server-side. De gegevens worden onder config.gezondheidsplicht bewaard. Lege/
// uitgeschakelde onderdelen worden genormaliseerd opgeslagen (vlag uit -> bijbehorende
// detailvelden null). Gooit bij ongeldige invoer een fout (opslaan wordt geweigerd).
function leesGezondheidsplichtForm(formData: FormData): GezondheidsplichtConfig {
  // ── Vaccinatieplicht ──
  const vaccinatieActief = formData.get('vaccinatieActief') === 'true'
  const aangevinkteSoorten = new Set(
    formData.getAll('vaccinatieSoorten').map((v) => String(v)),
  )
  const soorten: VaccinatieSoort[] = VACCINATIE_SOORT_OPTIES.filter((s) =>
    aangevinkteSoorten.has(s),
  )
  const vaccinatieInterval = leesNietNegatiefGetal(
    formData.get('vaccinatieInterval'),
    'Het vaccinatie-interval',
  )

  // ── Ontworming / mestonderzoek ──
  const ontwormingActief = formData.get('ontwormingActief') === 'true'
  const ontwormingBeleid = (formData.get('ontwormingBeleid') as string)?.trim() || null
  const ontwormingInterval = leesNietNegatiefGetal(
    formData.get('ontwormingInterval'),
    'Het ontwormings-interval',
  )

  // ── Hoefsmid ──
  const hoefsmidActief = formData.get('hoefsmidActief') === 'true'
  const hoefsmidInterval = leesNietNegatiefGetal(
    formData.get('hoefsmidInterval'),
    'Het hoefsmid-interval',
  )

  // ── Dierenarts-drempel ──
  const drempelActief = formData.get('dierenartsDrempelActief') === 'true'
  const drempelBedrag = leesNietNegatiefGetal(
    formData.get('dierenartsDrempelBedrag'),
    'De dierenarts-drempel',
  )
  const meldingsplichtEigenaar = formData.get('dierenartsMeldingsplicht') === 'true'

  return {
    vaccinatie: {
      actief: vaccinatieActief,
      soorten: vaccinatieActief ? soorten : [],
      intervalMaanden: vaccinatieActief ? vaccinatieInterval : null,
    },
    ontworming: {
      actief: ontwormingActief,
      beleid: ontwormingActief ? ontwormingBeleid : null,
      intervalMaanden: ontwormingActief ? ontwormingInterval : null,
    },
    hoefsmid: {
      actief: hoefsmidActief,
      intervalWeken: hoefsmidActief ? hoefsmidInterval : null,
    },
    dierenartsDrempel: {
      actief: drempelActief,
      bedrag: drempelActief ? drempelBedrag : null,
      meldingsplichtEigenaar: drempelActief ? meldingsplichtEigenaar : false,
    },
  }
}

// Leest het berijder-blok (STAL-10) uit het formulier. De gegevens worden onder
// config.berijder bewaard. Dit blok is volledig optioneel: een lege naam betekent
// "geen berijder vastgelegd" en de detailvelden worden dan genormaliseerd naar null.
function leesBerijderForm(formData: FormData): BerijderConfig {
  const naam = (formData.get('berijderNaam') as string)?.trim() || null
  const geboortedatum = (formData.get('berijderGeboortedatum') as string)?.trim() || null
  const relatieTotEigenaar =
    (formData.get('berijderRelatie') as string)?.trim() || null

  // Zonder naam beschouwen we het blok als leeg en bewaren we geen detailvelden.
  if (!naam) {
    return { naam: null, geboortedatum: null, relatieTotEigenaar: null }
  }

  return { naam, geboortedatum, relatieTotEigenaar }
}

// Leest de bijlagen-instellingen (STAL-16) uit het formulier. Voorlopig één
// instelling: of een stalreglement-bijlage verplicht is voordat aangeboden mag worden.
function leesBijlagenConfigForm(formData: FormData): BijlagenConfig {
  return {
    stalreglementVerplicht: formData.get('stalreglementVerplicht') === 'true',
  }
}

// Leest de extra diensten / prijslijst (STAL-16) uit het formulier en valideert
// server-side. De posten komen als parallelle velden binnen (extraDienstOmschrijving[],
// extraDienstBedrag[], extraDienstFrequentie[]). Een post met een omschrijving óf een
// bedrag moet beide gevuld hebben; volledig lege posten worden genegeerd. Gooit bij een
// onvolledige post een fout (opslaan wordt geweigerd).
function leesExtraDienstenForm(formData: FormData): ExtraDienstenConfig {
  const omschrijvingen = formData.getAll('extraDienstOmschrijving').map((v) => String(v))
  const bedragen = formData.getAll('extraDienstBedrag').map((v) => String(v))
  const frequenties = formData.getAll('extraDienstFrequentie').map((v) => String(v))

  const aantal = Math.max(omschrijvingen.length, bedragen.length, frequenties.length)
  const posten: ExtraDienst[] = []

  for (let i = 0; i < aantal; i++) {
    const omschrijving = (omschrijvingen[i] ?? '').trim()
    const bedragRaw = (bedragen[i] ?? '').trim()
    const frequentieRaw = (frequenties[i] ?? '').trim()

    // Volledig lege regel: overslaan (toegevoegde maar niet ingevulde rij).
    if (!omschrijving && !bedragRaw) continue

    if (!omschrijving) {
      throw new Error('Vul een omschrijving in voor elke post in de prijslijst.')
    }
    const bedrag = leesNietNegatiefGetal(bedragRaw, 'Het bedrag van een prijslijst-post')
    if (bedrag === null) {
      throw new Error('Vul een bedrag in voor elke post in de prijslijst.')
    }
    const frequentie: Frequentie = isFrequentie(frequentieRaw)
      ? frequentieRaw
      : 'PER_MAAND'
    posten.push({ omschrijving, bedrag, frequentie })
  }

  return { posten }
}

// Autorisatie: alleen OWNER/STAFF van de stal van het paard mag contracten van dat
// paard aanmaken. Server-side afgedwongen — paardeigenaren worden geweigerd.
async function getAuthorizedStaff(horseId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const horse = await prisma.horse.findUnique({ where: { id: horseId } })
  if (!horse) throw new Error('Paard niet gevonden')

  const role = await getStableRole(user.id, horse.stableId)
  if (!role) throw new Error('Geen toegang')

  return { user, horse, role }
}

// Maakt een concept-stallingscontract aan op een paard. family=STALLING,
// status=CONCEPT, currentVersion=1. Het type volgt de stallingsvorm van het paard
// (#113): volledig pension → FULL_PENSION, halfpension → HALF_PENSION. De poort
// (relatietype + stallingsvorm + eigenaar) wordt hier server-side afgedwongen, zodat
// een directe aanroep zonder geldige combinatie wordt geweigerd.
export async function createStallingContract(horseId: string, formData: FormData) {
  const { horse } = await getAuthorizedStaff(horseId)

  const counterpartyUserId = (formData.get('counterpartyUserId') as string)?.trim()
  const startDateStr = (formData.get('startDate') as string)?.trim()

  if (!counterpartyUserId) {
    throw new Error('Kies een wederpartij (paardeigenaar).')
  }

  // De wederpartij moet een eigenaar van dit paard zijn.
  const ownerLink = await prisma.horsePerson.findUnique({
    where: { horseId_userId: { horseId, userId: counterpartyUserId } },
  })
  if (!ownerLink || !ownerLink.isOwner) {
    throw new Error('De gekozen wederpartij is geen eigenaar van dit paard.')
  }

  // Poort (#113): relatietype + stallingsvorm bepalen of én welk contract er mag
  // worden gemaakt. De eigenaar-eis is hierboven al geborgd (wederpartij = eigenaar).
  const poort = bepaalContractPoort({
    relatietype: horse.relatietype,
    stallingsvorm: horse.stallingsvorm,
    heeftEigenaar: true,
  })
  if (!poort.toegestaan) {
    throw new Error(poort.reden)
  }

  await prisma.contract.create({
    data: {
      horseId,
      stableId: horse.stableId,
      family: poort.voorselectie.family,
      type: poort.voorselectie.type,
      status: 'CONCEPT',
      currentVersion: 1,
      counterpartyUserId,
      startDate: startDateStr ? new Date(startDateStr) : null,
    },
  })

  revalidatePath(`/paarden/${horseId}`)
  redirect(`/paarden/${horseId}?tab=contracten`)
}

// Haalt een contract op en dwingt af dat het bij het opgegeven paard hoort, dat de
// huidige gebruiker OWNER/STAFF van de stal is, én dat het contract status CONCEPT
// heeft. Bewerken/verwijderen mag uitsluitend bij CONCEPT — server-side afgedwongen.
async function getEditableConceptContract(horseId: string, contractId: string) {
  const { horse } = await getAuthorizedStaff(horseId)

  const contract = await prisma.contract.findUnique({ where: { id: contractId } })
  if (!contract || contract.horseId !== horseId) {
    throw new Error('Contract niet gevonden')
  }
  if (contract.status !== 'CONCEPT') {
    throw new Error('Alleen een concept-contract kan worden bewerkt of verwijderd.')
  }

  return { horse, contract }
}

// Werkt de basisvelden (wederpartij + ingangsdatum) van een concept-contract bij.
export async function updateStallingContract(
  horseId: string,
  contractId: string,
  formData: FormData,
) {
  const { contract } = await getEditableConceptContract(horseId, contractId)

  const counterpartyUserId = (formData.get('counterpartyUserId') as string)?.trim()
  const startDateStr = (formData.get('startDate') as string)?.trim()

  if (!counterpartyUserId) {
    throw new Error('Kies een wederpartij (paardeigenaar).')
  }

  // De wederpartij moet een eigenaar van dit paard zijn.
  const ownerLink = await prisma.horsePerson.findUnique({
    where: { horseId_userId: { horseId, userId: counterpartyUserId } },
  })
  if (!ownerLink || !ownerLink.isOwner) {
    throw new Error('De gekozen wederpartij is geen eigenaar van dit paard.')
  }

  // Huisvesting-opties (STAL-03) en het dienstpakket (voer/weidegang/faciliteiten,
  // STAL-04) als JSON-blokken onder config bewaren. Bestaande config-sleutels van
  // andere stories blijven behouden.
  const huisvesting = leesHuisvestingForm(formData)
  const dienstpakket = leesDienstpakketForm(formData)
  // Prijs, borg & looptijd (STAL-05) — server-side gevalideerd in de reader.
  const prijsLooptijd = leesPrijsLooptijdForm(formData)
  // Verzekering & aansprakelijkheid (STAL-06). Optionele velden mogen leeg blijven;
  // de compleetheid van de verplichte velden is een poort bij aanbieden (STAL-08).
  const verzekeringAansprakelijkheid = leesVerzekeringAansprakelijkheidForm(formData)
  // Entings- & gezondheidsplicht (STAL-07) — server-side gevalideerd in de reader.
  const gezondheidsplicht = leesGezondheidsplichtForm(formData)
  // Berijder (STAL-10) — optioneel optieblok, blokkeert het aanbieden niet.
  const berijder = leesBerijderForm(formData)
  // Bijlagen-instelling + extra diensten/prijslijst (STAL-16). De bijlage-bestanden
  // zelf lopen via aparte upload-/verwijder-acties (ContractBijlage); hier bewaren we
  // enkel de "stalreglement verplicht"-instelling en de prijslijst als config-data.
  const bijlagen = leesBijlagenConfigForm(formData)
  const extraDiensten = leesExtraDienstenForm(formData)
  const bestaandeConfig =
    contract.config && typeof contract.config === 'object' && !Array.isArray(contract.config)
      ? (contract.config as Record<string, unknown>)
      : {}
  const nieuweConfig = {
    ...bestaandeConfig,
    huisvesting,
    voer: dienstpakket.voer,
    weidegang: dienstpakket.weidegang,
    faciliteiten: dienstpakket.faciliteiten.geselecteerd,
    prijsLooptijd,
    verzekeringAansprakelijkheid,
    gezondheidsplicht,
    berijder,
    bijlagen,
    extraDiensten,
  }

  await prisma.contract.update({
    where: { id: contractId },
    data: {
      counterpartyUserId,
      startDate: startDateStr ? new Date(startDateStr) : null,
      config: nieuweConfig,
    },
  })

  revalidatePath(`/paarden/${horseId}`)
  redirect(`/paarden/${horseId}?tab=contracten`)
}

// Verwijdert een concept-contract definitief.
export async function deleteStallingContract(horseId: string, contractId: string) {
  await getEditableConceptContract(horseId, contractId)

  await prisma.contract.delete({ where: { id: contractId } })

  revalidatePath(`/paarden/${horseId}`)
}

// ── Lease-contractflow via de stepper ([Unify 04] #130) ──────────────────────
// Lease is sinds het contract-unify-epic (#126) een volwaardige contractfamilie.
// De lease-flow spiegelt de stalling-flow: een concept-Contract (family=LEASE,
// type=leasevorm) wordt aangemaakt en daarna via dezelfde stepper-UX ingevuld. De
// rijke leasevelden worden onder config.lease bewaard (leaseContract.ts). In deze
// story wordt nog GEEN Lease-rij gemaakt — dat gebeurt pas bij activatie (#132).
// Kosten/verzekering vallen buiten deze story (#131).

// Valideert een leasevorm-string tegen de LeaseType-enum (bron: LEASE_TYPE_LABELS).
function leesLeaseType(value: unknown): LeaseType {
  const raw = typeof value === 'string' ? value.trim() : ''
  if (raw && raw in LEASE_TYPE_LABELS) return raw as LeaseType
  throw new Error('Onbekende leasevorm.')
}

// Leest het Kosten-blok ([Unify 05] #131) uit het formulier. Datavorm spiegelt
// LeaseKosten (leaseKostenConfig.ts) zodat #132/#134 het 1:1 op de Lease kunnen
// projecteren. Per kostenpost: betaler (eigenaar/leaser), bedrag p/m en de
// onvoorzien-vlag; plus de leasevergoeding (excl. btw) met 21%-btw-toggle. Bedragen
// worden server-side gevalideerd (niet-negatief). Lege bedragen mogen — de
// compleetheid is een poort bij aanbieden, niet bij opslaan.
function leesLeaseKostenForm(formData: FormData): LeaseKosten {
  const posten: Record<string, KostenPost> = {}
  for (const def of KOSTENPOSTEN) {
    const betaler: Betaler =
      formData.get(`betaler_${def.key}`) === 'LEASER' ? 'LEASER' : 'EIGENAAR'
    const bedrag = leesNietNegatiefGetal(
      formData.get(`bedrag_${def.key}`),
      `Het bedrag voor ${def.label}`,
    )
    posten[def.key] = {
      betaler,
      bedrag,
      onvoorzien: formData.get(`onvoorzien_${def.key}`) === 'true',
    }
  }

  return {
    vergoeding: leesNietNegatiefGetal(
      formData.get('leaseVergoeding'),
      'De leasevergoeding',
    ),
    btw: formData.get('leaseBtw') === 'true',
    posten,
  }
}

// Leest het Verzekering & aansprakelijkheid-blok ([Unify 05] #131) uit het
// formulier. Datavorm spiegelt LeaseVerzekering (leaseVerzekeringConfig.ts); de
// gate-helper magActiverenVerzekering bepaalt of de lease activeerbaar is. De polis
// loopt via het bijlagen-mechanisme (categorie VERZEKERINGSPOLIS), dus het
// `polissen`-veld blijft hier leeg.
function leesLeaseVerzekeringForm(formData: FormData): LeaseVerzekering {
  const meeverzekerdRaw = (formData.get('meeverzekerd') as string)?.trim()
  const meeverzekerd: Meeverzekerd | null =
    meeverzekerdRaw === 'JA' ? 'JA' : meeverzekerdRaw === 'NEE' ? 'NEE' : null

  return {
    meeverzekerd,
    risicoAcceptatie: formData.get('risicoAcceptatie') === 'true',
    dekkingOngevallen: formData.get('dekkingOngevallen') === 'true',
    risicoBevestigd: formData.get('risicoBevestigd') === 'true',
    polissen: [],
  }
}

// Leest de lease-contractinhoud uit het formulier en valideert server-side. De
// leasevorm bepaalt welke velden van toepassing zijn (dagen/week bij deellease,
// koopoptie bij KOOPOPTIE-lease); niet-toepasselijke velden worden genormaliseerd
// naar de standaard. Lege velden mogen — de compleetheid van de verplichte velden
// is een poort bij aanbieden, niet bij opslaan (zoals bij stalling).
function leesLeaseContractForm(
  formData: FormData,
  leaseType: LeaseType,
): LeaseContractStepperConfig {
  const gebruiksrecht = (formData.get('gebruiksrecht') as string)?.trim() || null
  const disciplines = (formData.get('disciplines') as string)?.trim() || null
  const dagenPerWeek = kentDagenPerWeek(leaseType)
    ? leesNietNegatiefGetal(formData.get('dagenPerWeek'), 'Het aantal dagen per week')
    : null

  // Kosten ([Unify 05] #131): gestructureerde kostenverdeling per post + de
  // leasevergoeding (excl. btw) met 21%-btw-toggle. Vervangt het vrije-tekstveld
  // `leasevergoeding` van #130. Datavorm spiegelt LeaseKosten (leaseKostenConfig.ts).
  const kosten = leesLeaseKostenForm(formData)
  // Verzekering & aansprakelijkheid 6:179 BW ([Unify 05] #131). Datavorm spiegelt
  // LeaseVerzekering; de polis loopt via het bijlagen-mechanisme, dus `polissen` blijft leeg.
  const verzekering = leesLeaseVerzekeringForm(formData)

  const einddatum = (formData.get('looptijdEinddatum') as string)?.trim() || null
  const minimumTermijnMaanden = leesNietNegatiefGetal(
    formData.get('minimumTermijnMaanden'),
    'De minimale looptijd',
  )
  const opzegtermijnDagen = leesNietNegatiefGetal(
    formData.get('opzegtermijnDagen'),
    'De opzegtermijn',
  )
  const proefActief = formData.get('proefActief') === 'true'
  const proefEinddatum = (formData.get('proefEinddatum') as string)?.trim() || null

  const berijderNaam = (formData.get('berijderNaam') as string)?.trim() || null
  const berijderGeboortedatum =
    (formData.get('berijderGeboortedatum') as string)?.trim() || null
  const minderjarig = formData.get('berijderMinderjarig') === 'true'
  const voogdNaam = (formData.get('voogdNaam') as string)?.trim() || null

  // Koopoptie is alleen een eigen blok bij een KOOPOPTIE-lease; bij andere vormen
  // telt enkel het optionele "eerste recht van koop".
  const koopoptie = kentKoopoptie(leaseType) && formData.get('koopoptie') === 'true'
  const koopprijs = koopoptie ? (formData.get('koopprijs') as string)?.trim() || null : null
  const eersteRechtVanKoop = formData.get('eersteRechtVanKoop') === 'true'

  const bijzonderheden = (formData.get('bijzonderheden') as string)?.trim() || null

  return {
    gebruiksrecht,
    disciplines,
    dagenPerWeek,
    kosten,
    verzekering,
    looptijd: {
      einddatum,
      minimumTermijnMaanden,
      opzegtermijnDagen,
      proefperiode: {
        actief: proefActief,
        einddatum: proefActief ? proefEinddatum : null,
      },
    },
    berijder: {
      naam: berijderNaam,
      geboortedatum: berijderGeboortedatum,
      minderjarig,
      voogdNaam: minderjarig ? voogdNaam : null,
    },
    koop: {
      eersteRechtVanKoop,
      koopoptie,
      koopprijs,
    },
    bijzonderheden,
  }
}

// Maakt een concept-leasecontract aan op een paard. family=LEASE, type=leasevorm,
// status=CONCEPT, currentVersion=1. De poort (eigenaar gekoppeld) wordt hier
// server-side afgedwongen, zodat een directe aanroep zonder eigenaar wordt geweigerd.
// Spiegelt createStallingContract; de wederpartij (leaser) wordt in de opstel-flow
// gekozen, dus hier nog niet vereist.
export async function createLeaseContract(
  horseId: string,
  leaseTypeRaw: string,
): Promise<string> {
  const { horse } = await getAuthorizedStaff(horseId)
  const leaseType = leesLeaseType(leaseTypeRaw)

  // Lease-poort ([Unify 03] #129): een leasecontract kan pas worden aangemaakt wanneer
  // er een eigenaar aan het paard gekoppeld is (de leaser wordt pas in de opstel-flow
  // gekozen). Geen relatietype- of listing-eis.
  const heeftEigenaar = await prisma.horsePerson.count({
    where: { horseId, isOwner: true },
  })
  if (heeftEigenaar === 0) {
    throw new Error('Koppel eerst een eigenaar aan het paard.')
  }

  const contract = await prisma.contract.create({
    data: {
      horseId,
      stableId: horse.stableId,
      family: 'LEASE',
      type: leaseType,
      status: 'CONCEPT',
      currentVersion: 1,
    },
  })

  revalidatePath(`/paarden/${horseId}`)
  return contract.id
}

// Werkt de basis- en inhoudelijke velden van een concept-leasecontract bij. Bewaart
// de leasevelden onder config.lease (bestaande config-sleutels blijven behouden).
export async function updateLeaseContract(
  horseId: string,
  contractId: string,
  formData: FormData,
) {
  const { contract } = await getEditableConceptContract(horseId, contractId)
  if (contract.family !== 'LEASE') {
    throw new Error('Dit is geen leasecontract.')
  }
  const leaseType = leesLeaseType(contract.type)

  const counterpartyUserId = (formData.get('counterpartyUserId') as string)?.trim()
  const startDateStr = (formData.get('startDate') as string)?.trim()

  if (!counterpartyUserId) {
    throw new Error('Kies een wederpartij (paardeigenaar).')
  }

  // De wederpartij moet een eigenaar van dit paard zijn.
  const ownerLink = await prisma.horsePerson.findUnique({
    where: { horseId_userId: { horseId, userId: counterpartyUserId } },
  })
  if (!ownerLink || !ownerLink.isOwner) {
    throw new Error('De gekozen wederpartij is geen eigenaar van dit paard.')
  }

  const lease = leesLeaseContractForm(formData, leaseType)

  const bestaandeConfig =
    contract.config && typeof contract.config === 'object' && !Array.isArray(contract.config)
      ? (contract.config as Record<string, unknown>)
      : {}
  const nieuweConfig = {
    ...bestaandeConfig,
    lease,
  }

  await prisma.contract.update({
    where: { id: contractId },
    data: {
      counterpartyUserId,
      startDate: startDateStr ? new Date(startDateStr) : null,
      config: nieuweConfig,
    },
  })

  revalidatePath(`/paarden/${horseId}`)
  redirect(`/paarden/${horseId}?tab=contracten`)
}

// ── Lease-ondertekening + activatie → 1:1 Lease ([Unify 06] #132) ────────────
// Scharnierpunt van het contract-unify-epic: hier ondertekenen de partijen (stal /
// leaser / voogd) een aangeboden leasecontract binnen de unified contractweergave,
// en bij volledige ondertekening ontstaat de operationele, ACTIEVE Lease (1:1 aan
// het Contract). Dit reproduceert de oude losse `signLease`-flow
// (features/lease/leaseActions.ts) maar dan familie-bewust op het Contract:
//   - per-partij autorisatie (stal = OWNER/STAFF; leaser/voogd = wederpartij);
//   - append-only ondertekening op Contract.config.lease.ondertekening;
//   - volledigheid via isLeaseVolledigOndertekend (= isVolledigOndertekend-regel);
//   - harde meeverzekerd-gate via magActiverenVerzekering (doorgeschoven uit #131);
//   - statusovergang AANGEBODEN → ACTIEF via de statusmachine;
//   - idempotente create/update van de 1:1 Lease (Lease.contractId @unique, #127).
// De stalling-flow (acceptContract, enkel-eigenaar) blijft hiernaast ongewijzigd.

// Projecteert de operationele Lease-velden uit het bron-Contract. Defensief/null-safe,
// conform de leesconventie van leaseContract.ts. `leaserUserId` = de wederpartij
// (Contract.counterpartyUserId); de termijnvelden komen uit config.lease.looptijd.
function projecteerLeaseVelden(contract: {
  type: string
  counterpartyUserId: string | null
  startDate: Date | null
  config: Prisma.JsonValue | null
}): {
  leaseType: LeaseType
  leaserUserId: string
  startDate: Date | null
  endDate: Date | null
  minimumTermMonths: number | null
  noticePeriodDays: number | null
  trialEndsAt: Date | null
  config: Prisma.InputJsonValue
} {
  if (!contract.counterpartyUserId) {
    throw new Error('Kies eerst een wederpartij (leaser) voordat de lease actief wordt.')
  }
  const leaseType = leesLeaseType(contract.type)
  const lease = leesLeaseContractConfig(contract.config)
  const { looptijd } = lease

  const datum = (s: string | null): Date | null => (s ? new Date(s) : null)

  return {
    leaseType,
    leaserUserId: contract.counterpartyUserId,
    startDate: contract.startDate,
    endDate: datum(looptijd.einddatum),
    minimumTermMonths: looptijd.minimumTermijnMaanden,
    noticePeriodDays: looptijd.opzegtermijnDagen,
    // Proefperiode-einddatum alleen wanneer de proefperiode actief is.
    trialEndsAt: looptijd.proefperiode.actief ? datum(looptijd.proefperiode.einddatum) : null,
    // Operationele lease-config voor kalender/mijlpalen: de volledige lease-config
    // (inclusief ondertekening) defensief geprojecteerd. Spiegelt Lease.config.
    config: lease as unknown as Prisma.InputJsonValue,
  }
}

// Onderteken het stal-/leaser-/voogd-blok van een aangeboden leasecontract. Bij
// volledige ondertekening + voldane meeverzekerd-gate gaat het contract ACTIEF en
// ontstaat (idempotent) de 1:1 Lease. Server-side afgedwongen per partij.
export async function signLeaseContract(
  horseId: string,
  contractId: string,
  partij: 'stal' | 'leaser' | 'voogd',
  formData: FormData,
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: { lease: { select: { id: true } } },
  })
  if (!contract || contract.horseId !== horseId) {
    throw new Error('Contract niet gevonden')
  }
  if (contract.family !== 'LEASE') {
    throw new Error('Dit is geen leasecontract.')
  }
  if (contract.status !== 'AANGEBODEN') {
    throw new Error('Alleen een aangeboden leasecontract kan worden ondertekend.')
  }

  // Per-partij autorisatie: het stal-blok mag uitsluitend door OWNER/STAFF van de
  // stal worden getekend; het leaser-/voogd-blok uitsluitend door de wederpartij
  // (Contract.counterpartyUserId). Server-side afgedwongen, niet alleen in de UI.
  const role = await getStableRole(user.id, contract.stableId)
  const isStal = role !== null
  const isWederpartij = contract.counterpartyUserId === user.id
  if (partij === 'stal' && !isStal) {
    throw new Error('Alleen de stal kan het stal-blok ondertekenen.')
  }
  if ((partij === 'leaser' || partij === 'voogd') && !isWederpartij) {
    throw new Error('Alleen de leaser kan dit blok ondertekenen.')
  }

  const naam = (formData.get('naam') as string)?.trim()
  if (!naam) throw new Error('Vul een naam in om te ondertekenen.')

  // Berijder-minderjarigheid bepaalt of het voogd-blok vereist is voor volledigheid.
  const leaseConfig = leesLeaseContractConfig(contract.config)
  const minderjarig = leaseConfig.berijder.minderjarig

  // Append-only: voeg de ondertekening van deze partij toe aan het bestaande blok.
  const ondertekening = leesLeaseOndertekening(contract.config)
  ondertekening[partij] = { naam, datum: new Date().toISOString() }
  const volledig = isLeaseVolledigOndertekend(ondertekening, minderjarig)

  // Harde meeverzekerd-gate (doorgeschoven uit #131): de lease mag pas ACTIEF worden
  // als de meeverzekerd-vraag met JA beantwoord is óf het risico expliciet bevestigd.
  if (volledig && !magActiverenVerzekering(leesVerzekering({ verzekeringBlok: leaseConfig.verzekering }))) {
    throw new Error(
      'Beantwoord eerst de meeverzekerd-vraag met "Ja" of bevestig het risico bij "Verzekering & aansprakelijkheid" voordat de lease actief wordt.',
    )
  }

  // Bestaande config behouden; alleen config.lease.ondertekening bijwerken.
  const rootConfig =
    contract.config && typeof contract.config === 'object' && !Array.isArray(contract.config)
      ? (contract.config as Record<string, unknown>)
      : {}
  const leaseRaw =
    rootConfig.lease && typeof rootConfig.lease === 'object' && !Array.isArray(rootConfig.lease)
      ? (rootConfig.lease as Record<string, unknown>)
      : {}

  if (!volledig) {
    // Nog niet volledig: enkel de ondertekening wegschrijven, status blijft AANGEBODEN.
    const nieuweConfig = {
      ...rootConfig,
      lease: { ...leaseRaw, ondertekening },
    }
    await prisma.contract.update({
      where: { id: contractId },
      data: { config: nieuweConfig as Prisma.InputJsonValue },
    })
    revalidatePath(`/paarden/${horseId}`)
    revalidatePath('/eigenaar')
    return
  }

  // Volledig ondertekend: AANGEBODEN → ACTIEF. Statusmachine borgt de overgang.
  assertOvergangToegestaan(contract.status, 'ACTIEF')

  const configMetOndertekening = {
    ...rootConfig,
    lease: { ...leaseRaw, ondertekening },
  }
  // Statusovergang ook append-only in config.statusHistorie vastleggen (zoals stalling).
  const nieuweConfig = {
    ...metStatusHistorie(
      configMetOndertekening as Prisma.JsonValue,
      contract.status,
      'ACTIEF',
      user.id,
    ),
  }

  const leaseVelden = projecteerLeaseVelden(contract)

  const horse = await prisma.horse.findUnique({
    where: { id: contract.horseId },
    select: { name: true },
  })

  // Transactie: statusovergang + idempotente Lease-create/-update + melding. Zo kan
  // een geactiveerd leasecontract nooit zonder gekoppelde Lease bestaan. De 1:1
  // @unique op Lease.contractId borgt dat opnieuw activeren geen tweede Lease oplevert.
  await prisma.$transaction(async (tx) => {
    await tx.contract.update({
      where: { id: contractId },
      data: { status: 'ACTIEF', config: nieuweConfig as Prisma.InputJsonValue },
    })

    const bestaandeLease = await tx.lease.findUnique({
      where: { contractId },
      select: { id: true },
    })
    if (bestaandeLease) {
      await tx.lease.update({
        where: { id: bestaandeLease.id },
        data: {
          horseId: contract.horseId,
          leaserUserId: leaseVelden.leaserUserId,
          leaseType: leaseVelden.leaseType,
          status: 'ACTIEF',
          startDate: leaseVelden.startDate,
          endDate: leaseVelden.endDate,
          minimumTermMonths: leaseVelden.minimumTermMonths,
          noticePeriodDays: leaseVelden.noticePeriodDays,
          trialEndsAt: leaseVelden.trialEndsAt,
          config: leaseVelden.config,
        },
      })
    } else {
      await tx.lease.create({
        data: {
          horseId: contract.horseId,
          contractId,
          leaserUserId: leaseVelden.leaserUserId,
          leaseType: leaseVelden.leaseType,
          status: 'ACTIEF',
          startDate: leaseVelden.startDate,
          endDate: leaseVelden.endDate,
          minimumTermMonths: leaseVelden.minimumTermMonths,
          noticePeriodDays: leaseVelden.noticePeriodDays,
          trialEndsAt: leaseVelden.trialEndsAt,
          config: leaseVelden.config,
        },
      })
    }

    await tx.message.create({
      data: {
        horseId: contract.horseId,
        authorId: user.id,
        subject: 'Leasecontract geactiveerd',
        body: `Het leasecontract voor ${
          horse?.name ?? 'het paard'
        } is volledig ondertekend en nu actief.`,
      },
    })
  })

  // PDF van de geactiveerde versie genereren/actualiseren (zoals bij offerContract).
  await genereerEnSlaContractPdfOp(contractId)

  revalidatePath(`/paarden/${horseId}`)
  revalidatePath('/eigenaar')
}

// Biedt een concept-contract aan de paardeigenaar aan (STAL-08, #81). Server-side
// afgedwongen: alleen OWNER/STAFF, alleen de toegestane overgang CONCEPT →
// AANGEBODEN, en alleen wanneer alle verplichte optieblokken volledig zijn. Het
// aanbiedmoment wordt append-only in config.statusHistorie vastgelegd (geen
// schemawijziging) en de wederpartij krijgt een melding via een Message op het paard.
export async function offerContract(horseId: string, contractId: string) {
  // Autorisatie: alleen OWNER/STAFF van de stal van het paard. Paardeigenaren
  // (zonder stalrol) worden hierdoor geweigerd.
  const { user } = await getAuthorizedStaff(horseId)

  const contract = await prisma.contract.findUnique({ where: { id: contractId } })
  if (!contract || contract.horseId !== horseId) {
    throw new Error('Contract niet gevonden')
  }

  // Statusmachine: een niet-toegestane overgang (bv. aanbieden van een contract
  // dat niet in CONCEPT staat) wordt geweigerd.
  assertOvergangToegestaan(contract.status, 'AANGEBODEN')

  // Er moet een wederpartij gekozen zijn om de melding aan te richten.
  if (!contract.counterpartyUserId) {
    throw new Error('Kies eerst een wederpartij (paardeigenaar) voordat je aanbiedt.')
  }

  // Verplicht-veld-validatie: alle verplichte optieblokken moeten volledig zijn.
  // Deze validatie is stalling-specifiek (STAL-08). Voor lease ([Unify 04] #130)
  // bestaat de aanbied-/ondertekenvalidatie nog niet — die wordt in [Unify 06] #132
  // afgemaakt. We slaan de stalling-validatie hier daarom over voor niet-stalling-
  // families, zodat de stalling-poort byte-identiek blijft en lease niet onterecht op
  // stalling-velden blokkeert.
  if (contract.family === 'STALLING') {
    // Het stalreglement is een DB-feit (gekoppelde bijlage), dus apart ophalen en
    // doorgeven aan de validatie (telt alleen mee bij stalreglementVerplicht).
    const heeftStalreglement = await heeftStalreglementBijlage(contractId)
    const ontbreekt = ontbrekendeAanbiedVelden(contract.config, heeftStalreglement)
    if (ontbreekt.length > 0) {
      throw new Error(
        `Het contract is nog niet compleet en kan niet worden aangeboden. Ontbreekt nog — ${ontbrekendeVeldenSamenvatting(
          ontbreekt,
        )}.`,
      )
    }
  }

  // Aanbiedmoment append-only vastleggen in config.statusHistorie.
  const bestaandeConfig =
    contract.config && typeof contract.config === 'object' && !Array.isArray(contract.config)
      ? (contract.config as Record<string, unknown>)
      : {}
  const historie = leesStatusHistorie(contract.config)
  const nieuweConfig = {
    ...bestaandeConfig,
    statusHistorie: [
      ...historie,
      {
        van: 'CONCEPT',
        naar: 'AANGEBODEN',
        op: new Date().toISOString(),
        doorUserId: user.id,
      },
    ],
  }

  const horse = await prisma.horse.findUnique({
    where: { id: horseId },
    select: { name: true },
  })

  // Statuswijziging + melding in één transactie.
  await prisma.$transaction([
    prisma.contract.update({
      where: { id: contractId },
      data: { status: 'AANGEBODEN', config: nieuweConfig },
    }),
    prisma.message.create({
      data: {
        horseId,
        authorId: user.id,
        subject:
          contract.family === 'LEASE'
            ? 'Nieuw leasecontract aangeboden'
            : 'Nieuw stallingscontract aangeboden',
        body: `Er is een ${
          contract.family === 'LEASE' ? 'leasecontract' : 'stallingscontract'
        } aangeboden voor ${horse?.name ?? 'je paard'}. Bekijk en beoordeel het aanbod.`,
      },
    }),
  ])

  // PDF van de aangeboden versie genereren en in Supabase Storage opslaan (STAL-12),
  // gekoppeld als ContractDocument aan deze versie. Na de geslaagde statusovergang.
  await genereerEnSlaContractPdfOp(contractId)

  revalidatePath(`/paarden/${horseId}`)
  revalidatePath('/eigenaar')
}

// ── Besluit van de paardeigenaar (STAL-09, #82) ──────────────────────────────
// Spiegelbeeldige autorisatie t.o.v. getAuthorizedStaff: hier mag uitsluitend de
// aan het contract gekoppelde wederpartij (de paardeigenaar, Contract.counterpartyUserId)
// het contract accepteren of afwijzen. Staf/eigenaar van de stal kan dit niet via
// deze acties — autorisatie wordt server-side afgedwongen, niet alleen in de UI.
async function getOwnerDecisionContract(contractId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const contract = await prisma.contract.findUnique({ where: { id: contractId } })
  if (!contract) throw new Error('Contract niet gevonden')

  if (contract.counterpartyUserId !== user.id) {
    throw new Error('Alleen de gekoppelde eigenaar kan dit contract beoordelen.')
  }

  return { user, contract }
}

// Legt een statusovergang van de eigenaar append-only vast in config.statusHistorie
// en geeft de nieuwe config terug (bestaande config-sleutels blijven behouden).
function metStatusHistorie(
  config: Prisma.JsonValue | null,
  van: ContractStatus,
  naar: ContractStatus,
  doorUserId: string,
) {
  const bestaandeConfig =
    config && typeof config === 'object' && !Array.isArray(config)
      ? (config as Record<string, unknown>)
      : {}
  const historie = leesStatusHistorie(config)
  return {
    ...bestaandeConfig,
    statusHistorie: [
      ...historie,
      { van, naar, op: new Date().toISOString(), doorUserId },
    ],
  }
}

// Accepteren: AANGEBODEN → ACTIEF (v1 in één stap direct ACTIEF). Server-side
// afgedwongen via de statusmachine-helper én de eigenaar-autorisatie. De stal
// ontvangt hierover een melding via een Message op het paard.
export async function acceptContract(contractId: string) {
  const { user, contract } = await getOwnerDecisionContract(contractId)

  // Statusmachine: accepteren mag alleen vanuit AANGEBODEN.
  assertOvergangToegestaan(contract.status, 'ACTIEF')

  const nieuweConfig = metStatusHistorie(contract.config, contract.status, 'ACTIEF', user.id)

  const horse = await prisma.horse.findUnique({
    where: { id: contract.horseId },
    select: { name: true },
  })

  await prisma.$transaction([
    prisma.contract.update({
      where: { id: contractId },
      data: { status: 'ACTIEF', config: nieuweConfig },
    }),
    prisma.message.create({
      data: {
        horseId: contract.horseId,
        authorId: user.id,
        subject: 'Stallingscontract geaccepteerd',
        body: `De eigenaar heeft het stallingscontract voor ${
          horse?.name ?? 'het paard'
        } geaccepteerd. Het contract is nu actief.`,
      },
    }),
  ])

  revalidatePath(`/paarden/${contract.horseId}`)
  revalidatePath('/eigenaar')
}

// Config-sleutels die de inhoudelijke optieblokken van een stallingscontract
// vormen (STAL-03 t/m STAL-07 + STAL-10). Bij het maken van een nieuwe versie
// worden uitsluitend deze blokken gekopieerd; status-/versie-metadata
// (statusHistorie, versieGroepId) worden bewust niet meegekopieerd.
const CONFIG_OPTIE_SLEUTELS = [
  'huisvesting',
  'voer',
  'weidegang',
  'faciliteiten',
  'prijsLooptijd',
  'verzekeringAansprakelijkheid',
  'gezondheidsplicht',
  'berijder',
  'bijlagen',
  'extraDiensten',
] as const

// ── Versionering: nieuwe versie maken vervangt de vorige (STAL-11, #84) ───────
// Velaro kent bewust geen tegenvoorstel-mechaniek: gewijzigde voorwaarden na een
// aanbod worden doorgevoerd door een nieuwe versie te maken die de vorige vervangt.
// Server-side afgedwongen: alleen OWNER/STAFF, en alleen vanuit AANGEBODEN of
// AFGEWEZEN (via de statusmachine). De huidige versie krijgt status VERVANGEN; er
// wordt een nieuwe CONCEPT-versie aangemaakt met currentVersion + 1 als kopie van
// alle config-optieblokken, zodat die direct bewerkt en opnieuw aangeboden kan
// worden. Beide momenten worden append-only in config.statusHistorie vastgelegd.
export async function createNewVersion(horseId: string, contractId: string) {
  // Autorisatie: alleen OWNER/STAFF van de stal van het paard. Paardeigenaren
  // (zonder stalrol) worden hierdoor geweigerd.
  const { user, horse } = await getAuthorizedStaff(horseId)

  const contract = await prisma.contract.findUnique({ where: { id: contractId } })
  if (!contract || contract.horseId !== horseId) {
    throw new Error('Contract niet gevonden')
  }

  // Statusmachine: een nieuwe versie mag alleen vanuit AANGEBODEN of AFGEWEZEN.
  // Een niet-toegestane huidige status (bv. CONCEPT/ACTIEF/VERVANGEN) wordt hier
  // geweigerd zonder dat er iets verandert.
  assertOvergangToegestaan(contract.status, 'VERVANGEN')

  // Inhoudelijke optieblokken van de vervangen versie als basis voor de kopie.
  const bestaandeConfig =
    contract.config && typeof contract.config === 'object' && !Array.isArray(contract.config)
      ? (contract.config as Record<string, unknown>)
      : {}
  const gekopieerdeOpties: Record<string, unknown> = {}
  for (const sleutel of CONFIG_OPTIE_SLEUTELS) {
    if (sleutel in bestaandeConfig) {
      gekopieerdeOpties[sleutel] = bestaandeConfig[sleutel]
    }
  }

  // Versiegroep: versies delen één groep-id (de id van het oorspronkelijke
  // contract) zodat de historie groepeerbaar is zonder schemawijziging.
  const versieGroepId = leesVersieGroepId(contract.config) ?? contract.id

  // Oude versie -> VERVANGEN, met append-only statushistorie. Borg ook de groep-id
  // op de oude versie zodat oudere contracten zonder groep-id alsnog gekoppeld zijn.
  const vervangenConfig = {
    ...metStatusHistorie(contract.config, contract.status, 'VERVANGEN', user.id),
    versieGroepId,
  }

  // Nieuwe versie: CONCEPT, currentVersion + 1, kopie van de optieblokken, met een
  // eigen statushistorie die start bij het ontstaan van deze concept-versie.
  const nieuweVersieConfig = {
    ...gekopieerdeOpties,
    versieGroepId,
    statusHistorie: [
      {
        van: contract.status,
        naar: 'CONCEPT',
        op: new Date().toISOString(),
        doorUserId: user.id,
      },
    ],
  }

  const [, nieuweVersie] = await prisma.$transaction([
    prisma.contract.update({
      where: { id: contractId },
      data: { status: 'VERVANGEN', config: vervangenConfig },
    }),
    prisma.contract.create({
      data: {
        horseId,
        stableId: horse.stableId,
        family: contract.family,
        type: contract.type,
        status: 'CONCEPT',
        currentVersion: contract.currentVersion + 1,
        counterpartyUserId: contract.counterpartyUserId,
        startDate: contract.startDate,
        config: nieuweVersieConfig,
      },
    }),
  ])

  // PDF van de nieuwe versie genereren en als ContractDocument koppelen (STAL-12),
  // zodat de huidige versie altijd een opgeslagen document heeft.
  await genereerEnSlaContractPdfOp(nieuweVersie.id)

  revalidatePath(`/paarden/${horseId}`)
}

// Afwijzen: AANGEBODEN → AFGEWEZEN (geen tegenvoorstel). Server-side afgedwongen
// via de statusmachine-helper én de eigenaar-autorisatie. De stal ontvangt hierover
// een melding via een Message op het paard.
export async function rejectContract(contractId: string) {
  const { user, contract } = await getOwnerDecisionContract(contractId)

  // Statusmachine: afwijzen mag alleen vanuit AANGEBODEN.
  assertOvergangToegestaan(contract.status, 'AFGEWEZEN')

  const nieuweConfig = metStatusHistorie(contract.config, contract.status, 'AFGEWEZEN', user.id)

  const horse = await prisma.horse.findUnique({
    where: { id: contract.horseId },
    select: { name: true },
  })

  await prisma.$transaction([
    prisma.contract.update({
      where: { id: contractId },
      data: { status: 'AFGEWEZEN', config: nieuweConfig },
    }),
    prisma.message.create({
      data: {
        horseId: contract.horseId,
        authorId: user.id,
        subject: 'Stallingscontract afgewezen',
        body: `De eigenaar heeft het aangeboden stallingscontract voor ${
          horse?.name ?? 'het paard'
        } afgewezen.`,
      },
    }),
  ])

  revalidatePath(`/paarden/${contract.horseId}`)
  revalidatePath('/eigenaar')
}

// ── PDF-preview & inzage (STAL-12, #85) ───────────────────────────────────────

// Bouwt de partijen-/paardcontext voor een opgeslagen contract. Hergebruikt de
// stal-, paard- en wederpartijgegevens zodat de PDF dezelfde namen toont als de UI.
async function bouwPdfContextVoorContract(contractId: string) {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: {
      stable: {
        select: {
          id: true,
          name: true,
          address: true,
          postalCode: true,
          city: true,
          logoPath: true,
        },
      },
      horse: { select: { id: true, name: true, photoPath: true } },
      counterparty: { select: { name: true, email: true } },
    },
  })
  if (!contract) throw new Error('Contract niet gevonden')

  const adresDelen = [
    contract.stable.address,
    [contract.stable.postalCode, contract.stable.city].filter(Boolean).join(' '),
  ].filter((d) => d && d.trim().length > 0)

  return {
    contract,
    context: {
      stalNaam: contract.stable.name,
      stalAdres: adresDelen.length > 0 ? adresDelen.join(', ') : null,
      eigenaarNaam:
        contract.counterparty?.name ?? contract.counterparty?.email ?? 'Onbekende eigenaar',
      paardNaam: contract.horse.name,
      // Eigen stallogo (#98) in de preview; null = standaard Velaro-logo.
      stalLogoDataUrl: contract.stable.logoPath
        ? await getStableLogoDataUrl(contract.stable.id)
        : null,
      // Profielfoto van het paard (#118) in de preview; null = geen foto.
      paardFotoDataUrl: contract.horse.photoPath
        ? await getPaardFotoDataUrl(contract.horse.id)
        : null,
    },
  }
}

// Preview-PDF vanuit het bewerkscherm (concept): genereert de PDF in-memory en geeft
// hem als base64 terug, ZONDER op te slaan en ZONDER statuswissel. Server-side
// afgedwongen: alleen OWNER/STAFF van de stal van het paard. Een paardeigenaar kan
// dus geen PDF genereren van een concept.
export async function previewContractPdf(
  horseId: string,
  contractId: string,
): Promise<string> {
  await getAuthorizedStaff(horseId)

  const { contract, context } = await bouwPdfContextVoorContract(contractId)
  if (contract.horseId !== horseId) {
    throw new Error('Contract niet gevonden')
  }

  // Gekoppelde bijlagen (STAL-16) — alleen naam + categorie voor het PDF-overzicht.
  const bijlagen = await prisma.contractBijlage.findMany({
    where: { contractId },
    orderBy: { createdAt: 'asc' },
    select: { categorie: true, bestandsnaam: true },
  })

  const buffer = await renderContractPdfBuffer(
    {
      currentVersion: contract.currentVersion,
      startDate: contract.startDate,
      config: contract.config,
      bijlagen,
    },
    context,
  )
  return buffer.toString('base64')
}

// Signed URL voor OWNER/STAFF om de opgeslagen PDF van een contract te openen op het
// paardprofiel (contracten-tab). Server-side afgedwongen: alleen OWNER/STAFF van de
// stal van het paard. Null wanneer er (nog) geen PDF is opgeslagen.
export async function getContractPdfUrlVoorStaf(
  horseId: string,
  contractId: string,
): Promise<string | null> {
  await getAuthorizedStaff(horseId)

  const contract = await prisma.contract.findUnique({ where: { id: contractId } })
  if (!contract || contract.horseId !== horseId) {
    throw new Error('Contract niet gevonden')
  }

  return getSignedUrlVoorContract(contractId)
}

// Signed URL voor de paardeigenaar om de opgeslagen PDF van een aangeboden contract
// in te zien (sluit aan op STAL-09). Server-side afgedwongen: alleen de gekoppelde
// wederpartij. Null wanneer er (nog) geen PDF is opgeslagen.
export async function getContractPdfUrlVoorEigenaar(
  contractId: string,
): Promise<string | null> {
  await getOwnerDecisionContract(contractId)
  return getSignedUrlVoorContract(contractId)
}

// ── Verlengen: stilzwijgend & expliciet (STAL-14, #87) ────────────────────────

// Hulp: voert één verlenging door binnen een transactie. Zet de status naar VERLENGD,
// legt de statusovergang append-only vast in config.statusHistorie, voegt een
// append-only verleng-entry toe (verlengingen[]) en richt aan beide partijen (stal én
// eigenaar) een melding via een Message op het paard. De nieuwe einddatum is één
// oorspronkelijke minimumperiode/looptijd verder (afgeleid via volgendeEinddatum).
async function voerVerlengingUit(params: {
  contract: { id: string; horseId: string; status: ContractStatus; config: Prisma.JsonValue | null }
  doorUserId: string
  automatisch: boolean
  // Bevestig-metadata die in dezelfde update moet worden weggeschreven (expliciet),
  // of null bij stilzwijgend (de bevestig-ronde wordt dan opgeschoond).
}) {
  const { contract, doorUserId, automatisch } = params

  // Statusmachine: ACTIEF → VERLENGD of VERLENGD → VERLENGD. Een niet-toegestane
  // huidige status wordt geweigerd.
  assertOvergangToegestaan(contract.status, 'VERLENGD')

  const vanEinddatum = huidigeEinddatum(contract.config)
  const nieuweEinddatum = volgendeEinddatum(contract.config)
  if (!nieuweEinddatum) {
    throw new Error(
      'Dit contract heeft geen einddatum/looptijd en kan niet worden verlengd.',
    )
  }

  const modus = verlengingsModus(contract.config)
  const entry: VerlengingEntry = {
    modus,
    vanEinddatum: vanEinddatum ? vanEinddatum.toISOString().slice(0, 10) : null,
    naarEinddatum: nieuweEinddatum.toISOString().slice(0, 10),
    op: new Date().toISOString(),
    automatisch,
  }

  const metHistorie = metStatusHistorie(
    contract.config,
    contract.status,
    'VERLENGD',
    doorUserId,
  )
  const bestaandeVerlengingen = leesVerlengHistorie(contract.config)
  // Bevestig-ronde wordt na het doorvoeren opgeschoond; een volgende periode start
  // met een lege bevestiging.
  const zonderBevestiging = { ...(metHistorie as Record<string, unknown>) }
  delete zonderBevestiging.verlengBevestiging
  const nieuweConfig = {
    ...zonderBevestiging,
    verlengingen: [...bestaandeVerlengingen, entry],
  }

  const horse = await prisma.horse.findUnique({
    where: { id: contract.horseId },
    select: { name: true },
  })
  const nieuweEinddatumNl = nieuweEinddatum.toLocaleDateString('nl-NL')
  const omschrijving = automatisch
    ? `Het stallingscontract voor ${
        horse?.name ?? 'het paard'
      } is stilzwijgend verlengd tot ${nieuweEinddatumNl}.`
    : `Het stallingscontract voor ${
        horse?.name ?? 'het paard'
      } is door beide partijen verlengd tot ${nieuweEinddatumNl}.`

  await prisma.$transaction([
    prisma.contract.update({
      where: { id: contract.id },
      data: { status: 'VERLENGD', config: nieuweConfig },
    }),
    prisma.message.create({
      data: {
        horseId: contract.horseId,
        authorId: doorUserId,
        subject: 'Stallingscontract verlengd',
        body: omschrijving,
      },
    }),
  ])
}

// LAZY stilzwijgende verlenging. Wordt server-side aangeroepen bij paginabezoek
// (dashboard `/stal` & `/eigenaar`, contract-detail, paardprofiel). Voor het
// opgegeven contract: wanneer het stilzwijgend verlengt en het verlengmoment bereikt
// is, wordt het naar VERLENGD gebracht met een nieuwe periode en krijgen beide
// partijen een melding. Idempotent: zonder nieuw verlengmoment gebeurt er niets en
// wordt geen dubbele melding aangemaakt (bewaakt via de huidige einddatum uit de
// append-only verleng-metadata). Verlengt zo nodig meerdere perioden door wanneer er
// lang geen bezoek is geweest, zonder per gemiste periode een aparte melding op te
// stapelen — er wordt per detectiemoment één keer verlengd tot het verlengmoment niet
// meer bereikt is. Geeft true terug wanneer er daadwerkelijk verlengd is.
export async function verwerkStilzwijgendeVerlenging(
  contractId: string,
): Promise<boolean> {
  const contract = await prisma.contract.findUnique({ where: { id: contractId } })
  if (!contract) return false
  // Alleen actieve/verlengde stalling-contracten komen in aanmerking.
  if (contract.family !== 'STALLING') return false
  if (contract.status !== 'ACTIEF' && contract.status !== 'VERLENGD') return false
  if (!moetStilzwijgendVerlengen(contract.config)) return false

  // Systeemmelding: de stilzwijgende verlenging is geen handeling van een gebruiker.
  // We schrijven de melding op naam van de wederpartij (eigenaar) wanneer bekend,
  // anders valt dit terug op een willekeurige stalbeheerder is niet nodig — Message
  // vereist een authorId. We gebruiken de counterparty (eigenaar) als auteur; is die
  // er niet, dan slaan we de lazy-verlenging over (een contract zonder eigenaar kan
  // sowieso niet actief zijn).
  if (!contract.counterpartyUserId) return false

  await voerVerlengingUit({
    contract,
    doorUserId: contract.counterpartyUserId,
    automatisch: true,
  })
  return true
}

// Verwerkt de stilzwijgende verlenging voor een set contracten (lazy, bij
// paginabezoek). Idempotent en bestand tegen fouten op individuele contracten zodat
// een enkel probleemcontract het dashboard niet blokkeert. Geeft het aantal
// daadwerkelijk verlengde contracten terug.
export async function verwerkStilzwijgendeVerlengingen(
  contractIds: string[],
): Promise<number> {
  let aantal = 0
  for (const id of contractIds) {
    try {
      if (await verwerkStilzwijgendeVerlenging(id)) aantal += 1
    } catch {
      // Bewust stil: een falende verlenging mag het laden van de pagina niet breken.
    }
  }
  return aantal
}

// Expliciete verlenging: bevestig-actie voor stal (OWNER/STAFF) én eigenaar
// (counterpartyUserId). Pas wanneer BEIDE partijen voor dezelfde ronde (de huidige
// einddatum) hebben bevestigd, gaat het contract naar VERLENGD met een nieuwe periode
// en krijgen beide partijen een melding. Zolang slechts één partij heeft bevestigd
// blijft de status ongewijzigd (ACTIEF/VERLENGD). De afzonderlijke bevestigingen
// worden in config.verlengBevestiging bijgehouden. Server-side afgedwongen:
// autorisatie (stalrol of gekoppelde eigenaar), de EXPLICIET-modus en de statusmachine.
export async function bevestigVerlenging(contractId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const contract = await prisma.contract.findUnique({ where: { id: contractId } })
  if (!contract) throw new Error('Contract niet gevonden')

  // Alleen vanuit een status waar verlengen mag (ACTIEF/VERLENGD).
  assertOvergangToegestaan(contract.status, 'VERLENGD')

  // Alleen expliciete verlenging kent een bevestig-actie.
  if (verlengingsModus(contract.config) !== 'EXPLICIET') {
    throw new Error('Dit contract kent geen expliciete verlenging.')
  }

  // Autorisatie: ofwel de gekoppelde eigenaar, ofwel een OWNER/STAFF van de stal.
  const isEigenaar = contract.counterpartyUserId === user.id
  let isStaf = false
  if (!isEigenaar) {
    const role = await getStableRole(user.id, contract.stableId)
    isStaf = role === 'OWNER' || role === 'STAFF'
  }
  if (!isEigenaar && !isStaf) {
    throw new Error('Je bent niet gemachtigd om dit contract te verlengen.')
  }

  // De ronde is de huidige einddatum; een nieuwe periode vereist opnieuw bevestiging
  // van beide partijen.
  const huidig = huidigeEinddatum(contract.config)
  if (!huidig) {
    throw new Error(
      'Dit contract heeft geen einddatum/looptijd en kan niet worden verlengd.',
    )
  }
  const ronde = huidig.toISOString().slice(0, 10)

  const bestaand = leesVerlengBevestiging(contract.config)
  // Bij een nieuwe ronde (andere einddatum) starten de bevestigingen opnieuw.
  const basis =
    bestaand && bestaand.ronde === ronde
      ? bestaand
      : { ronde, doorStal: false, doorEigenaar: false }

  const nieuweBevestiging = {
    ronde,
    doorStal: basis.doorStal || isStaf,
    doorEigenaar: basis.doorEigenaar || isEigenaar,
  }

  // Beide partijen akkoord → daadwerkelijk verlengen.
  if (nieuweBevestiging.doorStal && nieuweBevestiging.doorEigenaar) {
    await voerVerlengingUit({ contract, doorUserId: user.id, automatisch: false })
  } else {
    // Eén partij akkoord → alleen de bevestiging vastleggen, status blijft gelijk.
    const bestaandeConfig =
      contract.config &&
      typeof contract.config === 'object' &&
      !Array.isArray(contract.config)
        ? (contract.config as Record<string, unknown>)
        : {}
    await prisma.contract.update({
      where: { id: contractId },
      data: {
        config: { ...bestaandeConfig, verlengBevestiging: nieuweBevestiging },
      },
    })
  }

  revalidatePath(`/paarden/${contract.horseId}`)
  revalidatePath('/eigenaar')
  revalidatePath('/stal/contracten')
}

// ── Opzeggen, opschorten, prijsverlaging & retentierecht (STAL-15, #88) ───────
// Stal-acties (OWNER/STAFF) op een actief/verlengd stallingscontract. Elke
// statusovergang loopt via de statusmachine (server-side afgedwongen), wordt
// append-only in config.statusHistorie gelogd en richt een melding aan de
// wederpartij via een Message op het paard — in dezelfde stijl als
// offer/accept/reject/verlengen. Geen facturatie/incasso: prijsverlaging en
// retentierecht zijn enkel data.

// Helper: laadt een contract en dwingt af dat het bij het paard hoort, dat de
// huidige gebruiker OWNER/STAFF van de stal is en geeft user + contract terug.
async function getStaffContract(horseId: string, contractId: string) {
  const { user } = await getAuthorizedStaff(horseId)
  const contract = await prisma.contract.findUnique({ where: { id: contractId } })
  if (!contract || contract.horseId !== horseId) {
    throw new Error('Contract niet gevonden')
  }
  return { user, contract }
}

// Opzeggen: ACTIEF/VERLENGD → OPZEGGING_LOOPT. Het systeem berekent de einddatum op
// basis van de opzegtermijn uit STAL-05 (config.prijsLooptijd.looptijd.opzegtermijn).
// De opzeg-data wordt op het contract bewaard; op de berekende einddatum wordt het
// contract lazy BEEINDIGD. De wederpartij krijgt een melding.
export async function opzeggenContract(
  horseId: string,
  contractId: string,
  formData: FormData,
) {
  const { user, contract } = await getStaffContract(horseId, contractId)

  // Statusmachine: opzeggen mag alleen vanuit ACTIEF/VERLENGD.
  assertOvergangToegestaan(contract.status, 'OPZEGGING_LOOPT')

  const reden = (formData.get('reden') as string)?.trim() || null
  const nu = new Date()
  const einddatum = berekenOpzegEinddatum(contract.config, nu)
  const einddatumIso = einddatum.toISOString().slice(0, 10)

  const metHistorie = metStatusHistorie(
    contract.config,
    contract.status,
    'OPZEGGING_LOOPT',
    user.id,
  )
  const nieuweConfig = {
    ...(metHistorie as Record<string, unknown>),
    opzegging: {
      einddatum: einddatumIso,
      op: nu.toISOString(),
      doorUserId: user.id,
      reden,
    },
  }

  const horse = await prisma.horse.findUnique({
    where: { id: horseId },
    select: { name: true },
  })
  const einddatumNl = einddatum.toLocaleDateString('nl-NL')

  await prisma.$transaction([
    prisma.contract.update({
      where: { id: contractId },
      data: { status: 'OPZEGGING_LOOPT', config: nieuweConfig },
    }),
    prisma.message.create({
      data: {
        horseId,
        authorId: user.id,
        subject: 'Stallingscontract opgezegd',
        body: `Het stallingscontract voor ${
          horse?.name ?? 'het paard'
        } is opgezegd. Het eindigt op ${einddatumNl}.`,
      },
    }),
  ])

  revalidatePath(`/paarden/${horseId}`)
  revalidatePath('/eigenaar')
  revalidatePath('/stal/contracten')
}

// Opschorten: ACTIEF/VERLENGD → OPGESCHORT met een opgegeven einddatum. Op die
// einddatum keert het contract lazy terug naar ACTIEF. De wederpartij krijgt een
// melding.
export async function opschortenContract(
  horseId: string,
  contractId: string,
  formData: FormData,
) {
  const { user, contract } = await getStaffContract(horseId, contractId)

  // Statusmachine: opschorten mag alleen vanuit ACTIEF/VERLENGD.
  assertOvergangToegestaan(contract.status, 'OPGESCHORT')

  const einddatumStr = (formData.get('einddatum') as string)?.trim()
  if (!einddatumStr) {
    throw new Error('Vul een einddatum in voor de opschorting.')
  }
  const einddatum = new Date(einddatumStr)
  if (Number.isNaN(einddatum.getTime())) {
    throw new Error('De opgegeven einddatum is ongeldig.')
  }
  const reden = (formData.get('reden') as string)?.trim() || null

  const metHistorie = metStatusHistorie(
    contract.config,
    contract.status,
    'OPGESCHORT',
    user.id,
  )
  const nieuweConfig = {
    ...(metHistorie as Record<string, unknown>),
    opschorting: {
      einddatum: einddatumStr,
      op: new Date().toISOString(),
      doorUserId: user.id,
      reden,
    },
  }

  const horse = await prisma.horse.findUnique({
    where: { id: horseId },
    select: { name: true },
  })
  const einddatumNl = einddatum.toLocaleDateString('nl-NL')

  await prisma.$transaction([
    prisma.contract.update({
      where: { id: contractId },
      data: { status: 'OPGESCHORT', config: nieuweConfig },
    }),
    prisma.message.create({
      data: {
        horseId,
        authorId: user.id,
        subject: 'Stallingscontract opgeschort',
        body: `Het stallingscontract voor ${
          horse?.name ?? 'het paard'
        } is opgeschort tot ${einddatumNl}.`,
      },
    }),
  ])

  revalidatePath(`/paarden/${horseId}`)
  revalidatePath('/eigenaar')
  revalidatePath('/stal/contracten')
}

// Tijdelijke prijsverlaging: afwijkend bedrag + start-/einddatum, als data op het
// contract (append-only). Geen statuswissel en geen inning/facturatie. Alleen
// OWNER/STAFF, alleen op een actief/verlengd contract. De wederpartij krijgt een
// informatieve melding.
export async function legPrijsverlagingVast(
  horseId: string,
  contractId: string,
  formData: FormData,
) {
  const { user, contract } = await getStaffContract(horseId, contractId)

  if (contract.status !== 'ACTIEF' && contract.status !== 'VERLENGD') {
    throw new Error(
      'Een prijsverlaging kan alleen op een actief contract worden vastgelegd.',
    )
  }

  const bedrag = leesNietNegatiefGetal(
    formData.get('bedrag'),
    'Het verlaagde bedrag',
  )
  if (bedrag === null) {
    throw new Error('Vul het verlaagde bedrag in.')
  }
  const startdatum = (formData.get('startdatum') as string)?.trim()
  const einddatum = (formData.get('einddatum') as string)?.trim()
  if (!startdatum || !einddatum) {
    throw new Error('Vul een start- en einddatum in voor de prijsverlaging.')
  }
  if (new Date(einddatum).getTime() < new Date(startdatum).getTime()) {
    throw new Error('De einddatum mag niet vóór de startdatum liggen.')
  }
  const notitie = (formData.get('notitie') as string)?.trim() || null

  const bestaandeConfig =
    contract.config && typeof contract.config === 'object' && !Array.isArray(contract.config)
      ? (contract.config as Record<string, unknown>)
      : {}
  const bestaande = leesPrijsverlagingen(contract.config)
  const nieuweConfig = {
    ...bestaandeConfig,
    prijsverlagingen: [
      ...bestaande,
      {
        bedrag,
        startdatum,
        einddatum,
        op: new Date().toISOString(),
        doorUserId: user.id,
        notitie,
      },
    ],
  }

  const horse = await prisma.horse.findUnique({
    where: { id: horseId },
    select: { name: true },
  })
  const startNl = new Date(startdatum).toLocaleDateString('nl-NL')
  const eindNl = new Date(einddatum).toLocaleDateString('nl-NL')

  await prisma.$transaction([
    prisma.contract.update({
      where: { id: contractId },
      data: { config: nieuweConfig },
    }),
    prisma.message.create({
      data: {
        horseId,
        authorId: user.id,
        subject: 'Tijdelijke prijsverlaging vastgelegd',
        body: `Voor ${
          horse?.name ?? 'het paard'
        } is een tijdelijke prijsverlaging vastgelegd van ${startNl} tot ${eindNl}.`,
      },
    }),
  ])

  revalidatePath(`/paarden/${horseId}`)
  revalidatePath('/eigenaar')
  revalidatePath('/stal/contracten')
}

// Wanbetaling/retentierecht markeren of opheffen: status/notitie als data op het
// contract (geen incasso, geen statuswissel). Alleen OWNER/STAFF.
export async function markeerRetentierecht(
  horseId: string,
  contractId: string,
  formData: FormData,
) {
  const { user, contract } = await getStaffContract(horseId, contractId)

  const actief = formData.get('actief') !== 'false'
  const notitie = (formData.get('notitie') as string)?.trim() || null

  const bestaandeConfig =
    contract.config && typeof contract.config === 'object' && !Array.isArray(contract.config)
      ? (contract.config as Record<string, unknown>)
      : {}
  const nieuweConfig = {
    ...bestaandeConfig,
    retentierecht: actief
      ? {
          actief: true,
          op: new Date().toISOString(),
          doorUserId: user.id,
          notitie,
        }
      : { actief: false, op: null, doorUserId: null, notitie: null },
  }

  const horse = await prisma.horse.findUnique({
    where: { id: horseId },
    select: { name: true },
  })

  await prisma.$transaction([
    prisma.contract.update({
      where: { id: contractId },
      data: { config: nieuweConfig },
    }),
    prisma.message.create({
      data: {
        horseId,
        authorId: user.id,
        subject: actief
          ? 'Wanbetaling/retentierecht gemarkeerd'
          : 'Wanbetaling/retentierecht opgeheven',
        body: actief
          ? `Voor het stallingscontract van ${
              horse?.name ?? 'het paard'
            } is wanbetaling/retentierecht gemarkeerd.`
          : `De markering wanbetaling/retentierecht voor het stallingscontract van ${
              horse?.name ?? 'het paard'
            } is opgeheven.`,
      },
    }),
  ])

  revalidatePath(`/paarden/${horseId}`)
  revalidatePath('/eigenaar')
  revalidatePath('/stal/contracten')
}

// Beëindigen van rechtswege bij overlijden van het paard: ACTIEF/VERLENGD →
// BEEINDIGD. Stal-actie; de wederpartij krijgt een melding. Dit dekt zowel
// overlijden als de versnelde beëindiging die de stal handmatig inroept (bv. na
// langdurige blessure boven de in het contract vastgelegde drempel) — beide leiden
// tot een directe, server-side gevalideerde beëindiging met reden.
export async function beeindigContract(
  horseId: string,
  contractId: string,
  formData: FormData,
) {
  const { user, contract } = await getStaffContract(horseId, contractId)

  // Statusmachine: directe beëindiging mag alleen vanuit ACTIEF/VERLENGD.
  assertOvergangToegestaan(contract.status, 'BEEINDIGD')

  const redenRaw = (formData.get('reden') as string)?.trim()
  // Toegestane redenen voor een bijzondere beëindiging (§3.4): overlijden van het
  // paard of versneld opzegrecht bij langdurige blessure.
  const reden =
    redenRaw === 'OVERLIJDEN' || redenRaw === 'BLESSURE' ? redenRaw : 'OVERLIJDEN'
  const toelichting = (formData.get('toelichting') as string)?.trim() || null

  const metHistorie = metStatusHistorie(
    contract.config,
    contract.status,
    'BEEINDIGD',
    user.id,
  )
  const nieuweConfig = {
    ...(metHistorie as Record<string, unknown>),
    beeindiging: {
      reden,
      toelichting,
      op: new Date().toISOString(),
      doorUserId: user.id,
    },
  }

  const horse = await prisma.horse.findUnique({
    where: { id: horseId },
    select: { name: true },
  })
  const redenTekst =
    reden === 'OVERLIJDEN'
      ? `is van rechtswege beëindigd wegens het overlijden van ${horse?.name ?? 'het paard'}`
      : `is versneld beëindigd wegens langdurige blessure van ${horse?.name ?? 'het paard'}`

  await prisma.$transaction([
    prisma.contract.update({
      where: { id: contractId },
      data: { status: 'BEEINDIGD', config: nieuweConfig },
    }),
    prisma.message.create({
      data: {
        horseId,
        authorId: user.id,
        subject: 'Stallingscontract beëindigd',
        body: `Het stallingscontract ${redenTekst}.`,
      },
    }),
  ])

  revalidatePath(`/paarden/${horseId}`)
  revalidatePath('/eigenaar')
  revalidatePath('/stal/contracten')
}

// ── LAZY tijdgebonden overgangen (STAL-15, #88) ───────────────────────────────
// Productowner-beslissing: geen cron/scheduler. Bij paginabezoek/serveractie wordt
// per contract bepaald of een datum-gebaseerde overgang verschuldigd is en die
// alsnog via de statusmachine toegepast — met een eenmalige (idempotente) melding.
// De idempotentie volgt uit de statussen zelf: na de overgang is de bron-status weg,
// dus een volgend bezoek detecteert niets meer (de statusmachine zou de al-uitgevoerde
// overgang sowieso weigeren). Geeft true terug bij een daadwerkelijke overgang.
export async function verwerkTijdgebondenOvergang(
  contractId: string,
): Promise<boolean> {
  const contract = await prisma.contract.findUnique({ where: { id: contractId } })
  if (!contract) return false
  if (contract.family !== 'STALLING') return false
  if (!contract.counterpartyUserId) return false

  const horse = await prisma.horse.findUnique({
    where: { id: contract.horseId },
    select: { name: true },
  })
  const naam = horse?.name ?? 'het paard'

  // OPZEGGING_LOOPT → BEEINDIGD wanneer de opzeg-einddatum verstreken is.
  if (contract.status === 'OPZEGGING_LOOPT' && opzegEinddatumVerstreken(contract.config)) {
    assertOvergangToegestaan(contract.status, 'BEEINDIGD')
    const opzegging = leesOpzegging(contract.config)
    const metHistorie = metStatusHistorie(
      contract.config,
      contract.status,
      'BEEINDIGD',
      contract.counterpartyUserId,
    )
    const nieuweConfig = {
      ...(metHistorie as Record<string, unknown>),
      beeindiging: {
        reden: 'OPZEGGING',
        toelichting: opzegging?.reden ?? null,
        op: new Date().toISOString(),
        doorUserId: contract.counterpartyUserId,
      },
    }
    await prisma.$transaction([
      prisma.contract.update({
        where: { id: contractId },
        data: { status: 'BEEINDIGD', config: nieuweConfig },
      }),
      prisma.message.create({
        data: {
          horseId: contract.horseId,
          authorId: contract.counterpartyUserId,
          subject: 'Stallingscontract beëindigd',
          body: `De opzegtermijn is verstreken; het stallingscontract voor ${naam} is beëindigd.`,
        },
      }),
    ])
    return true
  }

  // OPGESCHORT → ACTIEF wanneer de opschort-einddatum verstreken is.
  if (contract.status === 'OPGESCHORT' && opschortEinddatumVerstreken(contract.config)) {
    assertOvergangToegestaan(contract.status, 'ACTIEF')
    const metHistorie = metStatusHistorie(
      contract.config,
      contract.status,
      'ACTIEF',
      contract.counterpartyUserId,
    )
    // De opschort-data opschonen zodat een volgende opschorting schoon begint.
    const zonderOpschorting = { ...(metHistorie as Record<string, unknown>) }
    delete zonderOpschorting.opschorting
    await prisma.$transaction([
      prisma.contract.update({
        where: { id: contractId },
        data: {
          status: 'ACTIEF',
          config: zonderOpschorting as Prisma.InputJsonValue,
        },
      }),
      prisma.message.create({
        data: {
          horseId: contract.horseId,
          authorId: contract.counterpartyUserId,
          subject: 'Opschorting beëindigd',
          body: `De opschorting van het stallingscontract voor ${naam} is afgelopen; het contract is weer actief.`,
        },
      }),
    ])
    return true
  }

  return false
}

// Verwerkt de tijdgebonden overgangen voor een set contracten (lazy, bij
// paginabezoek). Idempotent en bestand tegen fouten op individuele contracten zodat
// een enkel probleemcontract het laden van de pagina niet blokkeert. Geeft het aantal
// daadwerkelijk gewijzigde contracten terug.
export async function verwerkTijdgebondenOvergangen(
  contractIds: string[],
): Promise<number> {
  let aantal = 0
  for (const id of contractIds) {
    try {
      if (await verwerkTijdgebondenOvergang(id)) aantal += 1
    } catch {
      // Bewust stil: een falende overgang mag het laden van de pagina niet breken.
    }
  }
  return aantal
}

// ── Bijlagen koppelen/beheren (STAL-16) ───────────────────────────────────────
// Door de stal aangeleverde bijlagen (stalreglement, voerschema, prijslijst, kopie
// verzekeringspolis) worden in Supabase Storage bewaard en als ContractBijlage aan
// het contract gekoppeld. Server-side afgedwongen: alleen OWNER/STAFF van de stal,
// en alleen bij status CONCEPT (dezelfde poort als bewerken). De bestanden zijn
// individueel toe te voegen/verwijderen, los van het opslaan van het bewerkscherm.

// Toegestane bestandstypen + maximale grootte voor een bijlage.
const BIJLAGE_MAX_BYTES = 10 * 1024 * 1024 // 10 MB
const BIJLAGE_TOEGESTANE_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
])

// Koppelt (upload) een bijlage aan een concept-contract in de opgegeven categorie.
export async function uploadContractBijlage(
  horseId: string,
  contractId: string,
  formData: FormData,
) {
  // Autorisatie + status-poort: alleen OWNER/STAFF, alleen bij CONCEPT.
  await getEditableConceptContract(horseId, contractId)

  const categorie = (formData.get('categorie') as string)?.trim()
  if (!categorie || !BIJLAGE_CATEGORIE_OPTIES.includes(categorie as never)) {
    throw new Error('Kies een geldige categorie voor de bijlage.')
  }

  const file = formData.get('bestand')
  if (!(file instanceof File) || file.size === 0) {
    throw new Error('Kies een bestand om te koppelen.')
  }
  if (file.size > BIJLAGE_MAX_BYTES) {
    throw new Error('Het bestand is te groot (maximaal 10 MB).')
  }
  if (file.type && !BIJLAGE_TOEGESTANE_TYPES.has(file.type)) {
    throw new Error('Alleen PDF- of afbeeldingsbestanden zijn toegestaan.')
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  await slaBijlageOp({
    contractId,
    categorie,
    bestandsnaam: file.name || 'bijlage',
    buffer,
    contentType: file.type || 'application/octet-stream',
  })

  revalidatePath(`/paarden/${horseId}/contracten/${contractId}/bewerken`)
  revalidatePath(`/paarden/${horseId}`)
}

// Verwijdert een gekoppelde bijlage van een concept-contract.
export async function verwijderContractBijlage(
  horseId: string,
  contractId: string,
  bijlageId: string,
) {
  await getEditableConceptContract(horseId, contractId)

  // De bijlage moet bij dit contract horen (geen cross-contract-verwijdering).
  const bijlage = await prisma.contractBijlage.findUnique({ where: { id: bijlageId } })
  if (!bijlage || bijlage.contractId !== contractId) {
    throw new Error('Bijlage niet gevonden')
  }

  await verwijderBijlage(bijlageId)

  revalidatePath(`/paarden/${horseId}/contracten/${contractId}/bewerken`)
  revalidatePath(`/paarden/${horseId}`)
}

// Signed URL voor OWNER/STAFF om een gekoppelde bijlage te openen. Server-side
// afgedwongen: alleen OWNER/STAFF van de stal van het paard, en de bijlage moet bij
// het contract horen.
export async function getBijlageUrlVoorStaf(
  horseId: string,
  contractId: string,
  bijlageId: string,
): Promise<string | null> {
  await getAuthorizedStaff(horseId)

  const bijlage = await prisma.contractBijlage.findUnique({ where: { id: bijlageId } })
  if (!bijlage || bijlage.contractId !== contractId) {
    throw new Error('Bijlage niet gevonden')
  }
  const contract = await prisma.contract.findUnique({ where: { id: contractId } })
  if (!contract || contract.horseId !== horseId) {
    throw new Error('Contract niet gevonden')
  }

  return getSignedUrlVoorBijlage(bijlageId)
}

// Signed URL voor de paardeigenaar om een gekoppelde bijlage in te zien (sluit aan
// op STAL-09: dezelfde leesrechten als de eigenaar-weergave). Server-side afgedwongen:
// alleen de gekoppelde wederpartij, en de bijlage moet bij het contract horen.
export async function getBijlageUrlVoorEigenaar(
  contractId: string,
  bijlageId: string,
): Promise<string | null> {
  await getOwnerDecisionContract(contractId)

  const bijlage = await prisma.contractBijlage.findUnique({ where: { id: bijlageId } })
  if (!bijlage || bijlage.contractId !== contractId) {
    throw new Error('Bijlage niet gevonden')
  }

  return getSignedUrlVoorBijlage(bijlageId)
}
