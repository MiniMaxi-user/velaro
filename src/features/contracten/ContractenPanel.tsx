import { formatDatum } from '@/features/paarden/paardHelpers'
import {
  CONTRACT_STATUS_LABELS,
  CONTRACT_STATUS_BADGE,
  contractTypeLabel,
} from './contractHelpers'
import NieuwContractKnop from './NieuwContractKnop'
import type { ContractStatus } from '@prisma/client'

type ContractRow = {
  id: string
  type: string
  status: ContractStatus
  startDate: Date | null
  createdAt: Date
  counterparty: { id: string; name: string | null; email: string } | null
}

export default function ContractenPanel({
  horseId,
  contracts,
  hasOwners,
}: {
  horseId: string
  contracts: ContractRow[]
  hasOwners: boolean
}) {
  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">Contracten</span>
        <NieuwContractKnop horseId={horseId} hasOwners={hasOwners} />
      </div>
      <div className="panel-body">
        {contracts.length === 0 ? (
          <div className="gezondheid-leeg">Nog geen contracten voor dit paard.</div>
        ) : (
          <table className="gezondheid-tabel">
            <thead>
              <tr>
                <th>Type</th>
                <th>Wederpartij</th>
                <th>Ingangsdatum</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((c) => (
                <tr key={c.id}>
                  <td>{contractTypeLabel(c.type)}</td>
                  <td className="gezondheid-tabel__muted">
                    {c.counterparty
                      ? c.counterparty.name ?? c.counterparty.email
                      : '—'}
                  </td>
                  <td className="gezondheid-tabel__muted">
                    {c.startDate ? formatDatum(new Date(c.startDate)) : '—'}
                  </td>
                  <td>
                    <span className={`badge ${CONTRACT_STATUS_BADGE[c.status]}`}>
                      {CONTRACT_STATUS_LABELS[c.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
