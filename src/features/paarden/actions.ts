'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getStableRole } from '@/lib/auth/authorization'
import type {
  HorseSex,
  HorseRelatietype,
  HorseStallingsvorm,
  HorseEigendom,
} from '@prisma/client'
import { getUserStable } from './queries'
import { createAdminClient } from '@/lib/supabase/admin'
import { normalizeChipNumber, validateHorseFields } from './paardValidation'

async function getCurrentUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return user
}

/**
 * Resultaat van een paard-formulieractie. Bij succes wordt geredirect (er komt
 * dan niets terug); faalt validatie of autorisatie, dan komt het resultaat als
 * waarde terug — niet via een throw. Dat is bewust: uit een server action
 * gegooide foutmeldingen worden in een productiebuild gemaskeerd (alleen
 * `digest` blijft over), waardoor een veldmelding de client nooit bereikt.
 * Door te `return`-en blijft de melding (en de veld-identifier) intact.
 */
type HorseFormResult = {
  error?: string
  fieldError?: { field: string; message: string }
}

/**
 * Resultaat van `parseHorseFormData`: óf de geparste data, óf een veldgebonden
 * validatiefout. De `field` komt overeen met de `name` van het formulierveld in
 * `PaardForm`, zodat de client de melding bij het juiste veld kan tonen
 * (`.input.is-error` + `.form-error`).
 */
type ParsedHorse = ReturnType<typeof buildHorseData>
type ParseResult =
  | { fieldError: { field: string; message: string } }
  | { data: ParsedHorse }

function buildHorseData(formData: FormData, name: string, chipNumber: string | null) {
  const dateOfBirthStr = formData.get('dateOfBirth') as string
  const sexStr = formData.get('sex') as string
  const relatietypeStr = (formData.get('relatietype') as string)?.trim()
  const stallingsvormStr = (formData.get('stallingsvorm') as string)?.trim()
  const excludedFromConsumption = formData.get('excludedFromConsumption') === 'true'
  const excludedDateStr = formData.get('excludedFromConsumptionDate') as string

  return {
    name,
    breed: (formData.get('breed') as string)?.trim() || null,
    dateOfBirth: dateOfBirthStr ? new Date(dateOfBirthStr) : null,
    sex: sexStr ? (sexStr as HorseSex) : null,
    relatietype: relatietypeStr ? (relatietypeStr as HorseRelatietype) : null,
    stallingsvorm: stallingsvormStr ? (stallingsvormStr as HorseStallingsvorm) : null,
    color: (formData.get('color') as string)?.trim() || null,
    chipNumber,
    ueln: (formData.get('ueln') as string)?.trim() || null,
    passportNumber: (formData.get('passportNumber') as string)?.trim() || null,
    boxNumber: (formData.get('boxNumber') as string)?.trim() || null,
    sireName: (formData.get('sireName') as string)?.trim() || null,
    damName: (formData.get('damName') as string)?.trim() || null,
    discipline: (formData.get('discipline') as string)?.trim() || null,
    disciplineLevel: (formData.get('disciplineLevel') as string)?.trim() || null,
    excludedFromConsumption,
    excludedFromConsumptionDate:
      excludedFromConsumption && excludedDateStr ? new Date(excludedDateStr) : null,
  }
}

/**
 * Valideert en parseert het paard-formulier. Geeft bij een veldfout een
 * `fieldError` terug (niet gooien), zodat de aanroeper die als waarde kan
 * doorgeven aan de client. De validatieregels (verplicht `name`, 15-cijfer
 * `chipNumber`) leven in `paardValidation` zodat ze los testbaar zijn.
 */
function parseHorseFormData(formData: FormData): ParseResult {
  const name = (formData.get('name') as string)?.trim()
  const chipNumber = normalizeChipNumber(formData.get('chipNumber') as string)

  const fieldError = validateHorseFields({ name, chipNumber })
  if (fieldError) return { fieldError }

  return { data: buildHorseData(formData, name as string, chipNumber) }
}

export async function createHorse(formData: FormData): Promise<HorseFormResult> {
  const user = await getCurrentUser()

  const stable = await getUserStable(user.id)
  if (!stable) return { error: 'Geen stal gevonden voor deze gebruiker' }

  const role = await getStableRole(user.id, stable.id)
  if (!role) return { error: 'Geen toegang' }

  const parsed = parseHorseFormData(formData)
  if ('fieldError' in parsed) return { fieldError: parsed.fieldError }

  const horse = await prisma.horse.create({
    data: { ...parsed.data, stableId: stable.id },
  })

  revalidatePath('/paarden')
  redirect(`/paarden/${horse.id}`)
}

export async function updateHorse(id: string, formData: FormData): Promise<HorseFormResult> {
  const user = await getCurrentUser()

  const horse = await prisma.horse.findUnique({ where: { id } })
  if (!horse) return { error: 'Paard niet gevonden' }

  const role = await getStableRole(user.id, horse.stableId)
  if (!role) return { error: 'Geen toegang' }

  const parsed = parseHorseFormData(formData)
  if ('fieldError' in parsed) return { fieldError: parsed.fieldError }

  await prisma.horse.update({ where: { id }, data: parsed.data })

  revalidatePath(`/paarden/${id}`)
  redirect(`/paarden/${id}`)
}

/**
 * Zet het eigendom van het paard: STAL (de stal zelf is eigenaar) of PARTICULIER
 * (een externe, particuliere eigenaar via HorsePerson). Bron van waarheid voor de
 * contract-poort en de eigenaar-kant van (lease)contracten.
 */
export async function setHorseEigendom(
  horseId: string,
  eigendom: HorseEigendom
): Promise<{ error: string } | undefined> {
  const ctx = await getStaffHorse(horseId)
  if (ctx.error) return { error: ctx.error }

  if (eigendom !== 'STAL' && eigendom !== 'PARTICULIER') {
    return { error: 'Ongeldige eigendomswaarde' }
  }

  await prisma.horse.update({ where: { id: horseId }, data: { eigendom } })

  revalidatePath(`/paarden/${horseId}`)
}

// ── Personen (eigenaar / bereider) ──────────────────────────────────────────
// Een persoon (account) is via HorsePerson aan een paard gekoppeld met één of
// beide rollen (isOwner / isRider). App-invariant: minstens één rol actief,
// anders bestaat de koppeling niet.

type PersonRole = 'owner' | 'rider'

function parseRoles(formData: FormData): { isOwner: boolean; isRider: boolean } {
  return {
    isOwner: formData.get('isOwner') === 'true',
    isRider: formData.get('isRider') === 'true',
  }
}

type StaffHorse = Awaited<ReturnType<typeof prisma.horse.findUnique>>

// Helper: laad het paard en controleer dat de huidige gebruiker OWNER/STAFF is.
async function getStaffHorse(
  horseId: string
): Promise<{ error: string } | { error?: undefined; horse: NonNullable<StaffHorse> }> {
  const user = await getCurrentUser()

  const horse = await prisma.horse.findUnique({ where: { id: horseId } })
  if (!horse) return { error: 'Paard niet gevonden' }

  const role = await getStableRole(user.id, horse.stableId)
  if (!role) return { error: 'Geen toegang' }

  return { horse }
}

/**
 * Koppelt een bestaande persoon (account) via e-mailadres aan een paard met de
 * gekozen rollen. Minstens één rol is verplicht.
 */
export async function addHorsePerson(
  horseId: string,
  formData: FormData
): Promise<{ error: string } | undefined> {
  const ctx = await getStaffHorse(horseId)
  if (ctx.error) return { error: ctx.error }

  const email = (formData.get('email') as string)?.trim().toLowerCase()
  if (!email) return { error: 'E-mailadres is verplicht' }

  const { isOwner, isRider } = parseRoles(formData)
  if (!isOwner && !isRider) return { error: 'Kies minstens één rol (eigenaar of bereider).' }

  const targetUser = await prisma.user.findUnique({ where: { email } })
  if (!targetUser)
    return { error: `Geen account gevonden voor ${email}. Vraag deze persoon eerst in te loggen op Velaro, of maak een account aan.` }

  const existing = await prisma.horsePerson.findUnique({
    where: { horseId_userId: { horseId, userId: targetUser.id } },
  })
  if (existing) return { error: 'Deze persoon is al gekoppeld aan dit paard' }

  await prisma.horsePerson.create({
    data: { horseId, userId: targetUser.id, isOwner, isRider },
  })

  revalidatePath(`/paarden/${horseId}`)
}

/**
 * Zet één rol (eigenaar/bereider) van een gekoppelde persoon aan of uit. Wordt
 * de laatste actieve rol uitgezet, dan wordt de persoon ontkoppeld (de koppeling
 * verwijderd) — een koppeling zonder rol bestaat niet.
 */
export async function toggleHorsePersonRole(
  horseId: string,
  personId: string,
  role: PersonRole,
  enabled: boolean
): Promise<{ error: string } | undefined> {
  const ctx = await getStaffHorse(horseId)
  if (ctx.error) return { error: ctx.error }

  const person = await prisma.horsePerson.findUnique({ where: { id: personId } })
  if (!person || person.horseId !== horseId) return { error: 'Persoon niet gevonden' }

  const next = {
    isOwner: role === 'owner' ? enabled : person.isOwner,
    isRider: role === 'rider' ? enabled : person.isRider,
  }

  // Laatste rol uitgezet → ontkoppelen.
  if (!next.isOwner && !next.isRider) {
    await prisma.horsePerson.delete({ where: { id: personId } })
  } else {
    await prisma.horsePerson.update({ where: { id: personId }, data: next })
  }

  revalidatePath(`/paarden/${horseId}`)
}

/**
 * Ontkoppelt een persoon volledig van het paard (verwijdert alle rollen).
 */
export async function removeHorsePerson(
  horseId: string,
  personId: string
): Promise<{ error: string } | undefined> {
  const ctx = await getStaffHorse(horseId)
  if (ctx.error) return { error: ctx.error }

  const person = await prisma.horsePerson.findUnique({ where: { id: personId } })
  if (!person || person.horseId !== horseId) return { error: 'Persoon niet gevonden' }

  await prisma.horsePerson.delete({ where: { id: personId } })

  revalidatePath(`/paarden/${horseId}`)
}

/**
 * Maakt een account aan (of hergebruikt een bestaand account) en koppelt de
 * persoon met de gekozen rollen aan het paard. Minstens één rol is verplicht.
 */
export async function createAndLinkPerson(
  horseId: string,
  formData: FormData
): Promise<{ error: string } | undefined> {
  const ctx = await getStaffHorse(horseId)
  if (ctx.error) return { error: ctx.error }

  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const name = (formData.get('name') as string)?.trim() || null
  const password = formData.get('password') as string

  if (!email) return { error: 'E-mailadres is verplicht' }
  if (!password || password.length < 8) return { error: 'Wachtwoord moet minimaal 8 tekens bevatten' }

  const { isOwner, isRider } = parseRoles(formData)
  if (!isOwner && !isRider) return { error: 'Kies minstens één rol (eigenaar of bereider).' }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    const alreadyLinked = await prisma.horsePerson.findUnique({
      where: { horseId_userId: { horseId, userId: existing.id } },
    })
    if (alreadyLinked) return { error: 'Deze persoon is al gekoppeld aan dit paard' }
    await prisma.horsePerson.create({ data: { horseId, userId: existing.id, isOwner, isRider } })
    revalidatePath(`/paarden/${horseId}`)
    redirect(`/paarden/${horseId}`)
  }

  const adminClient = createAdminClient()
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) return { error: `Fout bij aanmaken account: ${authError.message}` }

  try {
    await prisma.user.create({
      data: { id: authData.user.id, email, name, maxStables: 0, isPlatformAdmin: false },
    })
    await prisma.horsePerson.create({ data: { horseId, userId: authData.user.id, isOwner, isRider } })
  } catch {
    await adminClient.auth.admin.deleteUser(authData.user.id)
    return { error: 'Fout bij opslaan in database. Account is teruggedraaid.' }
  }

  revalidatePath(`/paarden/${horseId}`)
  redirect(`/paarden/${horseId}`)
}

export async function saveFeedingPlan(
  horseId: string,
  formData: FormData
): Promise<{ error: string } | undefined> {
  const user = await getCurrentUser()

  const horse = await prisma.horse.findUnique({ where: { id: horseId } })
  if (!horse) return { error: 'Paard niet gevonden' }

  const role = await getStableRole(user.id, horse.stableId)
  if (!role) return { error: 'Geen toegang' }

  const veld = (key: string) => (formData.get(key) as string)?.trim() || null

  const data = {
    roughage: veld('roughage'),
    concentrate: veld('concentrate'),
    supplements: veld('supplements'),
    restrictions: veld('restrictions'),
    notes: veld('notes'),
  }

  await prisma.feedingPlan.upsert({
    where: { horseId },
    create: { horseId, ...data },
    update: data,
  })

  revalidatePath(`/paarden/${horseId}`)
}

export async function deleteHorse(id: string) {
  const user = await getCurrentUser()

  const horse = await prisma.horse.findUnique({ where: { id } })
  if (!horse) throw new Error('Paard niet gevonden')

  const role = await getStableRole(user.id, horse.stableId)
  if (role !== 'OWNER') throw new Error('Alleen staleigenaren mogen paarden verwijderen')

  await prisma.horse.delete({ where: { id } })

  revalidatePath('/paarden')
  redirect('/paarden')
}
