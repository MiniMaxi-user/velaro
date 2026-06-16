import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth/session'
import { getActiveLeaseListings, type LeaseFilter } from '@/features/lease/marktplaatsQueries'
import { getPaardFotoSignedUrls } from '@/features/paarden/paardFotoStorage'
import { LEASE_TYPE_LABELS, LEASE_TYPE_OPTIES } from '@/features/lease/leaseHelpers'
import { matchScore, heeftVoorkeuren, type MatchVoorkeuren } from '@/features/lease/leaseMatching'
import { berekenLeeftijd } from '@/features/paarden/paardHelpers'
import type { LeaseType } from '@prisma/client'

function euro(n: number | null): string {
  if (n === null) return '—'
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(n)
}

function getalOfUndefined(v: string | undefined): number | undefined {
  if (!v) return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

type SP = {
  type?: string
  discipline?: string
  regio?: string
  dagen?: string
  min?: string
  max?: string
  verplaatsbaar?: string
}

export default async function LeaseMarktplaatsPage({
  searchParams,
}: {
  searchParams: Promise<SP>
}) {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  const sp = await searchParams
  const leaseType = LEASE_TYPE_OPTIES.includes(sp.type as LeaseType) ? (sp.type as LeaseType) : undefined

  const filter: LeaseFilter = {
    leaseType,
    discipline: sp.discipline?.trim() || undefined,
    region: sp.regio?.trim() || undefined,
    maxDaysPerWeek: getalOfUndefined(sp.dagen),
    minPrice: getalOfUndefined(sp.min),
    maxPrice: getalOfUndefined(sp.max),
    movable: sp.verplaatsbaar === '1' ? true : undefined,
  }

  const listings = await getActiveLeaseListings(filter)
  const fotoUrls = await getPaardFotoSignedUrls(listings.map((l) => l.horse))

  const voorkeuren: MatchVoorkeuren = {
    leaseType,
    discipline: filter.discipline,
    region: filter.region,
    maxDaysPerWeek: filter.maxDaysPerWeek,
    maxPrice: filter.maxPrice,
  }
  const scoren = heeftVoorkeuren(voorkeuren)

  const kaarten = listings
    .map((l) => {
      const prijs = l.pricePerMonth ? Number(l.pricePerMonth) : null
      const score = scoren
        ? matchScore(
            {
              leaseType: l.leaseType,
              discipline: l.discipline,
              region: l.region,
              daysPerWeek: l.daysPerWeek,
              pricePerMonth: prijs,
            },
            voorkeuren,
          )
        : null
      return { listing: l, prijs, score }
    })
    .sort((a, b) => (scoren ? (b.score ?? 0) - (a.score ?? 0) : 0))

  const gemiddeldePrijs = (() => {
    const prijzen = kaarten.map((k) => k.prijs).filter((p): p is number => p !== null)
    if (prijzen.length === 0) return null
    return Math.round(prijzen.reduce((s, p) => s + p, 0) / prijzen.length)
  })()

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div className="breadcrumb">
            <span className="breadcrumb-current">Lease-marktplaats</span>
          </div>
          <h1 className="page-title">Lease-<em>marktplaats</em></h1>
        </div>
      </div>

      {/* Filterbalk — server-side via querystring (GET-formulier). */}
      <form method="get" action="/lease" className="filter-bar" style={{ flexWrap: 'wrap', gap: 12 }}>
        <select name="type" className="input" defaultValue={sp.type ?? ''} style={{ maxWidth: 180 }} aria-label="Leasevorm">
          <option value="">Alle leasevormen</option>
          {LEASE_TYPE_OPTIES.map((t) => (
            <option key={t} value={t}>{LEASE_TYPE_LABELS[t]}</option>
          ))}
        </select>
        <input name="discipline" className="input" placeholder="Discipline" defaultValue={sp.discipline ?? ''} style={{ maxWidth: 160 }} />
        <input name="regio" className="input" placeholder="Regio" defaultValue={sp.regio ?? ''} style={{ maxWidth: 160 }} />
        <input name="dagen" type="number" min="1" max="7" className="input" placeholder="Max dagen/week" defaultValue={sp.dagen ?? ''} style={{ maxWidth: 140 }} />
        <input name="min" type="number" min="0" className="input" placeholder="Min €" defaultValue={sp.min ?? ''} style={{ maxWidth: 110 }} />
        <input name="max" type="number" min="0" className="input" placeholder="Max €" defaultValue={sp.max ?? ''} style={{ maxWidth: 110 }} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--velaro-text-sm)', cursor: 'pointer' }}>
          <input type="checkbox" name="verplaatsbaar" value="1" defaultChecked={sp.verplaatsbaar === '1'} />
          Verplaatsbaar
        </label>
        <button type="submit" className="btn-primary btn-primary--sm">Filter</button>
        <Link href="/lease" className="btn-ghost btn-ghost--sm">Wissen</Link>
      </form>

      <div className="kpi-row" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginTop: 16 }}>
        <div className="kpi-card">
          <div className="kpi-card-body">
            <div className="kpi-card-value">{kaarten.length}</div>
            <div className="kpi-card-label">Actief aanbod</div>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-body">
            <div className="kpi-card-value">{euro(gemiddeldePrijs)}</div>
            <div className="kpi-card-label">Gemiddelde prijs p/m</div>
          </div>
        </div>
      </div>

      {kaarten.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 16 }}>
          <div className="empty-state__title">Geen aanbod gevonden</div>
          <p style={{ color: 'var(--velaro-color-muted)', marginTop: 8 }}>
            Pas je filters aan om meer lease-aanbod te zien.
          </p>
        </div>
      ) : (
        <div
          style={{
            marginTop: 16,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 16,
          }}
        >
          {kaarten.map(({ listing: l, prijs, score }) => {
            const leeftijd = l.horse.dateOfBirth ? berekenLeeftijd(new Date(l.horse.dateOfBirth)) : null
            const url = fotoUrls[l.horse.id]
            return (
              <Link key={l.id} href={`/lease/${l.id}`} className="panel" style={{ textDecoration: 'none', display: 'block' }}>
                <div style={{ position: 'relative', aspectRatio: '4 / 3', overflow: 'hidden', borderTopLeftRadius: 'inherit', borderTopRightRadius: 'inherit', background: 'var(--velaro-color-surf-2)' }}>
                  {url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt={`Foto van ${l.horse.name}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }} aria-hidden>🐴</div>
                  )}
                  {score !== null && (
                    <span className="badge badge-gold" style={{ position: 'absolute', top: 8, right: 8 }}>
                      {score}% match
                    </span>
                  )}
                </div>
                <div className="panel-body">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span className="panel-title">{l.horse.name}</span>
                    <span className="badge badge-gold">{LEASE_TYPE_LABELS[l.leaseType]}</span>
                  </div>
                  <div style={{ fontSize: 'var(--velaro-text-lg)', fontWeight: 600, color: 'var(--velaro-color-navy)', marginTop: 6 }}>
                    {euro(prijs)} <span style={{ fontSize: 'var(--velaro-text-sm)', fontWeight: 400, color: 'var(--velaro-color-muted)' }}>p/m</span>
                  </div>
                  <div className="detail-meta" style={{ marginTop: 8 }}>
                    {l.horse.breed && <span className="badge badge-navy">{l.horse.breed}</span>}
                    {leeftijd !== null && <span className="badge badge-neutral">{leeftijd} jr</span>}
                    {l.region && <span className="badge badge-neutral">{l.region}</span>}
                    {l.discipline && <span className="badge badge-gold">{l.discipline}</span>}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </>
  )
}
