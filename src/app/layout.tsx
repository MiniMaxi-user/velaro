import type { Metadata } from 'next'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: 'Velaro',
  description: 'Paardenprofiel platform voor pensionstallen',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" className="h-full">
      <body className="min-h-full antialiased">{children}</body>
    </html>
  )
}
