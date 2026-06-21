// Pure validatie- en normalisatielogica voor het paardformulier, bewust los van
// de `'use server'`-actions (Prisma/Supabase) zodat dit unit-testbaar is. De
// regels zijn ongewijzigd t.o.v. de oorspronkelijke server-side validatie:
//   - `name` is verplicht.
//   - `chipNumber` (indien ingevuld) moet exact 15 cijfers bevatten; spaties en
//     streepjes worden eerst verwijderd.

export type HorseFieldError = { field: string; message: string }

/**
 * Normaliseert een ruw chipnummer naar enkel cijfers (of `null` als leeg).
 * Spaties en streepjes worden verwijderd.
 */
export function normalizeChipNumber(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim() || null
  if (!trimmed) return null
  const digits = trimmed.replace(/\D/g, '')
  return digits || null
}

/**
 * Valideert naam en (genormaliseerd) chipnummer. Geeft de eerste veldgebonden
 * fout terug, of `null` als de invoer geldig is. De `field` komt overeen met de
 * `name` van het formulierveld in `PaardForm`.
 */
export function validateHorseFields(input: {
  name: string | null | undefined
  chipNumber: string | null
}): HorseFieldError | null {
  if (!input.name?.trim()) {
    return { field: 'name', message: 'Naam is verplicht' }
  }

  if (input.chipNumber && input.chipNumber.length !== 15) {
    return {
      field: 'chipNumber',
      message:
        'Chipnummer moet exact 15 cijfers bevatten (spaties en streepjes worden automatisch verwijderd)',
    }
  }

  return null
}
