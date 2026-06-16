import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth/session'
import { getHorsesForOwner, getFeedingPlan, getLeasedHorsesForUser } from '@/features/paarden/queries'
import { leaseTypeLabel } from '@/features/lease/leaseHelpers'
import { getMessagesForHorseView, getUnreadCountForHorseView } from '@/features/berichten/queries'
import BerichtItem from '@/features/berichten/BerichtItem'
import { getZorgActiesVoorPaard } from '@/features/gezondheid/queries'
import {
  getAangebodenContractVoorEigenaar,
  getBijlagenMetUrls,
  getContractsForEigenaar,
} from '@/features/contracten/queries'
import {
  verwerkStilzwijgendeVerlengingen,
  verwerkTijdgebondenOvergangen,
} from '@/features/contracten/actions'
import ContractSamenvatting from '@/features/contracten/ContractSamenvatting'
import ContractOverzicht from '@/features/contracten/ContractOverzicht'
import EigenaarContractActies from '@/features/contracten/EigenaarContractActies'
import VerlengActies from '@/features/contracten/VerlengActies'
import {
  kanExplicietBevestigen,
  leesVerlengBevestiging,
  volgendeEinddatum,
} from '@/features/contracten/verlenging'
import { berekenLeeftijd, formatDatum } from '@/features/paarden/paardHelpers'

export default async function EigenaarPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  const [horses, leasedHorses] = await Promise.all([
    getHorsesForOwner(user.id),
    getLeasedHorsesForUser(user.id),
  ])
  const heeftPaarden = horses.length > 0 || leasedHorses.length > 0

  // Laad berichten (stal + paard), ongelezen-tellers, zorgacties, voederschema en
  // het eventueel aangeboden stallingscontract per paard parallel.
  const [
    berichtenPerPaard,
    ongelezenPerPaard,
    zorgActiesPerPaard,
    voederschemaPerPaard,
    aangebodenContractPerPaard,
    eigenaarContractenVoorVerlenging,
  ] = await Promise.all([
    Promise.all(horses.map((h) => getMessagesForHorseView(h.id, 6))),
    Promise.all(horses.map((h) => getUnreadCountForHorseView(user.id, h.id))),
    Promise.all(horses.map((h) => getZorgActiesVoorPaard(h.id, 60))),
    Promise.all(horses.map((h) => getFeedingPlan(h.id))),
    Promise.all(horses.map((h) => getAangebodenContractVoorEigenaar(h.id, user.id))),
    getContractsForEigenaar(user.id),
  ])

  // Lazy stilzwijgende verlenging (STAL-14, #87): bij bezoek aan het eigenaar-
  // dashboard verlengen stilzwijgende contracten waarvan het verlengmoment bereikt
  // is. Idempotent; bij wijziging opnieuw ophalen zodat het overzicht klopt.
  const verlengd = await verwerkStilzwijgendeVerlengingen(
    eigenaarContractenVoorVerlenging.map((c) => c.id),
  )
  // Lazy tijdgebonden overgangen (STAL-15, #88): einde opschorting → ACTIEF en
  // verstreken opzegtermijn → BEEINDIGD. Idempotent; bij wijziging opnieuw ophalen.
  const tijdgebonden = await verwerkTijdgebondenOvergangen(
    eigenaarContractenVoorVerlenging.map((c) => c.id),
  )
  const mijnContracten = verlengd > 0 || tijdgebonden > 0
    ? await getContractsForEigenaar(user.id)
    : eigenaarContractenVoorVerlenging

  // Bijlagen (STAL-16) van een eventueel aangeboden contract per paard, met signed
  // URL's voor inzage. Alleen voor het aangeboden contract — concepten ziet de
  // eigenaar niet. Geen aanbod → lege lijst.
  const bijlagenPerPaard = await Promise.all(
    aangebodenContractPerPaard.map((c) =>
      c ? getBijlagenMetUrls(c.id) : Promise.resolve([]),
    ),
  )

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div className="breadcrumb">
            <span className="breadcrumb-current">Dashboard</span>
          </div>
          <h1 className="page-title">Mijn paarden</h1>
        </div>
      </div>

      {!heeftPaarden ? (
        <div className="empty-state">
          <div className="empty-state__title">Geen paarden gevonden</div>
          <p style={{ color: 'var(--velaro-color-muted)', marginTop: 8 }}>
            Je hebt nog geen paarden in je account. Neem contact op met je pensionstal.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {horses.length > 0 && (
          <>
          {/* Contract-overzicht (STAL-13, #86): alle stallingscontracten waarvan deze
              eigenaar de wederpartij is. Server-side gefilterd op counterpartyUserId,
              dus uitsluitend contracten van de eigen paard(en). */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Mijn contracten</span>
              <span className="badge badge-neutral">{mijnContracten.length}</span>
            </div>
            <div className="panel-body">
              <ContractOverzicht
                contracts={mijnContracten}
                rol="EIGENAAR"
                legeTekst="Je hebt nog geen stallingscontracten."
              />
            </div>
          </div>

          {/* Expliciete verlenging (STAL-14, #87): contracten met EXPLICIET-modus
              waarvan het verlengmoment nadert/bereikt is en die nog actief/verlengd
              zijn. De eigenaar kan hier zijn deel bevestigen; pas wanneer beide
              partijen bevestigen wordt verlengd. */}
          {(() => {
            const teVerlengen = mijnContracten.filter(
              (c) =>
                (c.status === 'ACTIEF' || c.status === 'VERLENGD') &&
                kanExplicietBevestigen(c.config),
            )
            if (teVerlengen.length === 0) return null
            return (
              <div className="panel">
                <div className="panel-header">
                  <span className="panel-title">Te verlengen</span>
                  <span className="badge badge-gold">{teVerlengen.length}</span>
                </div>
                <div className="panel-body">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {teVerlengen.map((c) => {
                      const bevestiging = leesVerlengBevestiging(c.config)
                      const nieuw = volgendeEinddatum(c.config)
                      return (
                        <div
                          key={c.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 12,
                            flexWrap: 'wrap',
                          }}
                        >
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 500 }}>{c.horse.name}</div>
                            <div className="gezondheid-tabel__muted">
                              Verlengen tot {nieuw ? formatDatum(nieuw) : '—'}
                            </div>
                          </div>
                          <VerlengActies
                            contractId={c.id}
                            partij="EIGENAAR"
                            doorStal={bevestiging?.doorStal ?? false}
                            doorEigenaar={bevestiging?.doorEigenaar ?? false}
                            nieuweEinddatum={nieuw ? formatDatum(nieuw) : null}
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })()}

          {horses.map((horse, index) => {
            const leeftijd = horse.dateOfBirth ? berekenLeeftijd(new Date(horse.dateOfBirth)) : null
            const berichten = berichtenPerPaard[index]
            const aangebodenContract = aangebodenContractPerPaard[index]
            const zorgActies = zorgActiesPerPaard[index]
            const verlopenActies = zorgActies.filter((a) => a.isVerlopen)
            const voederschema = voederschemaPerPaard[index]
            const voederVelden: { label: string; waarde: string | null; benadruk?: boolean }[] = [
              { label: 'Ruwvoer', waarde: voederschema?.roughage ?? null },
              { label: 'Krachtvoer', waarde: voederschema?.concentrate ?? null },
              { label: 'Supplementen', waarde: voederschema?.supplements ?? null },
              { label: 'Beperkingen', waarde: voederschema?.restrictions ?? null, benadruk: true },
              { label: 'Opmerkingen', waarde: voederschema?.notes ?? null },
            ].filter((v) => v.waarde)

            return (
              <div key={horse.id} className="panel">
                <div className="panel-header">
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="panel-title">{horse.name}</span>
                      {ongelezenPerPaard[index] > 0 && (
                        <span className="badge badge-warning">
                          {ongelezenPerPaard[index]} nieuw
                        </span>
                      )}
                      {verlopenActies.length > 0 && (
                        <span className="badge badge-warning">
                          {verlopenActies.length} zorg verlopen
                        </span>
                      )}
                    </div>
                    <div className="detail-meta" style={{ marginTop: 6 }}>
                      {horse.breed && <span className="badge badge-navy">{horse.breed}</span>}
                      {leeftijd !== null && <span className="badge badge-neutral">{leeftijd} jaar</span>}
                      {horse.discipline && <span className="badge badge-gold">{horse.discipline}</span>}
                    </div>
                  </div>
                  <Link href={`/paarden/${horse.id}`} className="btn-ghost btn-ghost--sm">
                    Bekijk profiel
                  </Link>
                </div>
                <div className="panel-body">
                  {aangebodenContract && (
                    <div
                      style={{
                        marginBottom: 16,
                        paddingBottom: 16,
                        borderBottom: '1px solid var(--velaro-color-border)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          marginBottom: 12,
                        }}
                      >
                        <div className="label" style={{ margin: 0 }}>Contract</div>
                        <span className="badge badge-gold">Aangeboden</span>
                      </div>
                      <p
                        style={{
                          color: 'var(--velaro-color-muted)',
                          fontSize: '0.875rem',
                          marginBottom: 12,
                        }}
                      >
                        De stal heeft je een stallingscontract aangeboden. Lees het door
                        en accepteer of wijs het af.
                      </p>
                      <ContractSamenvatting
                        config={aangebodenContract.config}
                        bijlagen={bijlagenPerPaard[index]}
                      />
                      <div style={{ marginTop: 16 }}>
                        <EigenaarContractActies contractId={aangebodenContract.id} />
                      </div>
                    </div>
                  )}

                  <div className="label" style={{ marginBottom: 8 }}>Berichten</div>
                  {berichten.length === 0 ? (
                    <p style={{ color: 'var(--velaro-color-muted)', fontSize: '0.875rem' }}>
                      Nog geen berichten voor dit paard.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {berichten.map((bericht) => (
                        <BerichtItem key={bericht.id} message={bericht} canManage={false} />
                      ))}
                    </div>
                  )}

                  {zorgActies.length > 0 && (
                    <div
                      style={{
                        marginTop: 16,
                        paddingTop: 16,
                        borderTop: '1px solid var(--velaro-color-border)',
                      }}
                    >
                      <div className="label" style={{ marginBottom: 8 }}>Zorgstatus</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {zorgActies.map((actie) => (
                          <div
                            key={actie.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 12,
                              padding: '10px 12px',
                              background: 'var(--velaro-color-surf-2)',
                              borderRadius: 'var(--velaro-radius-md)',
                              fontSize: 'var(--velaro-text-sm)',
                            }}
                          >
                            {actie.isVerlopen ? (
                              <span className="badge badge-warning" style={{ flexShrink: 0 }}>Verlopen</span>
                            ) : (
                              <span className="badge badge-neutral" style={{ flexShrink: 0 }}>
                                {formatDatum(actie.nextDate)}
                              </span>
                            )}
                            <span style={{ flex: 1, minWidth: 0 }}>
                              {actie.type === 'vaccinatie' ? 'Vaccinatie' : actie.type === 'ontworming' ? 'Ontworming' : 'Hoefsmit'}
                              {actie.omschrijving ? ` — ${actie.omschrijving}` : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {voederVelden.length > 0 && (
                    <div
                      style={{
                        marginTop: 16,
                        paddingTop: 16,
                        borderTop: '1px solid var(--velaro-color-border)',
                      }}
                    >
                      <div className="label" style={{ marginBottom: 8 }}>Voederschema</div>
                      <div className="detail-fields">
                        {voederVelden.map((v) => (
                          <div key={v.label} className="detail-field">
                            <div className="detail-field-label">{v.label}</div>
                            <div className="detail-field-value">
                              {v.benadruk ? (
                                <span className="badge badge-danger">{v.waarde}</span>
                              ) : (
                                v.waarde
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
          </>
          )}

          {/* Geleasede paarden (lease-module #59, Lease 02): read-only weergave naast
              de eigen paarden, met een gouden Lease-badge. Een subkop "In lease"
              alleen wanneer de gebruiker zowel eigen als geleasede paarden heeft. */}
          {leasedHorses.length > 0 && (
            <>
              {horses.length > 0 && (
                <div className="label" style={{ marginTop: 8 }}>In lease</div>
              )}
              {leasedHorses.map(({ horse, leaseType }) => {
                const leeftijd = horse.dateOfBirth
                  ? berekenLeeftijd(new Date(horse.dateOfBirth))
                  : null
                return (
                  <div key={horse.id} className="panel">
                    <div className="panel-header">
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className="panel-title">{horse.name}</span>
                          <span className="badge badge-gold">
                            In lease — {leaseTypeLabel(leaseType)}
                          </span>
                        </div>
                        <div className="detail-meta" style={{ marginTop: 6 }}>
                          {horse.breed && <span className="badge badge-navy">{horse.breed}</span>}
                          {leeftijd !== null && <span className="badge badge-neutral">{leeftijd} jaar</span>}
                          {horse.discipline && <span className="badge badge-gold">{horse.discipline}</span>}
                        </div>
                      </div>
                      <Link href={`/paarden/${horse.id}`} className="btn-ghost btn-ghost--sm">
                        Bekijk profiel
                      </Link>
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </div>
      )}
    </>
  )
}
