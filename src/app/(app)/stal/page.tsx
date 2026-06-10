import Link from 'next/link'

export default function StalPage() {
  return (
    <main className="page-container">
      <div className="page-header">
        <h1 className="page-title">
          Mijn <em>Stal</em>
        </h1>
      </div>
      <div style={{ display: 'flex', gap: 'var(--velaro-space-4)' }}>
        <Link href="/stal/leden" className="btn-primary">
          Leden beheren
        </Link>
      </div>
    </main>
  )
}
