import { prisma } from '@/lib/prisma'

export type GezondheidActie = {
  id: string
  horseId: string
  horseName: string
  type: 'vaccinatie' | 'ontworming' | 'hoefsmit'
  omschrijving: string
  nextDate: Date
  isVerlopen: boolean
}

export async function getAankomendGezondheidActies(
  stableId: string,
  dagenVooruit = 30,
): Promise<GezondheidActie[]> {
  const vandaag = new Date()
  vandaag.setHours(0, 0, 0, 0)

  const grens = new Date(vandaag)
  grens.setDate(grens.getDate() + dagenVooruit)

  const [vaccinaties, ontwormingen, hoefsmitBezoeKen] = await Promise.all([
    prisma.vaccination.findMany({
      where: {
        nextDate: { lte: grens },
        horse: { stableId },
      },
      include: { horse: { select: { id: true, name: true } } },
    }),
    prisma.deworming.findMany({
      where: {
        nextDate: { lte: grens },
        horse: { stableId },
      },
      include: { horse: { select: { id: true, name: true } } },
    }),
    prisma.hoefsmitBezoek.findMany({
      where: {
        nextDate: { lte: grens },
        horse: { stableId },
      },
      include: { horse: { select: { id: true, name: true } } },
    }),
  ])

  const acties: GezondheidActie[] = [
    ...vaccinaties
      .filter((v) => v.nextDate !== null)
      .map((v) => ({
        id: v.id,
        horseId: v.horse.id,
        horseName: v.horse.name,
        type: 'vaccinatie' as const,
        omschrijving: v.type,
        nextDate: v.nextDate!,
        isVerlopen: v.nextDate! < vandaag,
      })),
    ...ontwormingen
      .filter((d) => d.nextDate !== null)
      .map((d) => ({
        id: d.id,
        horseId: d.horse.id,
        horseName: d.horse.name,
        type: 'ontworming' as const,
        omschrijving: d.product,
        nextDate: d.nextDate!,
        isVerlopen: d.nextDate! < vandaag,
      })),
    ...hoefsmitBezoeKen
      .filter((h) => h.nextDate !== null)
      .map((h) => ({
        id: h.id,
        horseId: h.horse.id,
        horseName: h.horse.name,
        type: 'hoefsmit' as const,
        omschrijving: h.hoefsmid ? `Hoefsmid: ${h.hoefsmid}` : 'Hoefsmit',
        nextDate: h.nextDate!,
        isVerlopen: h.nextDate! < vandaag,
      })),
  ]

  acties.sort((a, b) => a.nextDate.getTime() - b.nextDate.getTime())

  return acties
}

export async function getZorgActiesVoorPaard(
  horseId: string,
  dagenVooruit = 60,
): Promise<GezondheidActie[]> {
  const vandaag = new Date()
  vandaag.setHours(0, 0, 0, 0)

  const grens = new Date(vandaag)
  grens.setDate(grens.getDate() + dagenVooruit)

  const [vaccinaties, ontwormingen, hoefsmitBezoeKen] = await Promise.all([
    prisma.vaccination.findMany({
      where: {
        horseId,
        nextDate: { lte: grens },
      },
      include: { horse: { select: { id: true, name: true } } },
    }),
    prisma.deworming.findMany({
      where: {
        horseId,
        nextDate: { lte: grens },
      },
      include: { horse: { select: { id: true, name: true } } },
    }),
    prisma.hoefsmitBezoek.findMany({
      where: {
        horseId,
        nextDate: { lte: grens },
      },
      include: { horse: { select: { id: true, name: true } } },
    }),
  ])

  const acties: GezondheidActie[] = [
    ...vaccinaties
      .filter((v) => v.nextDate !== null)
      .map((v) => ({
        id: v.id,
        horseId: v.horse.id,
        horseName: v.horse.name,
        type: 'vaccinatie' as const,
        omschrijving: v.type,
        nextDate: v.nextDate!,
        isVerlopen: v.nextDate! < vandaag,
      })),
    ...ontwormingen
      .filter((d) => d.nextDate !== null)
      .map((d) => ({
        id: d.id,
        horseId: d.horse.id,
        horseName: d.horse.name,
        type: 'ontworming' as const,
        omschrijving: d.product,
        nextDate: d.nextDate!,
        isVerlopen: d.nextDate! < vandaag,
      })),
    ...hoefsmitBezoeKen
      .filter((h) => h.nextDate !== null)
      .map((h) => ({
        id: h.id,
        horseId: h.horse.id,
        horseName: h.horse.name,
        type: 'hoefsmit' as const,
        omschrijving: h.hoefsmid ? `Hoefsmid: ${h.hoefsmid}` : 'Hoefsmit',
        nextDate: h.nextDate!,
        isVerlopen: h.nextDate! < vandaag,
      })),
  ]

  acties.sort((a, b) => a.nextDate.getTime() - b.nextDate.getTime())

  return acties
}

export async function getVaccinaties(horseId: string) {
  return prisma.vaccination.findMany({
    where: { horseId },
    orderBy: { date: 'desc' },
  })
}

export async function getVaccinatie(id: string) {
  return prisma.vaccination.findUnique({ where: { id } })
}

export async function getOntwormingen(horseId: string) {
  return prisma.deworming.findMany({
    where: { horseId },
    orderBy: { date: 'desc' },
  })
}

export async function getOntworming(id: string) {
  return prisma.deworming.findUnique({ where: { id } })
}

export async function getDierenartsBezzoeken(horseId: string) {
  return prisma.vetVisit.findMany({
    where: { horseId },
    orderBy: { date: 'desc' },
  })
}

export async function getDierenartsBeezoek(id: string) {
  return prisma.vetVisit.findUnique({ where: { id } })
}

export async function getHoefsmitBezoeKen(horseId: string) {
  return prisma.hoefsmitBezoek.findMany({
    where: { horseId },
    orderBy: { date: 'desc' },
  })
}

export async function getHoefsmitBezoek(id: string) {
  return prisma.hoefsmitBezoek.findUnique({ where: { id } })
}

export async function getMetingen(horseId: string) {
  return prisma.bodyMeasurement.findMany({
    where: { horseId },
    orderBy: { date: 'desc' },
  })
}

export async function getMeting(id: string) {
  return prisma.bodyMeasurement.findUnique({ where: { id } })
}
