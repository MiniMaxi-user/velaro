import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

// ── Lease-interesse queries (Lease 05, #64) ──────────────────────────────────
// Threads waarbij de gebruiker betrokken is: als geïnteresseerde (inquirer) óf als
// stallid (OWNER/STAFF) van de stal van het aangeboden paard.

async function myStableIds(userId: string): Promise<string[]> {
  const m = await prisma.stableMember.findMany({ where: { userId }, select: { stableId: true } })
  return m.map((x) => x.stableId)
}

async function inquiryWhereForUser(userId: string): Promise<Prisma.LeaseInquiryWhereInput> {
  const stableIds = await myStableIds(userId)
  return {
    OR: [
      { inquirerUserId: userId },
      ...(stableIds.length ? [{ listing: { horse: { stableId: { in: stableIds } } } }] : []),
    ],
  }
}

export async function getInquiriesForUser(userId: string) {
  const where = await inquiryWhereForUser(userId)
  return prisma.leaseInquiry.findMany({
    where,
    include: {
      listing: { include: { horse: { select: { id: true, name: true } } } },
      inquirer: { select: { id: true, name: true, email: true } },
      messages: {
        orderBy: { createdAt: 'asc' },
        include: { author: { select: { id: true, name: true, email: true } } },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })
}

// Ongelezen lease-berichten (van de wederpartij) voor de topbar-indicator.
export async function getLeaseUnreadCount(userId: string): Promise<number> {
  const where = await inquiryWhereForUser(userId)
  return prisma.leaseInquiryMessage.count({
    where: { authorId: { not: userId }, readAt: null, inquiry: where },
  })
}

// Markeert de berichten van de wederpartij in één thread als gelezen. Aanroepbaar
// vanuit de (server) berichtenpagina; de toegang is al geborgd doordat de thread in
// de lijst van de gebruiker voorkomt.
export async function markInquiryReadInline(userId: string, inquiryId: string): Promise<void> {
  await prisma.leaseInquiryMessage.updateMany({
    where: { inquiryId, authorId: { not: userId }, readAt: null },
    data: { readAt: new Date() },
  })
}
