'use client'

import { useTransition } from 'react'
import { deleteVaccinatie, deleteOntworming, deleteDierenartsBeezoek, deleteHoefsmitBezoek } from './actions'

type GezondheidType = 'vaccinatie' | 'ontworming' | 'dierenarts' | 'hoefsmit'

interface Props {
  id: string
  horseId: string
  type: GezondheidType
}

const DELETE_FNS = {
  vaccinatie: deleteVaccinatie,
  ontworming: deleteOntworming,
  dierenarts: deleteDierenartsBeezoek,
  hoefsmit: deleteHoefsmitBezoek,
}

export default function DeleteGezondheidButton({ id, horseId, type }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirm('Verwijder dit record?')) return
    startTransition(async () => {
      await DELETE_FNS[type](id, horseId)
    })
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="btn-danger btn-danger--sm"
    >
      {isPending ? '...' : 'Verwijder'}
    </button>
  )
}
