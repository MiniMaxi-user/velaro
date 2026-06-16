'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

// ── Lease-interesse acties (Lease 05, #64) ───────────────────────────────────

async function authUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return user
}

// Mag de gebruiker bij deze thread? Inquirer óf stallid van de stal van het paard.
async function magBijInquiry(userId: string, inquiryId: string): Promise<boolean> {
  const inq = await prisma.leaseInquiry.findUnique({
    where: { id: inquiryId },
    include: { listing: { include: { horse: { select: { stableId: true } } } } },
  })
  if (!inq) return false
  if (inq.inquirerUserId === userId) return true
  const member = await prisma.stableMember.findFirst({
    where: { userId, stableId: inq.listing.horse.stableId },
  })
  return member !== null
}

export async function startInquiry(listingId: string, formData: FormData) {
  const user = await authUser()
  const body = (formData.get('body') as string)?.trim()
  if (!body) throw new Error('Schrijf een bericht.')

  const listing = await prisma.leaseListing.findFirst({
    where: { id: listingId, isActive: true },
    include: { horse: { select: { stableId: true } } },
  })
  if (!listing) throw new Error('Aanbod niet gevonden of niet meer actief.')

  // Geen interesse in je eigen aanbod (stallid van de aanbiedende stal).
  const isStaf = await prisma.stableMember.findFirst({
    where: { userId: user.id, stableId: listing.horse.stableId },
  })
  if (isStaf) throw new Error('Je kunt geen interesse tonen in je eigen aanbod.')

  const inquiry = await prisma.leaseInquiry.upsert({
    where: { listingId_inquirerUserId: { listingId, inquirerUserId: user.id } },
    update: { updatedAt: new Date() },
    create: { listingId, inquirerUserId: user.id },
  })
  await prisma.leaseInquiryMessage.create({
    data: { inquiryId: inquiry.id, authorId: user.id, body },
  })

  revalidatePath('/berichten')
  redirect(`/berichten?thread=${inquiry.id}`)
}

export async function replyInquiry(inquiryId: string, formData: FormData) {
  const user = await authUser()
  if (!(await magBijInquiry(user.id, inquiryId))) throw new Error('Geen toegang')

  const body = (formData.get('body') as string)?.trim()
  if (body) {
    await prisma.leaseInquiryMessage.create({
      data: { inquiryId, authorId: user.id, body },
    })
    await prisma.leaseInquiry.update({ where: { id: inquiryId }, data: { updatedAt: new Date() } })
  }

  revalidatePath('/berichten')
  redirect(`/berichten?thread=${inquiryId}`)
}
