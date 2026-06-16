import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth/session'
import { getActiveLeaseListingDetail } from '@/features/lease/marktplaatsQueries'
import { getPaardFotoSignedUrl } from '@/features/paarden/paardFotoStorage'
import { LEASE_TYPE_LABELS, LEASE_TYPE_OMSCHRIJVING } from '@/features/lease/leaseHelpers'
import { GESLACHT_LABELS, berekenLeeftijd } from '@/features/paarden/paardHelpers'

interface Props {
  params: Promise<{ listingId: string }>
}

function euro(n: number | null): string {
  if (n === null) return '—'
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(n)
}

function Veld({ label, waarde }: { label: string; waarde: string | null | undefined }) {
  return (
    <div className="detail-field">
      <div className="detail-field-label">{label}</div>
      <div className={`detail-field-value${waarde ? '' : ' muted'}`}>{waarde ?? '—'}</div>
    </div>
  )
}

export default async function LeaseListingDetailPage({ params }: Props) {
  const { listingId } = await params

  const user = await getAuthUser()
  if (!user) redirect('/login')

  const listing = await getActiveLeaseListingDetail(listingId)
  if (!listing) notFound()

  const fotoUrl = await getPaardFotoSignedUrl(listing.horse.id)
  const prijs = listing.pricePerMonth ? Number(listing.pricePerMonth) : null
  const leeftijd = listing.horse.dateOfBirth ? berekenLeeftijd(new Date(listing.horse.dateOfBirth)) : null

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div className="breadcrumb">
            <Link href="/lease">Lease-marktplaats</Link>
            <span className="breadcrumb-sep">›</span>
            <span className="breadcrumb-current">{listing.horse.name}</span>
          </div>
        </div>
      </div>

      <div className="detail-layout">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Hero */}
          <div className="panel">
            <div style={{ aspectRatio: '16 / 9', overflow: 'hidden', borderTopLeftRadius: 'inherit', borderTopRightRadius: 'inherit', background: 'var(--velaro-color-surf-2)' }}>
              {fotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={fotoUrl} alt={`Foto van ${listing.horse.name}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64 }} aria-hidden>🐴</div>
              )}
            </div>
            <div className="panel-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h1 className="detail-title" style={{ margin: 0 }}>{listing.horse.name}</h1>
                <span className="badge badge-gold">{LEASE_TYPE_LABELS[listing.leaseType]}</span>
              </div>
              <div style={{ fontSize: 'var(--velaro-text-xl)', fontWeight: 700, color: 'var(--velaro-color-navy)', marginTop: 8 }}>
                {euro(prijs)} <span style={{ fontSize: 'var(--velaro-text-sm)', fontWeight: 400, color: 'var(--velaro-color-muted)' }}>per maand</span>
              </div>
              <p style={{ color: 'var(--velaro-color-muted)', marginTop: 8 }}>
                {LEASE_TYPE_OMSCHRIJVING[listing.leaseType]}
              </p>
            </div>
          </div>

          {/* Aanbod-details */}
          <div className="panel">
            <div className="panel-header"><span className="panel-title">Lease-aanbod</span></div>
            <div className="panel-body">
              <div className="detail-fields">
                <Veld label="Leasevorm" waarde={LEASE_TYPE_LABELS[listing.leaseType]} />
                <Veld label="Prijs per maand" waarde={euro(prijs)} />
                <Veld label="Dagen per week" waarde={listing.daysPerWeek?.toString()} />
                <Veld label="Regio" waarde={listing.region} />
                <Veld label="Discipline" waarde={listing.discipline} />
                <Veld label="Mag verplaatst worden" waarde={listing.movable ? 'Ja' : 'Nee'} />
                <Veld label="Gebruik" waarde={listing.exclusive ? 'Exclusief' : 'Gedeeld'} />
              </div>
              {listing.description && (
                <p style={{ marginTop: 12 }}>{listing.description}</p>
              )}
            </div>
          </div>

          {/* Over dit paard — alleen publieke profielgegevens */}
          <div className="panel">
            <div className="panel-header"><span className="panel-title">Over dit paard</span></div>
            <div className="panel-body">
              <div className="detail-fields">
                <Veld label="Ras" waarde={listing.horse.breed} />
                <Veld label="Leeftijd" waarde={leeftijd !== null ? `${leeftijd} jaar` : null} />
                <Veld label="Geslacht" waarde={listing.horse.sex ? GESLACHT_LABELS[listing.horse.sex] : null} />
                <Veld
                  label="Discipline"
                  waarde={listing.horse.discipline
                    ? `${listing.horse.discipline}${listing.horse.disciplineLevel ? ` ${listing.horse.disciplineLevel}` : ''}`
                    : null}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Side panel — interesse-cta */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="panel">
            <div className="panel-body">
              <div className="label" style={{ marginBottom: 8 }}>Interesse?</div>
              <p style={{ color: 'var(--velaro-color-muted)', fontSize: 'var(--velaro-text-sm)', marginBottom: 12 }}>
                Toon interesse en kom rechtstreeks in contact met de aanbieder.
              </p>
              <Link href={`/lease/${listing.id}/interesse`} className="btn-primary btn-primary--full">
                Interesse tonen
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
