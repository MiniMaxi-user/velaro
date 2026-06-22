'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { prisma } from '@/lib/prisma'
import { isPlatformAdmin } from '@/lib/auth/authorization'
import { normaliseerIban, isGeldigeIban } from '@/features/facturen/iban'

async function requirePlatformAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const isAdmin = await isPlatformAdmin(user.id)
  if (!isAdmin) throw new Error('Geen toegang')

  return user
}

export async function createOwnerAccount(formData: FormData) {
  await requirePlatformAdmin()

  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const name = (formData.get('name') as string)?.trim() || null
  const password = formData.get('password') as string
  const maxStables = parseInt(formData.get('maxStables') as string, 10) || 1

  if (!email) throw new Error('E-mailadres is verplicht')
  if (!password || password.length < 8) throw new Error('Wachtwoord moet minimaal 8 tekens bevatten')

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) throw new Error(`Er bestaat al een account voor ${email}`)

  const adminClient = createAdminClient()

  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) throw new Error(`Supabase fout: ${authError.message}`)

  try {
    await prisma.user.create({
      data: { id: authData.user.id, email, name, maxStables, isPlatformAdmin: false },
    })
  } catch (dbError) {
    await adminClient.auth.admin.deleteUser(authData.user.id)
    throw dbError
  }

  revalidatePath('/admin/eigenaren')
  redirect('/admin/eigenaren')
}

export async function updateOwnerBusinessDetails(userId: string, formData: FormData) {
  await requirePlatformAdmin()

  const trim = (key: string): string | null => {
    const value = (formData.get(key) as string | null)?.trim()
    return value ? value : null
  }

  const separateInvoiceAddress = formData.get('separateInvoiceAddress') === 'on'

  // ── Betaalwijze + SEPA-mandaat ([Fact 06] #151) ──────────────────────────────
  // Bij OVERBOEKING blijven de mandaatvelden leeg. Bij SEPA_INCASSO zijn tenaamstelling,
  // IBAN (geldig), mandaatkenmerk en mandaatdatum verplicht; de IBAN wordt genormaliseerd
  // (zonder spaties, hoofdletters) opgeslagen. Validatie wordt hier server-side afgedwongen.
  const paymentMethodRaw = (formData.get('paymentMethod') as string | null)?.trim()
  const paymentMethod = paymentMethodRaw === 'SEPA_INCASSO' ? 'SEPA_INCASSO' : 'OVERBOEKING'

  let sepaAccountHolder: string | null = null
  let sepaIban: string | null = null
  let sepaMandateReference: string | null = null
  let sepaMandateDate: Date | null = null

  if (paymentMethod === 'SEPA_INCASSO') {
    sepaAccountHolder = trim('sepaAccountHolder')
    if (!sepaAccountHolder) {
      throw new Error('De tenaamstelling van de rekeninghouder is verplicht bij SEPA-incasso.')
    }

    const ibanInvoer = trim('sepaIban')
    if (!ibanInvoer) {
      throw new Error('De IBAN is verplicht bij SEPA-incasso.')
    }
    if (!isGeldigeIban(ibanInvoer)) {
      throw new Error('De IBAN is ongeldig. Controleer het rekeningnummer en probeer het opnieuw.')
    }
    sepaIban = normaliseerIban(ibanInvoer)

    sepaMandateReference = trim('sepaMandateReference')
    if (!sepaMandateReference) {
      throw new Error('Het mandaatkenmerk is verplicht bij SEPA-incasso.')
    }

    const mandateDateRaw = trim('sepaMandateDate')
    if (!mandateDateRaw) {
      throw new Error('De mandaatdatum is verplicht bij SEPA-incasso.')
    }
    const d = new Date(mandateDateRaw)
    if (Number.isNaN(d.getTime())) {
      throw new Error('De mandaatdatum is ongeldig.')
    }
    sepaMandateDate = d
  }

  // De zakelijke gegevens staan in een 1-1 gekoppeld profiel dat nog niet hoeft
  // te bestaan voor deze eigenaar — daarom een upsert.
  const profileData = {
    companyName: trim('companyName'),
    address: trim('address'),
    postalCode: trim('postalCode'),
    city: trim('city'),
    country: trim('country'),
    kvkNumber: trim('kvkNumber'),
    vatNumber: trim('vatNumber'),
    separateInvoiceAddress,
    // Staat de optie uit, dan bewaren we geen afwijkend factuuradres: het
    // hoofdadres geldt dan als factuuradres.
    invoiceAddress: separateInvoiceAddress ? trim('invoiceAddress') : null,
    invoicePostalCode: separateInvoiceAddress ? trim('invoicePostalCode') : null,
    invoiceCity: separateInvoiceAddress ? trim('invoiceCity') : null,
    invoiceCountry: separateInvoiceAddress ? trim('invoiceCountry') : null,
    paymentMethod,
    sepaAccountHolder,
    sepaIban,
    sepaMandateReference,
    sepaMandateDate,
  } as const

  await prisma.ownerBusinessProfile.upsert({
    where: { userId },
    create: { userId, ...profileData },
    update: profileData,
  })

  revalidatePath('/admin/eigenaren')
  revalidatePath(`/admin/eigenaren/${userId}`)
}

export async function updateStableQuota(userId: string, formData: FormData) {
  await requirePlatformAdmin()

  const maxStables = parseInt(formData.get('maxStables') as string, 10)
  if (isNaN(maxStables) || maxStables < 0) throw new Error('Ongeldig quotum')

  await prisma.user.update({ where: { id: userId }, data: { maxStables } })

  revalidatePath('/admin/eigenaren')
}
