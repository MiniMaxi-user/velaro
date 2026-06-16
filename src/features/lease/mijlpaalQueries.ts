import { prisma } from '@/lib/prisma'
import { berekenLeaseMijlpalen, isRelevant, type LeaseMijlpaal } from './leaseMijlpalen'

export type MijlpaalRegel = LeaseMijlpaal & {
  horseId: string
  horseName: string
  leaserNaam: string
}

// Relevante lease-mijlpalen voor één gebruiker: leases waarvan hij leaser is, leases
// op zijn eigen paard(en), of leases binnen zijn stal(len). Server-side afgeleid uit
// de Lease-velden (Lease 10, #69).
export async function getLeaseMijlpalenForUser(userId: string): Promise<MijlpaalRegel[]> {
  const memberships = await prisma.stableMember.findMany({ where: { userId }, select: { stableId: true } })
  const stableIds = memberships.map((m) => m.stableId)

  const leases = await prisma.lease.findMany({
    where: {
      status: 'ACTIEF',
      OR: [
        { leaserUserId: userId },
        { horse: { people: { some: { userId, isOwner: true } } } },
        ...(stableIds.length ? [{ horse: { stableId: { in: stableIds } } }] : []),
      ],
    },
    include: {
      horse: { select: { id: true, name: true } },
      leaser: { select: { name: true, email: true } },
    },
  })

  const vandaag = new Date()
  const regels: MijlpaalRegel[] = []
  for (const lease of leases) {
    for (const m of berekenLeaseMijlpalen(lease, vandaag)) {
      if (!isRelevant(m, vandaag)) continue
      regels.push({
        ...m,
        horseId: lease.horse.id,
        horseName: lease.horse.name,
        leaserNaam: lease.leaser.name ?? lease.leaser.email,
      })
    }
  }

  regels.sort((a, b) => a.datum.getTime() - b.datum.getTime())
  return regels
}
