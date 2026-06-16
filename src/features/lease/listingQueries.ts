import { prisma } from '@/lib/prisma'

// ── Lease-aanbod queries (Lease 03, #62) ─────────────────────────────────────
// Een paard heeft maximaal één lease-aanbod (LeaseListing) tegelijk; dit wordt
// beheerd vanaf het paardprofiel. De marktplaats (Lease 04) toont uitsluitend
// actieve listings.

export async function getLeaseListingForHorse(horseId: string) {
  return prisma.leaseListing.findFirst({
    where: { horseId },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getLeaseListing(id: string) {
  return prisma.leaseListing.findUnique({ where: { id } })
}
