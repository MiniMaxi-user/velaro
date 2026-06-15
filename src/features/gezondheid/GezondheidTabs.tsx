'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Vaccination, Deworming, VetVisit, HoefsmitBezoek, BodyMeasurement } from '@prisma/client'
import DeleteGezondheidButton from './DeleteGezondheidButton'
import { formatDatum } from '@/features/paarden/paardHelpers'

type DatumStatus = 'verlopen' | 'bijna' | 'ok'

const BIJNA_VERLOPEN_DAGEN = 14

function getDatumStatus(nextDate: Date | null): DatumStatus | null {
  if (!nextDate) return null
  const vandaag = new Date()
  vandaag.setHours(0, 0, 0, 0)
  const grens = new Date(vandaag)
  grens.setDate(grens.getDate() + BIJNA_VERLOPEN_DAGEN)
  if (nextDate < vandaag) return 'verlopen'
  if (nextDate <= grens) return 'bijna'
  return 'ok'
}

function isUrgent(nextDate: Date | null): boolean {
  const status = getDatumStatus(nextDate)
  return status === 'verlopen' || status === 'bijna'
}

function DatumBadge({ date }: { date: Date | null }) {
  if (!date) return <span className="gezondheid-tabel__muted">—</span>
  const status = getDatumStatus(date)
  return (
    <span className={`gezondheid-datum gezondheid-datum--${status}`}>
      {status === 'verlopen' ? 'Verlopen — ' : ''}
      {formatDatum(date)}
    </span>
  )
}

interface Props {
  horseId: string
  vaccinaties: Vaccination[]
  ontwormingen: Deworming[]
  bezzoeken: VetVisit[]
  hoefsmitBezoeKen: HoefsmitBezoek[]
  metingen: BodyMeasurement[]
  canEdit: boolean
}

type TabId = 'vaccinaties' | 'ontworming' | 'dierenarts' | 'hoefsmit' | 'metingen'

function formatMeetwaarde(value: number | null, eenheid: string): string {
  if (value === null || value === undefined) return '—'
  return `${value} ${eenheid}`
}

export default function GezondheidTabs({
  horseId,
  vaccinaties,
  ontwormingen,
  bezzoeken,
  hoefsmitBezoeKen,
  metingen,
  canEdit,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('vaccinaties')

  const urgentVaccinaties = vaccinaties.filter((v) =>
    isUrgent(v.nextDate ? new Date(v.nextDate) : null),
  ).length
  const urgentOntworming = ontwormingen.filter((o) =>
    isUrgent(o.nextDate ? new Date(o.nextDate) : null),
  ).length
  const urgentHoefsmit = hoefsmitBezoeKen.filter((h) =>
    isUrgent(h.nextDate ? new Date(h.nextDate) : null),
  ).length

  const tabs: { id: TabId; label: string; count: number; urgent: number }[] = [
    { id: 'vaccinaties', label: 'Vaccinaties', count: vaccinaties.length,      urgent: urgentVaccinaties },
    { id: 'ontworming',  label: 'Ontworming',  count: ontwormingen.length,     urgent: urgentOntworming },
    { id: 'dierenarts',  label: 'Dierenarts',  count: bezzoeken.length,        urgent: 0 },
    { id: 'hoefsmit',   label: 'Hoefsmit',    count: hoefsmitBezoeKen.length, urgent: urgentHoefsmit },
    { id: 'metingen',   label: 'Gewicht & metingen', count: metingen.length,  urgent: 0 },
  ]

  return (
    <div className="panel">
      {/* Tab-header */}
      <div className="panel-header" style={{ flexDirection: 'column', gap: 0, padding: 0 }}>
        <div className="tabs-inner" style={{ padding: '0 20px' }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`tab-btn-inner${activeTab === tab.id ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="gezondheid-tab-count">{tab.count}</span>
              )}
              {tab.urgent > 0 && (
                <span className="gezondheid-tab-urgent" title={`${tab.urgent} actie(s) verlopen of bijna verlopen`}>
                  {tab.urgent}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Toevoegen-knop per tab */}
        {canEdit && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 20px 0' }}>
            {activeTab === 'vaccinaties' && (
              <Link href={`/paarden/${horseId}/vaccinaties/nieuw`} className="btn-ghost btn-ghost--sm">
                + Toevoegen
              </Link>
            )}
            {activeTab === 'ontworming' && (
              <Link href={`/paarden/${horseId}/ontworming/nieuw`} className="btn-ghost btn-ghost--sm">
                + Toevoegen
              </Link>
            )}
            {activeTab === 'dierenarts' && (
              <Link href={`/paarden/${horseId}/dierenarts/nieuw`} className="btn-ghost btn-ghost--sm">
                + Toevoegen
              </Link>
            )}
            {activeTab === 'hoefsmit' && (
              <Link href={`/paarden/${horseId}/hoefsmit/nieuw`} className="btn-ghost btn-ghost--sm">
                + Toevoegen
              </Link>
            )}
            {activeTab === 'metingen' && (
              <Link href={`/paarden/${horseId}/metingen/nieuw`} className="btn-ghost btn-ghost--sm">
                + Toevoegen
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Tab-inhoud: Vaccinaties */}
      {activeTab === 'vaccinaties' && (
        vaccinaties.length === 0 ? (
          <div className="gezondheid-leeg">Nog geen vaccinaties geregistreerd.</div>
        ) : (
          <table className="gezondheid-tabel">
            <thead>
              <tr>
                <th>Datum</th>
                <th>Type vaccin</th>
                <th>Volgende datum</th>
                <th>Notities</th>
                {canEdit && <th />}
              </tr>
            </thead>
            <tbody>
              {vaccinaties.map((v) => (
                <tr key={v.id}>
                  <td>{formatDatum(new Date(v.date))}</td>
                  <td>{v.type}</td>
                  <td>
                    <DatumBadge date={v.nextDate ? new Date(v.nextDate) : null} />
                  </td>
                  <td className="gezondheid-tabel__muted">{v.notes ?? '—'}</td>
                  {canEdit && (
                    <td className="gezondheid-tabel__acties">
                      <Link href={`/paarden/${horseId}/vaccinaties/${v.id}/bewerken`} className="btn-icon" title="Bewerken" aria-label="Bewerken">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M9.5 2.5l2 2L4 12H2v-2L9.5 2.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
                        </svg>
                      </Link>
                      <DeleteGezondheidButton id={v.id} horseId={horseId} type="vaccinatie" />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}

      {/* Tab-inhoud: Ontworming */}
      {activeTab === 'ontworming' && (
        ontwormingen.length === 0 ? (
          <div className="gezondheid-leeg">Nog geen ontworming geregistreerd.</div>
        ) : (
          <table className="gezondheid-tabel">
            <thead>
              <tr>
                <th>Datum</th>
                <th>Product</th>
                <th>Volgende datum</th>
                <th>Notities</th>
                {canEdit && <th />}
              </tr>
            </thead>
            <tbody>
              {ontwormingen.map((o) => (
                <tr key={o.id}>
                  <td>{formatDatum(new Date(o.date))}</td>
                  <td>{o.product}</td>
                  <td>
                    <DatumBadge date={o.nextDate ? new Date(o.nextDate) : null} />
                  </td>
                  <td className="gezondheid-tabel__muted">{o.notes ?? '—'}</td>
                  {canEdit && (
                    <td className="gezondheid-tabel__acties">
                      <Link href={`/paarden/${horseId}/ontworming/${o.id}/bewerken`} className="btn-icon" title="Bewerken" aria-label="Bewerken">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M9.5 2.5l2 2L4 12H2v-2L9.5 2.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
                        </svg>
                      </Link>
                      <DeleteGezondheidButton id={o.id} horseId={horseId} type="ontworming" />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}

      {/* Tab-inhoud: Dierenartsenbezoeken */}
      {activeTab === 'dierenarts' && (
        bezzoeken.length === 0 ? (
          <div className="gezondheid-leeg">Nog geen dierenartsenbezoeken geregistreerd.</div>
        ) : (
          <table className="gezondheid-tabel">
            <thead>
              <tr>
                <th>Datum</th>
                <th>Dierenarts</th>
                <th>Reden</th>
                <th>Notities</th>
                {canEdit && <th />}
              </tr>
            </thead>
            <tbody>
              {bezzoeken.map((b) => (
                <tr key={b.id}>
                  <td>{formatDatum(new Date(b.date))}</td>
                  <td className="gezondheid-tabel__muted">{b.vet ?? '—'}</td>
                  <td>{b.reason}</td>
                  <td className="gezondheid-tabel__muted">{b.notes ?? '—'}</td>
                  {canEdit && (
                    <td className="gezondheid-tabel__acties">
                      <Link href={`/paarden/${horseId}/dierenarts/${b.id}/bewerken`} className="btn-icon" title="Bewerken" aria-label="Bewerken">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M9.5 2.5l2 2L4 12H2v-2L9.5 2.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
                        </svg>
                      </Link>
                      <DeleteGezondheidButton id={b.id} horseId={horseId} type="dierenarts" />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}

      {/* Tab-inhoud: Hoefsmitbezoeken */}
      {activeTab === 'hoefsmit' && (
        hoefsmitBezoeKen.length === 0 ? (
          <div className="gezondheid-leeg">Nog geen hoefsmitbezoeken geregistreerd.</div>
        ) : (
          <table className="gezondheid-tabel">
            <thead>
              <tr>
                <th>Datum</th>
                <th>Hoefsmid</th>
                <th>Volgende datum</th>
                <th>Notities</th>
                {canEdit && <th />}
              </tr>
            </thead>
            <tbody>
              {hoefsmitBezoeKen.map((h) => (
                <tr key={h.id}>
                  <td>{formatDatum(new Date(h.date))}</td>
                  <td className="gezondheid-tabel__muted">{h.hoefsmid ?? '—'}</td>
                  <td>
                    <DatumBadge date={h.nextDate ? new Date(h.nextDate) : null} />
                  </td>
                  <td className="gezondheid-tabel__muted">{h.notes ?? '—'}</td>
                  {canEdit && (
                    <td className="gezondheid-tabel__acties">
                      <Link href={`/paarden/${horseId}/hoefsmit/${h.id}/bewerken`} className="btn-icon" title="Bewerken" aria-label="Bewerken">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M9.5 2.5l2 2L4 12H2v-2L9.5 2.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
                        </svg>
                      </Link>
                      <DeleteGezondheidButton id={h.id} horseId={horseId} type="hoefsmit" />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}

      {/* Tab-inhoud: Gewicht & metingen */}
      {activeTab === 'metingen' && (
        metingen.length === 0 ? (
          <div className="gezondheid-leeg">Nog geen metingen geregistreerd.</div>
        ) : (
          <table className="gezondheid-tabel">
            <thead>
              <tr>
                <th>Datum</th>
                <th>Gewicht</th>
                <th>Stokmaat</th>
                <th>BCS</th>
                <th>Gemeten door</th>
                <th>Notities</th>
                {canEdit && <th />}
              </tr>
            </thead>
            <tbody>
              {metingen.map((m) => (
                <tr key={m.id}>
                  <td>{formatDatum(new Date(m.date))}</td>
                  <td>{formatMeetwaarde(m.weightKg, 'kg')}</td>
                  <td>{formatMeetwaarde(m.heightCm, 'cm')}</td>
                  <td>{m.bodyConditionScore != null ? m.bodyConditionScore : '—'}</td>
                  <td className="gezondheid-tabel__muted">{m.measuredBy ?? '—'}</td>
                  <td className="gezondheid-tabel__muted">{m.notes ?? '—'}</td>
                  {canEdit && (
                    <td className="gezondheid-tabel__acties">
                      <Link href={`/paarden/${horseId}/metingen/${m.id}/bewerken`} className="btn-icon" title="Bewerken" aria-label="Bewerken">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M9.5 2.5l2 2L4 12H2v-2L9.5 2.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
                        </svg>
                      </Link>
                      <DeleteGezondheidButton id={m.id} horseId={horseId} type="meting" />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}
    </div>
  )
}
