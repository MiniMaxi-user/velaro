import { prisma } from '@/lib/prisma'

export async function getStableWithMembers(stableId: string) {
  return prisma.stable.findUnique({
    where: { id: stableId },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })
}
