'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ContractOptiesPerFamilie } from './relatietypeMatching'
import { CONTRACT_FAMILY_LABELS, contractTypeLabel } from './contractHelpers'

// "Nieuw contract"-dropdown ([Unify 03] #129). Toont alle contractopties (stalling +
// alle leasevormen) gegroepeerd per familie. Niet-mogelijke opties zijn zichtbaar
// maar uitgeschakeld, met de reden via dezelfde info-tip/tooltip-stijl als de oude
// poort-knop (#115). De poort-logica zelf is zuiver en zit in relatietypeMatching.ts;
// deze component rendert die uitkomst en routeert na een keuze.
//
// Routing:
//  - Stalling → bestaande route /paarden/[id]/contracten/nieuw (gedrag identiek aan
//    vandaag; het type volgt de stallingsvorm van het paard).
//  - Lease → de lease-opstelroute uit [Unify 04] #130, met de gekozen leasevorm:
//    /paarden/[id]/contracten/nieuw?family=LEASE&type=<leaseType>.
export default function NieuwContractDropdown({
  horseId,
  opties,
}: {
  horseId: string
  opties: ContractOptiesPerFamilie[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  function routeVoor(family: string, type: string): string {
    if (family === 'LEASE') {
      return `/paarden/${horseId}/contracten/nieuw?family=LEASE&type=${encodeURIComponent(type)}`
    }
    return `/paarden/${horseId}/contracten/nieuw`
  }

  return (
    <div
      className={`nieuw-contract-menu${open ? ' nieuw-contract-menu--open' : ''}`}
      ref={menuRef}
    >
      <button
        type="button"
        className="btn-primary"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
      >
        Nieuw contract
        <svg
          className="nieuw-contract-chevron"
          width="10"
          height="6"
          viewBox="0 0 10 6"
          fill="none"
          aria-hidden="true"
        >
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      <div className="nieuw-contract-dropdown" role="menu">
        {opties.map((groep) => (
          <div key={groep.family} className="nieuw-contract-groep">
            <div className="nieuw-contract-groep__titel">
              {CONTRACT_FAMILY_LABELS[groep.family]}
            </div>
            {groep.opties.map((optie) =>
              optie.toegestaan ? (
                <button
                  key={optie.type}
                  type="button"
                  role="menuitem"
                  className="nieuw-contract-item"
                  onClick={() => {
                    setOpen(false)
                    router.push(routeVoor(optie.family, optie.type))
                  }}
                >
                  {contractTypeLabel(optie.type)}
                </button>
              ) : (
                <span
                  key={optie.type}
                  className="nieuw-contract-item nieuw-contract-item--disabled"
                  aria-disabled="true"
                >
                  {contractTypeLabel(optie.type)}
                  <span
                    className="info-tip"
                    tabIndex={0}
                    role="note"
                    aria-label={optie.reden}
                  >
                    <span className="info-tip__icon" aria-hidden="true">
                      i
                    </span>
                    <span className="info-tip__bubble" role="tooltip">
                      {optie.reden}
                    </span>
                  </span>
                </span>
              ),
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
