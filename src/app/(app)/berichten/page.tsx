import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth/session'
import { getInquiriesForUser, markInquiryReadInline } from '@/features/lease/inquiryQueries'
import { replyInquiry } from '@/features/lease/inquiryActions'
import { LEASE_TYPE_LABELS } from '@/features/lease/leaseHelpers'
import SubmitButton from '@/components/SubmitButton'

function tijd(d: Date | string) {
  return new Date(d).toLocaleString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default async function BerichtenPage({
  searchParams,
}: {
  searchParams: Promise<{ thread?: string }>
}) {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  const { thread } = await searchParams
  const inquiries = await getInquiriesForUser(user.id)

  const actief = inquiries.find((i) => i.id === thread) ?? inquiries[0] ?? null

  // Markeer de berichten van de wederpartij in de open thread als gelezen.
  if (actief) {
    await markInquiryReadInline(user.id, actief.id)
  }

  function wederpartijLabel(inq: (typeof inquiries)[number]): string {
    const benInquirer = inq.inquirerUserId === user!.id
    return benInquirer
      ? inq.listing.horse.name
      : (inq.inquirer.name ?? inq.inquirer.email)
  }

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div className="breadcrumb">
            <span className="breadcrumb-current">Berichten</span>
          </div>
          <h1 className="page-title">Berichten</h1>
        </div>
      </div>

      {inquiries.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__title">Nog geen gesprekken</div>
          <p style={{ color: 'var(--velaro-color-muted)', marginTop: 8 }}>
            Toon interesse op de <Link href="/lease" className="form-link">lease-marktplaats</Link> om een gesprek te starten.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 300px) 1fr', gap: 16, alignItems: 'start' }}>
          {/* Gesprekkenlijst */}
          <div className="panel">
            <div className="panel-body" style={{ padding: 0 }}>
              {inquiries.map((inq) => {
                const ongelezen = inq.messages.filter((m) => m.authorId !== user!.id && m.readAt === null).length
                const laatste = inq.messages[inq.messages.length - 1]
                const isActief = actief?.id === inq.id
                return (
                  <Link
                    key={inq.id}
                    href={`/berichten?thread=${inq.id}`}
                    style={{
                      display: 'block',
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--velaro-color-border)',
                      textDecoration: 'none',
                      background: isActief ? 'var(--velaro-color-surf-2)' : 'transparent',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontWeight: 600, color: 'var(--velaro-color-navy)' }}>{wederpartijLabel(inq)}</span>
                      {ongelezen > 0 && <span className="badge badge-warning">{ongelezen}</span>}
                    </div>
                    <div style={{ fontSize: 'var(--velaro-text-xs)', color: 'var(--velaro-color-muted)', marginTop: 2 }}>
                      {inq.listing.horse.name} — {LEASE_TYPE_LABELS[inq.listing.leaseType]}
                    </div>
                    {laatste && (
                      <div style={{ fontSize: 'var(--velaro-text-sm)', color: 'var(--velaro-color-muted)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {laatste.body}
                      </div>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Actieve thread */}
          {actief ? (
            <div className="panel">
              <div className="panel-header">
                <span className="panel-title">
                  Over: {actief.listing.horse.name} — {LEASE_TYPE_LABELS[actief.listing.leaseType]}
                </span>
                <Link href={`/lease/${actief.listingId}`} className="btn-ghost btn-ghost--sm">Bekijk aanbod</Link>
              </div>
              <div className="panel-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                  {actief.messages.map((m) => {
                    const vanMij = m.authorId === user!.id
                    return (
                      <div
                        key={m.id}
                        style={{
                          alignSelf: vanMij ? 'flex-end' : 'flex-start',
                          maxWidth: '80%',
                          background: vanMij ? 'var(--velaro-color-navy)' : 'var(--velaro-color-surf-2)',
                          color: vanMij ? '#fff' : 'var(--velaro-color-navy)',
                          padding: '8px 12px',
                          borderRadius: 'var(--velaro-radius-md)',
                        }}
                      >
                        <div style={{ fontSize: 'var(--velaro-text-sm)', whiteSpace: 'pre-wrap' }}>{m.body}</div>
                        <div style={{ fontSize: '11px', opacity: 0.7, marginTop: 4 }}>
                          {m.author.name ?? m.author.email} · {tijd(m.createdAt)}
                        </div>
                      </div>
                    )
                  })}
                </div>

                <form action={replyInquiry.bind(null, actief.id)} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <textarea name="body" className="input" rows={3} placeholder="Schrijf een bericht…" required />
                  <div className="action-buttons">
                    <SubmitButton label="Versturen" />
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <div className="panel">
              <div className="panel-body">
                <p style={{ color: 'var(--velaro-color-muted)' }}>Kies een gesprek.</p>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
