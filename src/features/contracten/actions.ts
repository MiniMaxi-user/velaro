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
  assertOvergangToegestaan,
  leesStatusHistorie,
  leesVersieGroepId,
} from './statusMachine'
import {
  ontbrekendeAanbiedVelden,
  ontbrekendeVeldenSamenvatting,
} from './aanbiedValidatie'
import type { ContractStatus, Prisma } from '@prisma/client'

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

// Maakt een concept-stallingscontract (full pension) aan op een paard.
// family=STALLING, type=FULL_PENSION, status=CONCEPT, currentVersion=1.
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

  await prisma.contract.create({
    data: {
      horseId,
      stableId: horse.stableId,
      family: 'STALLING',
      type: 'FULL_PENSION',
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
  const ontbreekt = ontbrekendeAanbiedVelden(contract.config)
  if (ontbreekt.length > 0) {
    throw new Error(
      `Het contract is nog niet compleet en kan niet worden aangeboden. Ontbreekt nog — ${ontbrekendeVeldenSamenvatting(
        ontbreekt,
      )}.`,
    )
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
        subject: 'Nieuw stallingscontract aangeboden',
        body: `Er is een stallingscontract aangeboden voor ${
          horse?.name ?? 'je paard'
        }. Bekijk en beoordeel het aanbod.`,
      },
    }),
  ])

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

  await prisma.$transaction([
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
