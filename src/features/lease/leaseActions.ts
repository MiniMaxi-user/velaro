'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getStableRole } from '@/lib/auth/authorization'
import { leesLeaseContract, isVolledigOndertekend } from './leaseContractConfig'
import type { LeaseType, Prisma } from '@prisma/client'

// ── Lease-overeenkomst acties (Lease 06, #65) ────────────────────────────────

const GELDIGE_TYPES: LeaseType[] = ['FULL', 'DEEL', 'BIJRIJDEN', 'WEDSTRIJD', 'KOOPOPTIE', 'FOK']

async function authUserId(): Promise<string> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return user.id
}

// Context voor een bestaande lease: laadt de lease en bepaalt of de gebruiker stal
// (OWNER/STAFF van de stal van het paard) of de leaser is.
async function getLeaseCtx(leaseId: string) {
  const userId = await authUserId()
  const lease = await prisma.lease.findUnique({
    where: { id: leaseId },
    include: { horse: { select: { stableId: true } } },
  })
  if (!lease) throw new Error('Lease niet gevonden')
  const role = await getStableRole(userId, lease.horse.stableId)
  const isStal = role !== null
  const isLeaser = lease.leaserUserId === userId
  if (!isStal && !isLeaser) throw new Error('Geen toegang')
  return { userId, lease, isStal, isLeaser }
}

function datumOfNull(v: FormDataEntryValue | null): Date | null {
  const s = (v as string)?.trim()
  return s ? new Date(s) : null
}
function getalOfNull(v: FormDataEntryValue | null): number | null {
  const s = (v as string)?.trim()
  if (!s) return null
  const n = parseInt(s, 10)
  return Number.isFinite(n) ? n : null
}

// Lease vastleggen vanaf de Lease-tab op het paard (alleen stalleden). De leaser is
// een bestaand account, gekozen op e-mailadres.
export async function createLease(horseId: string, formData: FormData) {
  const userId = await authUserId()
  const horse = await prisma.horse.findUnique({ where: { id: horseId }, select: { stableId: true } })
  if (!horse) throw new Error('Paard niet gevonden')
  const role = await getStableRole(userId, horse.stableId)
  if (!role) throw new Error('Geen toegang')

  const leaseType = formData.get('leaseType') as LeaseType
  if (!GELDIGE_TYPES.includes(leaseType)) throw new Error('Kies een geldige leasevorm')

  const email = (formData.get('leaserEmail') as string)?.trim().toLowerCase()
  if (!email) throw new Error('Vul het e-mailadres van de leaser in')
  const leaser = await prisma.user.findUnique({ where: { email } })
  if (!leaser) throw new Error('Geen account gevonden met dit e-mailadres')

  const lease = await prisma.lease.create({
    data: {
      horseId,
      leaserUserId: leaser.id,
      leaseType,
      status: 'CONCEPT',
      startDate: datumOfNull(formData.get('startDate')),
      endDate: datumOfNull(formData.get('endDate')),
      trialEndsAt: datumOfNull(formData.get('trialEndsAt')),
      minimumTermMonths: getalOfNull(formData.get('minimumTermMonths')),
      noticePeriodDays: getalOfNull(formData.get('noticePeriodDays')),
    },
  })

  revalidatePath(`/paarden/${horseId}`)
  redirect(`/lease/${lease.id}/contract`)
}

// Contractinhoud + looptijdvelden opslaan (alleen stal; niet meer na volledige
// ondertekening).
export async function saveLeaseContract(leaseId: string, formData: FormData) {
  const { lease, isStal } = await getLeaseCtx(leaseId)
  if (!isStal) throw new Error('Alleen de stal kan het contract bewerken')

  const huidig = leesLeaseContract(lease.config)
  if (isVolledigOndertekend(huidig)) {
    throw new Error('Het contract is ondertekend en kan niet meer worden gewijzigd.')
  }

  const tekst = (k: string) => (formData.get(k) as string)?.trim() || null
  const config = {
    ...huidig,
    gebruiksrecht: tekst('gebruiksrecht'),
    disciplines: tekst('disciplines'),
    kostenverdeling: tekst('kostenverdeling'),
    leasevergoeding: tekst('leasevergoeding'),
    aansprakelijkheid: tekst('aansprakelijkheid'),
    verzekering: tekst('verzekering'),
    opzegging: tekst('opzegging'),
    eersteRechtVanKoop: formData.get('eersteRechtVanKoop') === 'on',
    minderjarig: formData.get('minderjarig') === 'on',
    voogdNaam: tekst('voogdNaam'),
    bijzonderheden: tekst('bijzonderheden'),
  }

  await prisma.lease.update({
    where: { id: leaseId },
    data: {
      leaseType: (formData.get('leaseType') as LeaseType) ?? lease.leaseType,
      startDate: datumOfNull(formData.get('startDate')),
      endDate: datumOfNull(formData.get('endDate')),
      trialEndsAt: datumOfNull(formData.get('trialEndsAt')),
      minimumTermMonths: getalOfNull(formData.get('minimumTermMonths')),
      noticePeriodDays: getalOfNull(formData.get('noticePeriodDays')),
      config: config as unknown as Prisma.InputJsonValue,
    },
  })

  revalidatePath(`/lease/${leaseId}/contract`)
  redirect(`/lease/${leaseId}/contract`)
}

// Ondertekenen per partij. Bij volledige ondertekening wordt de lease ACTIEF
// (geeft de leaser leestoegang — Lease 02).
export async function signLease(
  leaseId: string,
  partij: 'stal' | 'leaser' | 'voogd',
  formData: FormData,
) {
  const { lease, isStal, isLeaser } = await getLeaseCtx(leaseId)
  if (partij === 'stal' && !isStal) throw new Error('Geen toegang')
  if ((partij === 'leaser' || partij === 'voogd') && !isLeaser) throw new Error('Geen toegang')

  const naam = (formData.get('naam') as string)?.trim()
  if (!naam) throw new Error('Vul een naam in om te ondertekenen')

  const config = leesLeaseContract(lease.config)
  config.ondertekening[partij] = { naam, datum: new Date().toISOString() }
  const volledig = isVolledigOndertekend(config)

  await prisma.lease.update({
    where: { id: leaseId },
    data: {
      config: config as unknown as Prisma.InputJsonValue,
      ...(volledig ? { status: 'ACTIEF' } : {}),
    },
  })

  revalidatePath(`/lease/${leaseId}/contract`)
  revalidatePath(`/paarden/${lease.horseId}`)
  redirect(`/lease/${leaseId}/contract`)
}
