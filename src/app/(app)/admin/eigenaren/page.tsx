import Link from 'next/link'
import { getOwnerAccounts, getHorseOwnerAccounts } from '@/features/admin/queries'
import EigenaarAccountsTabs from '@/features/admin/EigenaarAccountsTabs'

export default async function EigenaarenPage() {
  const [stableOwners, horseOwners] = await Promise.all([
    getOwnerAccounts(),
    getHorseOwnerAccounts(),
  ])

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div className="breadcrumb">
            <span className="breadcrumb-current">Admin</span>
            <span className="breadcrumb-sep">›</span>
            <span className="breadcrumb-current">Eigenaren</span>
          </div>
          <h1 className="page-title">Eigenaar<em>accounts</em></h1>
        </div>
        <div className="page-header-actions">
          <Link href="/admin/eigenaren/nieuw" className="btn-primary">+ Nieuw account</Link>
        </div>
      </div>

      <EigenaarAccountsTabs
        stableOwners={stableOwners}
        horseOwners={horseOwners}
      />
    </>
  )
}
