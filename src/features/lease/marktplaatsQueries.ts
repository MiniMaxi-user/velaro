import { prisma } from '@/lib/prisma'
import type { LeaseType, Prisma } from '@prisma/client'

// ── Marktplaats-queries (Lease 04, #63) ──────────────────────────────────────
// Actieve lease-listings over álle stallen heen (open-platform-visie), met
// server-side filtering. De marktplaats toont uitsluitend isActive listings.

export type LeaseFilter = {
  leaseType?: LeaseType
  discipline?: string
  region?: string
  maxDaysPerWeek?: number
  minPrice?: number
  maxPrice?: number
  movable?: boolean
}

const HORSE_SELECT = {
  id: true,
  name: true,
  breed: true,
  dateOfBirth: true,
  sex: true,
  discipline: true,
  disciplineLevel: true,
  photoPath: true,
} as const

export async function getActiveLeaseListings(filter: LeaseFilter = {}) {
  const where: Prisma.LeaseListingWhereInput = { isActive: true }

  if (filter.leaseType) where.leaseType = filter.leaseType
  if (filter.discipline) where.discipline = { contains: filter.discipline, mode: 'insensitive' }
  if (filter.region) where.region = { contains: filter.region, mode: 'insensitive' }
  if (filter.movable) where.movable = true
  if (filter.maxDaysPerWeek != null) where.daysPerWeek = { lte: filter.maxDaysPerWeek }
  if (filter.minPrice != null || filter.maxPrice != null) {
    where.pricePerMonth = {
      ...(filter.minPrice != null ? { gte: filter.minPrice } : {}),
      ...(filter.maxPrice != null ? { lte: filter.maxPrice } : {}),
    }
  }

  return prisma.leaseListing.findMany({
    where,
    include: { horse: { select: HORSE_SELECT } },
    orderBy: { createdAt: 'desc' },
  })
}

// Eén actieve listing met paardcontext voor de detailpagina. Inactieve listings
// zijn niet publiek opvraagbaar.
export async function getActiveLeaseListingDetail(id: string) {
  return prisma.leaseListing.findFirst({
    where: { id, isActive: true },
    include: { horse: { select: HORSE_SELECT } },
  })
}
