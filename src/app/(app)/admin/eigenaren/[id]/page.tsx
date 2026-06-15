import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { getAuthUser } from '@/lib/auth/session'
import { isPlatformAdmin } from '@/lib/auth/authorization'
import { getOwnerAccount } from '@/features/admin/queries'
import EigenaarBewerkenForm from '@/features/admin/EigenaarBewerkenForm'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EigenaarDetailPage({ params }: Props) {
  const { id } = await params

  const user = await getAuthUser()
  if (!user) redirect('/login')

  // Alleen een platform-admin mag dit scherm openen.
  const isAdmin = await isPlatformAdmin(user.id)
  if (!isAdmin) redirect('/stal')

  const owner = await getOwnerAccount(id)
  if (!owner) notFound()

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div className="breadcrumb">
            <Link href="/admin/eigenaren">Eigenaren</Link>
            <span className="breadcrumb-sep">›</span>
            <span className="breadcrumb-current">{owner.name ?? owner.email}</span>
          </div>
          <h1 className="page-title">Zakelijke <em>gegevens</em></h1>
        </div>
        <div className="page-header-actions">
          <Link href="/admin/eigenaren" className="btn-ghost">← Terug</Link>
        </div>
      </div>

      <div className="form-card" style={{ maxWidth: 640 }}>
        <EigenaarBewerkenForm owner={owner} />
      </div>
    </>
  )
}
