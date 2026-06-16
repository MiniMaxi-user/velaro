import { prisma } from '@/lib/prisma'
import { datumVanYmd } from './kalenderHelpers'

// Claims van een paard binnen een weekvenster (inclusief grenzen), met de naam van
// de claimer voor de kleurcodering (Lease 09, #68).
export async function getClaimsVoorWeek(horseId: string, startYmd: string, endYmd: string) {
  return prisma.leaseDagdeelClaim.findMany({
    where: {
      horseId,
      datum: { gte: datumVanYmd(startYmd), lte: datumVanYmd(endYmd) },
    },
    include: { user: { select: { id: true, name: true, email: true } } },
  })
}
