'use client'

import { useId, useState } from 'react'

// ── Info-tooltip "i" (#143) ──────────────────────────────────────────────────
// Kleine, herbruikbare "i"-badge die bij hover/focus/klik een korte uitleg toont.
// Gebruikt o.a. om "Algemene voorwaarden" en "Stalreglement" van elkaar te
// onderscheiden — die mogen in de UI niet door elkaar lopen. Toont de tekst ook via
// het native title-attribuut, zodat de uitleg ook zonder JS/hover bereikbaar is.

export default function InfoTooltip({ label, text }: { label?: string; text: string }) {
  const [open, setOpen] = useState(false)
  const id = useId()

  return (
    <span className="info-tooltip">
      <button
        type="button"
        className="info-tooltip-trigger"
        aria-label={label ? `Uitleg: ${label}` : 'Uitleg'}
        aria-describedby={open ? id : undefined}
        title={text}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
      >
        i
      </button>
      {open && (
        <span role="tooltip" id={id} className="info-tooltip-bubble">
          {text}
        </span>
      )}
    </span>
  )
}
