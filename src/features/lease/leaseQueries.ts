import { prisma } from '@/lib/prisma'

// ── Lease-overeenkomst queries (Lease 06, #65) ───────────────────────────────

export async function getLeasesForHorse(horseId: string) {
  return prisma.lease.findMany({
    where: { horseId },
    include: { leaser: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getLeaseDetail(id: string) {
  return prisma.lease.findUnique({
    where: { id },
    include: {
      leaser: { select: { id: true, name: true, email: true } },
      horse: { select: { id: true, name: true, stableId: true, stable: { select: { name: true } } } },
    },
  })
}
