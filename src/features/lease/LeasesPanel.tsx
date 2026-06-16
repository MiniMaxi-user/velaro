import Link from 'next/link'
import type { LeaseStatus, LeaseType } from '@prisma/client'
import { LEASE_TYPE_LABELS, LEASE_STATUS_LABELS, LEASE_STATUS_BADGE } from './leaseHelpers'
import { formatDatum } from '@/features/paarden/paardHelpers'

type LeaseRow = {
  id: string
  leaseType: LeaseType
  status: LeaseStatus
  startDate: Date | null
  leaser: { name: string | null; email: string }
}

// Leaseovereenkomsten van een paard, getoond in de Lease-tab (alleen stalleden).
// Lijst + knop om een nieuwe lease vast te leggen (Lease 06, #65).
export default function LeasesPanel({ horseId, leases }: { horseId: string; leases: LeaseRow[] }) {
  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">Leaseovereenkomsten</span>
        <Link href={`/paarden/${horseId}/lease/overeenkomst/nieuw`} className="btn-ghost btn-ghost--sm">
          + Lease vastleggen
        </Link>
      </div>
      <div className="panel-body">
        {leases.length === 0 ? (
          <div className="gezondheid-leeg">Nog geen leaseovereenkomsten voor dit paard.</div>
        ) : (
          <table className="gezondheid-tabel">
            <thead>
              <tr>
                <th>Leaser</th>
                <th>Leasevorm</th>
                <th>Ingangsdatum</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {leases.map((l) => (
                <tr key={l.id}>
                  <td>{l.leaser.name ?? l.leaser.email}</td>
                  <td className="gezondheid-tabel__muted">{LEASE_TYPE_LABELS[l.leaseType]}</td>
                  <td className="gezondheid-tabel__muted">{l.startDate ? formatDatum(new Date(l.startDate)) : '—'}</td>
                  <td>
                    <span className={`badge ${LEASE_STATUS_BADGE[l.status]}`}>{LEASE_STATUS_LABELS[l.status]}</span>
                  </td>
                  <td className="gezondheid-tabel__acties">
                    <Link href={`/lease/${l.id}/contract`} className="btn-ghost btn-ghost--sm">Contract</Link>
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
