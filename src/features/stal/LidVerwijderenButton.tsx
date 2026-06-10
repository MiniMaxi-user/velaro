'use client'

import { useTransition } from 'react'
import { removeMember } from './actions'

interface Props {
  memberId: string
  naam: string
}

export default function LidVerwijderenButton({ memberId, naam }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleRemove() {
    if (!confirm(`Weet je zeker dat je ${naam} wilt verwijderen uit de stal?`)) return
    startTransition(async () => {
      await removeMember(memberId)
    })
  }

  return (
    <button onClick={handleRemove} disabled={isPending} className="btn-danger btn-danger--sm">
      {isPending ? '...' : 'Verwijderen'}
    </button>
  )
}
