'use client'

import { useTransition } from 'react'
import { deleteVaccinatie, deleteOntworming, deleteDierenartsBeezoek, deleteHoefsmitBezoek, deleteMeting } from './actions'

type GezondheidType = 'vaccinatie' | 'ontworming' | 'dierenarts' | 'hoefsmit' | 'meting'

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
  meting: deleteMeting,
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
      className="btn-icon btn-icon--danger"
      title="Verwijderen"
      aria-label="Verwijderen"
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ opacity: isPending ? 0.5 : 1 }}>
        <path d="M2 4h10M5 4V2.5h4V4M5.5 6.5v4M8.5 6.5v4M3 4l.7 7h6.6L11 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  )
}
