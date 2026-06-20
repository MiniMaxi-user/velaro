import { prisma } from '@/lib/prisma'
import {
  bepaalNalevingStatus,
  maandenNaarDagen,
  vaccinatieTypeMatchtSoort,
  wekenNaarDagen,
  type GezondheidsplichtConfig,
  type NalevingStatus,
  type VaccinatieSoort,
} from './gezondheidsplicht'
import {
  CONTRACT_BIJLAGEN_BUCKET,
  getBijlagenVoorContract,
} from './bijlagenStorage'
import { createAdminClient } from '@/lib/supabase/admin'
import type { SamenvattingBijlage } from './ContractSamenvatting'

// Haalt de contracten van een paard op, nieuwste eerst, inclusief de wederpartij.
export async function getContractsForHorse(horseId: string) {
  return prisma.contract.findMany({
    where: { horseId },
    include: {
      counterparty: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

// Haalt alle stallingscontracten van een stal op voor het stal-overzicht (STAL-13,
// #86). Filtert op de actieve stal (stableId) en op de stalling-familie; lease valt
// buiten deze story. Inclusief paard en wederpartij voor de overzichtsregels. Nieuwste
// eerst. De huidige-versie-filtering gebeurt afgeleid in de weergave (huidigeVersies).
export async function getContractsForStable(stableId: string) {
  return prisma.contract.findMany({
    where: { stableId, family: 'STALLING' },
    include: {
      horse: { select: { id: true, name: true } },
      counterparty: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

// Haalt alle stallingscontracten op waarvan de opgegeven gebruiker de wederpartij is
// (STAL-13, #86). Server-side afgedwongen autorisatie voor de eigenaar-weergave: er
// wordt uitsluitend op counterpartyUserId = user.id gefilterd, zodat een eigenaar nooit
// contracten van een ander paard/eigenaar kan opvragen. Concepten (status CONCEPT) zijn
// nog niet aan de eigenaar aangeboden en worden uitgesloten. Stalling-familie; lease valt
// buiten deze story. Inclusief paard voor de overzichtsregels. Nieuwste eerst.
export async function getContractsForEigenaar(userId: string) {
  return prisma.contract.findMany({
    where: {
      counterpartyUserId: userId,
      family: 'STALLING',
      status: { not: 'CONCEPT' },
    },
    include: {
      horse: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

// Haalt het aan een eigenaar aangeboden contract voor een paard op (STAL-09, #82).
// Geeft uitsluitend een contract terug dat status AANGEBODEN heeft én waarvan de
// opgegeven gebruiker de gekoppelde wederpartij (counterpartyUserId) is. Zo ziet de
// eigenaar in zijn weergave alleen een te beoordelen aanbod voor zijn eigen paard.
// Geen aanbod (of geen koppeling) → null, zodat de accepteer-/afwijs-acties niet
// getoond worden.
export async function getAangebodenContractVoorEigenaar(
  horseId: string,
  userId: string,
) {
  return prisma.contract.findFirst({
    where: {
      horseId,
      status: 'AANGEBODEN',
      counterpartyUserId: userId,
      // Alleen stalling: een aangeboden leasecontract kent een eigen ondertekenflow
      // ([Unify 06] #132) i.p.v. de accepteer-/afwijs-actie van de eigenaar.
      family: 'STALLING',
    },
    orderBy: { createdAt: 'desc' },
  })
}

// Haalt het aan de leaser (wederpartij) aangeboden leasecontract voor een paard op
// ([Unify 06] #132). Uitsluitend family=LEASE met status AANGEBODEN waarvan de
// opgegeven gebruiker de wederpartij is, zodat de leaser in zijn weergave het te
// ondertekenen leasecontract ziet. Geen aanbod → null.
export async function getAangebodenLeaseContractVoorLeaser(
  horseId: string,
  userId: string,
) {
  return prisma.contract.findFirst({
    where: {
      horseId,
      status: 'AANGEBODEN',
      counterpartyUserId: userId,
      family: 'LEASE',
    },
    orderBy: { createdAt: 'desc' },
  })
}

// Haalt de gekoppelde bijlagen van een contract op met per bijlage een tijdelijke
// (signed) URL voor inzage (STAL-16). Bedoeld voor server-componenten die de bijlagen
// alleen-lezen tonen (eigenaar-samenvatting, contract-weergave). De *autorisatie* (mag
// deze gebruiker dit contract zien) wordt door de aanroeper afgedwongen; deze helper
// genereert enkel de signed URL's. Geen bijlagen → lege lijst.
export async function getBijlagenMetUrls(
  contractId: string,
): Promise<SamenvattingBijlage[]> {
  const bijlagen = await getBijlagenVoorContract(contractId)
  if (bijlagen.length === 0) return []

  const supabase = createAdminClient()
  const resultaat: SamenvattingBijlage[] = []
  for (const bijlage of bijlagen) {
    const { data } = await supabase.storage
      .from(CONTRACT_BIJLAGEN_BUCKET)
      .createSignedUrl(bijlage.storagePath, 600)
    resultaat.push({
      id: bijlage.id,
      categorie: bijlage.categorie,
      bestandsnaam: bijlage.bestandsnaam,
      url: data?.signedUrl ?? null,
    })
  }
  return resultaat
}

// Eén regel in de nalevings-weergave: een actief plicht-onderdeel met de
// vastgestelde status t.o.v. de gezondheidsregistratie van het paard.
export type NalevingRegel = {
  onderdeel: string
  status: NalevingStatus
}

// Vergelijkt de afgesproken entings-/gezondheidsplicht (STAL-07) met de laatst
// geregistreerde gezondheidsgebeurtenissen van het paard. Alleen-lezen afgeleide
// logica: per actief plicht-onderdeel wordt de nalevingsstatus bepaald. Uitgeschakelde
// onderdelen leveren geen regel op. Wordt server-side aangeroepen vanaf de
// contract-weergave; geeft een lege lijst terug wanneer er geen actieve plicht is.
export async function getGezondheidsplichtNaleving(
  horseId: string,
  plicht: GezondheidsplichtConfig,
): Promise<NalevingRegel[]> {
  const heeftActievePlicht =
    plicht.vaccinatie.actief || plicht.ontworming.actief || plicht.hoefsmid.actief
  if (!heeftActievePlicht) return []

  const vandaag = new Date()
  const regels: NalevingRegel[] = []

  // ── Vaccinatie ──
  if (plicht.vaccinatie.actief) {
    const intervalDagen = maandenNaarDagen(plicht.vaccinatie.intervalMaanden)
    // Wanneer specifieke soorten verplicht zijn, beoordelen we per soort; anders
    // de meest recente vaccinatie als geheel.
    const soorten: (VaccinatieSoort | null)[] =
      plicht.vaccinatie.soorten.length > 0 ? plicht.vaccinatie.soorten : [null]

    for (const soort of soorten) {
      const vaccinaties = await prisma.vaccination.findMany({
        where: { horseId },
        orderBy: { date: 'desc' },
        select: { date: true, nextDate: true, type: true },
      })
      const passend = soort
        ? vaccinaties.find((v) => vaccinatieTypeMatchtSoort(v.type, soort))
        : vaccinaties[0]
      const status = bepaalNalevingStatus(
        passend ? { date: passend.date, nextDate: passend.nextDate } : null,
        intervalDagen,
        vandaag,
      )
      regels.push({
        onderdeel: soort ? `Vaccinatie — ${soort.toLowerCase()}` : 'Vaccinatie',
        status,
      })
    }
  }

  // ── Ontworming / mestonderzoek ──
  if (plicht.ontworming.actief) {
    const intervalDagen = maandenNaarDagen(plicht.ontworming.intervalMaanden)
    const laatste = await prisma.deworming.findFirst({
      where: { horseId },
      orderBy: { date: 'desc' },
      select: { date: true, nextDate: true },
    })
    regels.push({
      onderdeel: 'Ontworming / mestonderzoek',
      status: bepaalNalevingStatus(laatste, intervalDagen, vandaag),
    })
  }

  // ── Hoefsmid ──
  if (plicht.hoefsmid.actief) {
    const intervalDagen = wekenNaarDagen(plicht.hoefsmid.intervalWeken)
    const laatste = await prisma.hoefsmitBezoek.findFirst({
      where: { horseId },
      orderBy: { date: 'desc' },
      select: { date: true, nextDate: true },
    })
    regels.push({
      onderdeel: 'Hoefverzorging',
      status: bepaalNalevingStatus(laatste, intervalDagen, vandaag),
    })
  }

  return regels
}
