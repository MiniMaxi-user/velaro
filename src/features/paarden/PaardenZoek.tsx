'use client'

import { useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

// Zoekveld boven het paardenoverzicht (#119). Houdt de zoekterm in de URL
// (?q=…) zodat de server-component server-side filtert op paardnaam, UELN,
// chipnummer, paspoortnummer en gekoppelde eigenaar-/bereidernaam. Geen
// localStorage: de zoekstate leeft in de URL. De parent geeft `key={query}`
// mee, zodat het veld bij externe URL-wijzigingen (terug/vooruit) herinitialiseert.
export default function PaardenZoek({ initialQuery = '' }: { initialQuery?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [value, setValue] = useState(initialQuery)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function pushQuery(next: string) {
    const params = new URLSearchParams(searchParams.toString())
    const term = next.trim()
    if (term) {
      params.set('q', term)
    } else {
      params.delete('q')
    }
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  function onChange(next: string) {
    setValue(next)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => pushQuery(next), 300)
  }

  function onClear() {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setValue('')
    pushQuery('')
  }

  return (
    <div className="filter-bar paarden-zoek">
      <span className="topbar-search-icon" aria-hidden>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.4" />
          <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </span>
      <input
        type="search"
        className="input paarden-zoek-input"
        placeholder="Zoek op paard, eigenaar, bereider, UELN, chip- of paspoortnummer…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Paarden zoeken"
      />
      {value && (
        <button
          type="button"
          className="topbar-search-clear"
          onClick={onClear}
          aria-label="Zoekterm wissen"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  )
}
