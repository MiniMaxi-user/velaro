import { Fragment } from 'react'
import { formatDatum } from '@/features/paarden/paardHelpers'
import {
  CONTRACT_STATUS_LABELS,
  CONTRACT_STATUS_BADGE,
  contractTypeLabel,
} from './contractHelpers'
import {
  NALEVING_STATUS_LABELS,
  NALEVING_STATUS_BADGE,
} from './gezondheidsplicht'
import { heeftBerijder, leesBerijder } from './berijder'
import { isMinderjarig } from '@/features/paarden/paardHelpers'
import type { NalevingRegel } from './queries'
import NieuwContractKnop from './NieuwContractKnop'
import ContractActies, { type VerlengContext } from './ContractActies'
import { ontbrekendeAanbiedVelden } from './aanbiedValidatie'
import { leesVersieGroepId } from './statusMachine'
import {
  kanExplicietBevestigen,
  leesVerlengBevestiging,
  volgendeEinddatum,
} from './verlenging'
import { formatDatum as formatDatumVerleng } from '@/features/paarden/paardHelpers'
import type { ContractStatus, Prisma } from '@prisma/client'

// Bouwt de verleng-context (STAL-14, #87) voor de stal-zijde van een contract:
// alleen voor een actief/verlengd contract met EXPLICIET-modus waarvan het
// verlengmoment nadert/bereikt is. Anders null (geen bevestig-actie tonen).
function bouwVerlengContext(
  status: ContractStatus,
  config: Prisma.JsonValue | null,
): VerlengContext | null {
  if (status !== 'ACTIEF' && status !== 'VERLENGD') return null
  if (!kanExplicietBevestigen(config)) return null
  const bevestiging = leesVerlengBevestiging(config)
  const nieuw = volgendeEinddatum(config)
  return {
    doorStal: bevestiging?.doorStal ?? false,
    doorEigenaar: bevestiging?.doorEigenaar ?? false,
    nieuweEinddatum: nieuw ? formatDatumVerleng(nieuw) : null,
  }
}

type ContractRow = {
  id: string
  type: string
  status: ContractStatus
  startDate: Date | null
  createdAt: Date
  currentVersion: number
  config: Prisma.JsonValue | null
  counterpartyUserId: string | null
  counterparty: { id: string; name: string | null; email: string } | null
}

// Groepeert contractversies (STAL-11, #84): versies van eenzelfde contract delen
// config.versieGroepId; een contract zonder groep-id vormt z'n eigen groep (id).
// Per groep is de hoogste currentVersion de huidige versie; de overige zijn de
// (vervangen) historie. Groepen worden gesorteerd op de aanmaakdatum van de
// huidige versie, nieuwste eerst (sluit aan op de query-volgorde).
function groepeerVersies(contracts: ContractRow[]): {
  huidig: ContractRow
  historie: ContractRow[]
}[] {
  const groepen = new Map<string, ContractRow[]>()
  for (const c of contracts) {
    const groepId = leesVersieGroepId(c.config) ?? c.id
    const bestaand = groepen.get(groepId)
    if (bestaand) bestaand.push(c)
    else groepen.set(groepId, [c])
  }

  const resultaat = Array.from(groepen.values()).map((versies) => {
    const gesorteerd = [...versies].sort((a, b) => b.currentVersion - a.currentVersion)
    const [huidig, ...historie] = gesorteerd
    return { huidig, historie }
  })

  resultaat.sort(
    (a, b) => b.huidig.createdAt.getTime() - a.huidig.createdAt.getTime(),
  )
  return resultaat
}

export default function ContractenPanel({
  horseId,
  contracts,
  hasOwners,
  naleving = {},
}: {
  horseId: string
  contracts: ContractRow[]
  hasOwners: boolean
  // Per contract-id de nalevingsregels (STAL-07). Lege/ontbrekende lijst = geen
  // actieve gezondheidsplicht om te tonen.
  naleving?: Record<string, NalevingRegel[]>
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
                <th>Versie</th>
                <th>Wederpartij</th>
                <th>Ingangsdatum</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {groepeerVersies(contracts).map(({ huidig: c, historie }) => {
                const regels = naleving[c.id] ?? []
                // Berijder (STAL-10): optioneel optieblok. Alleen tonen wanneer een
                // naam is vastgelegd; bij een geboortedatum een minderjarig-indicatie.
                const berijder = leesBerijder(c.config)
                const berijderGeboortedatum = berijder.geboortedatum
                  ? new Date(berijder.geboortedatum)
                  : null
                const berijderMinderjarig =
                  isMinderjarig(berijderGeboortedatum) === true
                return (
                  <Fragment key={c.id}>
                    <tr>
                      <td>{contractTypeLabel(c.type)}</td>
                      <td className="gezondheid-tabel__muted">v{c.currentVersion}</td>
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
                      <td>
                        <ContractActies
                          horseId={horseId}
                          contractId={c.id}
                          status={c.status}
                          heeftWederpartij={Boolean(c.counterpartyUserId)}
                          ontbrekendeVelden={ontbrekendeAanbiedVelden(c.config)}
                          verleng={bouwVerlengContext(c.status, c.config)}
                        />
                      </td>
                    </tr>
                    {historie.length > 0 && (
                      <tr>
                        <td colSpan={6} style={{ paddingTop: 0 }}>
                          <div className="contract-naleving">
                            <div className="contract-naleving__titel">Versiehistorie</div>
                            <ul className="contract-naleving__lijst">
                              {historie.map((h) => (
                                <li key={h.id} className="contract-naleving__regel">
                                  <span className="contract-naleving__onderdeel">
                                    Versie {h.currentVersion}
                                  </span>
                                  <span
                                    className={`badge ${CONTRACT_STATUS_BADGE[h.status]}`}
                                  >
                                    {CONTRACT_STATUS_LABELS[h.status]}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </td>
                      </tr>
                    )}
                    {regels.length > 0 && (
                      <tr>
                        <td colSpan={6} style={{ paddingTop: 0 }}>
                          <div className="contract-naleving">
                            <div className="contract-naleving__titel">
                              Entings- &amp; gezondheidsplicht
                            </div>
                            <ul className="contract-naleving__lijst">
                              {regels.map((r, i) => (
                                <li key={i} className="contract-naleving__regel">
                                  <span className="contract-naleving__onderdeel">
                                    {r.onderdeel}
                                  </span>
                                  <span className={`badge ${NALEVING_STATUS_BADGE[r.status]}`}>
                                    {NALEVING_STATUS_LABELS[r.status]}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </td>
                      </tr>
                    )}
                    {heeftBerijder(berijder) && (
                      <tr>
                        <td colSpan={6} style={{ paddingTop: 0 }}>
                          <div className="contract-naleving">
                            <div className="contract-naleving__titel">Berijder</div>
                            <ul className="contract-naleving__lijst">
                              <li className="contract-naleving__regel">
                                <span className="contract-naleving__onderdeel">
                                  {berijder.naam}
                                  {berijder.relatieTotEigenaar
                                    ? ` (${berijder.relatieTotEigenaar})`
                                    : ''}
                                </span>
                                {berijderMinderjarig && (
                                  <span className="badge badge-warning">Minderjarig</span>
                                )}
                              </li>
                            </ul>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
