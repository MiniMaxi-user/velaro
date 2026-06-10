'use client'

import { useActionState } from 'react'
import { updateMemberRole } from './actions'
import type { StableRole } from '@prisma/client'

const ROL_LABELS: Record<StableRole, string> = {
  OWNER: 'Eigenaar',
  STAFF: 'Medewerker',
}

interface Props {
  memberId: string
  currentRole: StableRole
}

type State = { error?: string }

export default function RolWijzigen({ memberId, currentRole }: Props) {
  const boundAction = updateMemberRole.bind(null, memberId)

  async function action(prev: State, formData: FormData): Promise<State> {
    try {
      await boundAction(formData)
      return {}
    } catch (e) {
      return { error: (e as Error).message }
    }
  }

  const [state, formAction] = useActionState(action, {})

  return (
    <form action={formAction} className="rol-wijzigen">
      {state.error && (
        <span className="rol-error">{state.error}</span>
      )}
      <select name="role" className="input input--sm" defaultValue={currentRole}>
        {(Object.keys(ROL_LABELS) as StableRole[]).map((r) => (
          <option key={r} value={r}>
            {ROL_LABELS[r]}
          </option>
        ))}
      </select>
      <button type="submit" className="btn-ghost btn-ghost--sm">
        Opslaan
      </button>
    </form>
  )
}
