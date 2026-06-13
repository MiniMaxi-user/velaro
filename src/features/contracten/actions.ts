'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getStableRole } from '@/lib/auth/authorization'
import { BOXTYPE_LABELS, type Boxtype, type HuisvestingConfig } from './huisvesting'

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

  // Huisvesting-opties (STAL-03) als JSON-blok onder config.huisvesting bewaren.
  // Bestaande config-sleutels van andere stories blijven behouden.
  const huisvesting = leesHuisvestingForm(formData)
  const bestaandeConfig =
    contract.config && typeof contract.config === 'object' && !Array.isArray(contract.config)
      ? (contract.config as Record<string, unknown>)
      : {}
  const nieuweConfig = { ...bestaandeConfig, huisvesting }

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
