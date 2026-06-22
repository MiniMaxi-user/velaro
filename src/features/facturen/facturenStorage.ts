import { createAdminClient } from '@/lib/supabase/admin'

// ── Factuur-PDF-inzage via signed URL ([Fact 02] #147) ───────────────────────
// Inzage in een factuur-PDF loopt — net als de contract-PDF/bijlagen (STAL-16) —
// uitsluitend via een tijdelijke (signed) URL. De *autorisatie* (mag deze gebruiker
// deze factuur zien) wordt door de aanroeper afgedwongen (zie queries.ts); deze
// helper genereert enkel de signed URL op een reeds bekend storagePath.
//
// Het genereren van de PDF zelf, de bucket-provisioning en het vullen van het
// storagePath horen bij [Fact 05] — buiten scope van deze story. Deze helper neemt
// het pad als parameter en gokt geen bucketnaam; is er (nog) geen pad of mislukt het
// ondertekenen, dan geeft hij null terug.

// Privé bucket voor factuur-PDF's. Provisioning gebeurt in [Fact 05]; hier alleen
// referentie voor de signed-URL-inzage.
export const FACTUUR_PDF_BUCKET = 'factuur-pdf'

// Geldigheid van een signed URL (10 minuten) — gelijk aan de contract-bijlagen,
// genoeg om te openen/downloaden.
const SIGNED_URL_TTL_SECONDS = 600

/**
 * Geeft een tijdelijke (signed) URL terug voor een factuur-PDF op het opgegeven
 * storagePath, of null wanneer er (nog) geen pad is of het ondertekenen mislukt.
 *
 * De autorisatie wordt door de aanroeper afgedwongen (eigenaar: eigen + verzonden;
 * stalrol: eigen stal) — exact het patroon van getBijlagenMetUrls. Robuust wanneer
 * de PDF nog niet bestaat ([Fact 05] genereert die pas).
 */
export async function getSignedUrlVoorFactuurPdf(
  storagePath: string | null | undefined,
): Promise<string | null> {
  if (!storagePath) return null

  const supabase = createAdminClient()
  const { data, error } = await supabase.storage
    .from(FACTUUR_PDF_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS)
  if (error || !data) return null
  return data.signedUrl
}
