import { prisma } from '@/lib/prisma'

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
