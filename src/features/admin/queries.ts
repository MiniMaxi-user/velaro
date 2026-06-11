import { prisma } from '@/lib/prisma'

export async function getAdminDashboardStats() {
  const [
    totalStables,
    totalHorses,
    totalOwnerAccounts,
    totalHorseOwners,
    recentStables,
    recentOwners,
  ] = await Promise.all([
    prisma.stable.count(),
    prisma.horse.count(),
    prisma.user.count({ where: { isPlatformAdmin: false, maxStables: { gt: 0 } } }),
    prisma.user.count({
      where: {
        isPlatformAdmin: false,
        horseOwnerships: { some: {} },
      },
    }),
    prisma.stable.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        _count: { select: { horses: true, members: true } },
        members: {
          where: { role: 'OWNER' },
          include: { user: { select: { name: true, email: true } } },
          take: 1,
        },
      },
    }),
    prisma.user.findMany({
      where: { isPlatformAdmin: false },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        maxStables: true,
        _count: {
          select: { stableMemberships: { where: { role: 'OWNER' } } },
        },
      },
    }),
  ])

  return {
    totalStables,
    totalHorses,
    totalOwnerAccounts,
    totalHorseOwners,
    recentStables,
    recentOwners,
  }
}

export async function getAllStables() {
  return prisma.stable.findMany({
    include: {
      _count: { select: { horses: true, members: true } },
      members: {
        where: { role: 'OWNER' },
        include: { user: { select: { name: true, email: true } } },
        take: 1,
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getAllHorses() {
  return prisma.horse.findMany({
    include: {
      stable: { select: { id: true, name: true } },
    },
    orderBy: { name: 'asc' },
  })
}

export async function getOwnerAccounts() {
  return prisma.user.findMany({
    where: { isPlatformAdmin: false },
    include: {
      _count: {
        select: { stableMemberships: { where: { role: 'OWNER' } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getOwnerAccount(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      stableMemberships: {
        where: { role: 'OWNER' },
        include: { stable: { select: { id: true, name: true, city: true } } },
      },
    },
  })
}
