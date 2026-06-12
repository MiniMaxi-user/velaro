import { prisma } from '@/lib/prisma'

export async function getNotesForHorse(horseId: string, limit = 20) {
  return prisma.stableNote.findMany({
    where: { horseId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      author: { select: { name: true, email: true } },
    },
  })
}

export async function getUnreadCountForOwner(userId: string, horseId: string) {
  const gelezen = await prisma.stableNoteRead.findMany({
    where: { userId },
    select: { noteId: true },
  })
  const gelezenIds = new Set(gelezen.map((r) => r.noteId))

  const totaal = await prisma.stableNote.count({ where: { horseId } })
  const ongelezen = await prisma.stableNote.count({
    where: { horseId, id: { notIn: [...gelezenIds] } },
  })
  return { totaal, ongelezen }
}
