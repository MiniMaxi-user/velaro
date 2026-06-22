'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { canCreateStable } from '@/lib/auth/authorization'
import { activeStableCookieName, ALLE_STALLEN } from '@/lib/active-stable'
import { normaliseerIban, isGeldigeIban } from '@/features/facturen/iban'

export async function createStable(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const canCreate = await canCreateStable(user.id)
  if (!canCreate) throw new Error('Je hebt het maximale aantal stallen bereikt. Neem contact op met Velaro om je quotum te verhogen.')

  const name = (formData.get('name') as string)?.trim()
  const address = (formData.get('address') as string)?.trim() || null
  const postalCode = (formData.get('postalCode') as string)?.trim() || null
  const city = (formData.get('city') as string)?.trim() || null

  if (!name) throw new Error('Stalnaam is verplicht')

  const stable = await prisma.stable.create({
    data: {
      name,
      address,
      postalCode,
      city,
      members: {
        create: { userId: user.id, role: 'OWNER' },
      },
    },
  })

  const cookieStore = await cookies()
  cookieStore.set(activeStableCookieName(), stable.id, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  })

  revalidatePath('/stallen')
  redirect('/stal')
}

/**
 * Bepaalt een veilig pad om naartoe terug te keren na een stalwissel.
 * Alleen interne app-paden zijn toegestaan; bij twijfel valt het terug op '/stal'.
 */
function safeReturnTo(raw: string | null): string {
  if (!raw) return '/stal'
  // Moet een relatief in-app pad zijn (geen protocol-relatieve of externe URL)
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/stal'
  return raw
}

export async function switchActiveStable(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const stableId = formData.get('stableId') as string
  if (!stableId) return

  // Schildwacht-waarde: geen member-check nodig
  if (stableId !== ALLE_STALLEN) {
    const member = await prisma.stableMember.findUnique({
      where: { stableId_userId: { stableId, userId: user.id } },
    })
    if (!member) throw new Error('Geen toegang tot deze stal')
  }

  const cookieStore = await cookies()
  cookieStore.set(activeStableCookieName(), stableId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  })

  // Blijf op de pagina waar de gebruiker is; alleen de data herlaadt.
  const returnTo = safeReturnTo(formData.get('returnTo') as string | null)
  redirect(returnTo)
}

export async function updateStable(stableId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Alleen de OWNER mag de stalgegevens bewerken
  const member = await prisma.stableMember.findUnique({
    where: { stableId_userId: { stableId, userId: user.id } },
  })
  if (!member || member.role !== 'OWNER') throw new Error('Geen toegang')

  const name = (formData.get('name') as string)?.trim()
  if (!name) throw new Error('Stalnaam is verplicht')

  const str = (key: string) => (formData.get(key) as string)?.trim() || null

  // Stal-IBAN ([Fact 06] #151): optioneel, maar wanneer ingevuld gevalideerd (ISO 13616)
  // en genormaliseerd (zonder spaties, hoofdletters) opgeslagen.
  const ibanInvoer = str('iban')
  let iban: string | null = null
  if (ibanInvoer) {
    if (!isGeldigeIban(ibanInvoer)) {
      throw new Error('De IBAN is ongeldig. Controleer het rekeningnummer en probeer het opnieuw.')
    }
    iban = normaliseerIban(ibanInvoer)
  }

  await prisma.stable.update({
    where: { id: stableId },
    data: {
      name,
      address:           str('address'),
      postalCode:        str('postalCode'),
      city:              str('city'),
      phone:             str('phone'),
      email:             str('email'),
      website:           str('website'),
      description:       str('description'),
      openingHours:      str('openingHours'),
      invoiceAddress:    str('invoiceAddress'),
      invoicePostalCode: str('invoicePostalCode'),
      invoiceCity:       str('invoiceCity'),
      iban,
      accountHolder:     str('accountHolder'),
    },
  })

  revalidatePath('/stallen')
  revalidatePath(`/stallen/${stableId}/bewerken`)
  redirect('/stallen')
}
