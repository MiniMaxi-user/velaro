'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import type { ReactNode } from 'react'

export type PaardTabId = 'algemeen' | 'gezondheid' | 'eigenaren' | 'voederschema' | 'berichten' | 'contracten' | 'lease'

const TABS: { id: PaardTabId; label: string }[] = [
  { id: 'algemeen', label: 'Algemeen' },
  { id: 'gezondheid', label: 'Gezondheid' },
  { id: 'eigenaren', label: 'Eigenaar & bereider' },
  { id: 'voederschema', label: 'Voederschema' },
  { id: 'berichten', label: 'Berichten' },
  { id: 'contracten', label: 'Contracten' },
  { id: 'lease', label: 'Lease' },
]

interface Props {
  algemeen: ReactNode
  gezondheid: ReactNode
  eigenaren: ReactNode
  voederschema: ReactNode
  berichten: ReactNode
  contracten: ReactNode
  lease: ReactNode
}

export default function PaardDetailTabs({
  algemeen,
  gezondheid,
  eigenaren,
  voederschema,
  berichten,
  contracten,
  lease,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const param = searchParams.get('tab')
  const activeTab: PaardTabId = TABS.some((t) => t.id === param)
    ? (param as PaardTabId)
    : 'algemeen'

  function selectTab(id: PaardTabId) {
    const params = new URLSearchParams(searchParams.toString())
    if (id === 'algemeen') {
      params.delete('tab')
    } else {
      params.set('tab', id)
    }
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  const content: Record<PaardTabId, ReactNode> = {
    algemeen,
    gezondheid,
    eigenaren,
    voederschema,
    berichten,
    contracten,
    lease,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`tab-btn${activeTab === tab.id ? ' active' : ''}`}
            onClick={() => selectTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div>{content[activeTab]}</div>
    </div>
  )
}
