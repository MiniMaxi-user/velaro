import type { InvoiceStatus } from '@prisma/client'

// ── Factuur-statusmachine ([Fact 07] #152) ───────────────────────────────────
// Centrale, herbruikbare definitie van de toegestane statusovergangen na het
// uitreiken van een factuur, zodat ze consistent server-side worden afgedwongen en
// niet als ad-hoc checks door de acties verspreid raken. Gespiegeld op de
// statusMachine van de contract-module (assertOvergangToegestaan-stijl).
//
// Levenscyclus:
//   CONCEPT    → VERZONDEN (via maakFactuurDefinitief, Fact 05) | GEANNULEERD
//   VERZONDEN  → BETAALD | VERVALLEN (lazy, automatisch) | GEANNULEERD
//   VERVALLEN  → BETAALD | GEANNULEERD
//   BETAALD    → (eindstatus, geen overgangen — creditfacturen buiten scope)
//   GEANNULEERD→ (eindstatus)
//
// CONCEPT → VERZONDEN staat hier vermeld voor de volledigheid, maar wordt afgedwongen
// door maakFactuurDefinitief (nummering + PDF); de losse statusbeheer-acties van deze
// story raken een concept niet aan.

export const STATUS_OVERGANGEN: Record<InvoiceStatus, InvoiceStatus[]> = {
  CONCEPT: ['VERZONDEN', 'GEANNULEERD'],
  VERZONDEN: ['BETAALD', 'VERVALLEN', 'GEANNULEERD'],
  VERVALLEN: ['BETAALD', 'GEANNULEERD'],
  BETAALD: [],
  GEANNULEERD: [],
}

// Nederlandstalige statuslabels voor de UI (overzicht/badges).
export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  CONCEPT: 'Concept',
  VERZONDEN: 'Verzonden',
  BETAALD: 'Betaald',
  VERVALLEN: 'Vervallen',
  GEANNULEERD: 'Geannuleerd',
}

// Badge-variant per status (bestaande design-tokens; geen nieuwe CSS geïntroduceerd).
export const INVOICE_STATUS_BADGE: Record<InvoiceStatus, string> = {
  CONCEPT: 'badge-neutral',
  VERZONDEN: 'badge-navy',
  BETAALD: 'badge-gold',
  VERVALLEN: 'badge-danger',
  GEANNULEERD: 'badge-neutral',
}

// Controleert of een statusovergang is toegestaan.
export function isGeldigeStatusovergang(
  huidig: InvoiceStatus,
  nieuw: InvoiceStatus,
): boolean {
  return STATUS_OVERGANGEN[huidig].includes(nieuw)
}

// Dwingt een geldige statusovergang af; gooit anders een nette Nederlandse melding.
// Spiegelt assertOvergangToegestaan uit de contract-statusmachine.
export function assertGeldigeStatusovergang(
  huidig: InvoiceStatus,
  nieuw: InvoiceStatus,
): void {
  if (!isGeldigeStatusovergang(huidig, nieuw)) {
    throw new Error(
      `Een factuur met status ${INVOICE_STATUS_LABEL[huidig].toLowerCase()} ` +
        `kan niet naar ${INVOICE_STATUS_LABEL[nieuw].toLowerCase()} worden gezet.`,
    )
  }
}

// Een factuur is "openstaand" zolang ze verzonden of vervallen is (nog te innen).
export function isOpenstaand(status: InvoiceStatus): boolean {
  return status === 'VERZONDEN' || status === 'VERVALLEN'
}

// Bepaalt of een VERZONDEN-factuur automatisch op VERVALLEN moet (vervaldatum verstreken).
// Idempotent: alleen VERZONDEN met een dueDate in het verleden komt in aanmerking.
// De vergelijking is op kalenderdag (begin van vandaag), zodat een factuur die vandaag
// vervalt nog niet als te laat geldt.
export function moetVervallen(
  status: InvoiceStatus,
  dueDate: Date | null,
  nu: Date = new Date(),
): boolean {
  if (status !== 'VERZONDEN') return false
  if (!dueDate) return false
  const beginVandaag = new Date(nu.getFullYear(), nu.getMonth(), nu.getDate())
  return new Date(dueDate).getTime() < beginVandaag.getTime()
}
