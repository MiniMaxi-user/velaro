import {
  Document,
  Page,
  View,
  Text,
  Image,
  Font,
  StyleSheet,
} from '@react-pdf/renderer'
import path from 'node:path'
import type { FactuurPdfData } from './factuurPdfData'

// ── Factuur-PDF in Velaro-huisstijl ([Fact 05] #150) ─────────────────────────
// Eigen set @react-pdf/renderer-componenten, met dezelfde huisstijl als de
// contract-PDF (ContractPdfDocument): navy/goud, logo public/velaro_logo.png en de
// fonts Cormorant Garamond (koppen) + Inter (body). De inhoud komt uit
// bouwFactuurPdfData zodat de bedragen exact gelijk zijn aan de web-weergave.

// Huisstijlkleuren — overgenomen uit src/styles/globals.css (@theme).
const COLORS = {
  navy: '#1A2B4A',
  gold: '#D8BD71',
  goldDark: '#BEA256',
  bg: '#F5F3EE',
  surface2: '#EEEAE2',
  muted: '#6B7280',
  border: '#E2DDD2',
  white: '#FFFFFF',
}

// Fonts lokaal uit public/fonts/ registreren (zelfde aanpak als de contract-PDF:
// netwerk-onafhankelijk en reproduceerbaar). Idempotent registreren.
const FONTS_DIR = path.join(process.cwd(), 'public', 'fonts')
let fontsRegistered = false
function ensureFonts() {
  if (fontsRegistered) return
  Font.register({
    family: 'Cormorant Garamond',
    fonts: [
      {
        src: path.join(FONTS_DIR, 'CormorantGaramond-Regular.ttf'),
        fontWeight: 400,
      },
      {
        src: path.join(FONTS_DIR, 'CormorantGaramond-SemiBold.ttf'),
        fontWeight: 600,
      },
    ],
  })
  Font.register({
    family: 'Inter',
    fonts: [
      { src: path.join(FONTS_DIR, 'Inter-Regular.ttf'), fontWeight: 400 },
      { src: path.join(FONTS_DIR, 'Inter-Medium.ttf'), fontWeight: 500 },
      { src: path.join(FONTS_DIR, 'Inter-SemiBold.ttf'), fontWeight: 600 },
    ],
  })
  fontsRegistered = true
}

// Absoluut pad naar het standaard Velaro-logo in public/ (fallback bij geen stallogo).
const LOGO_PATH = path.join(process.cwd(), 'public', 'velaro_logo.png')

const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 64,
    paddingHorizontal: 48,
    fontFamily: 'Inter',
    fontSize: 10,
    color: COLORS.navy,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.gold,
    marginBottom: 24,
  },
  logo: {
    width: 120,
    objectFit: 'contain',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  title: {
    fontFamily: 'Cormorant Garamond',
    fontWeight: 600,
    fontSize: 24,
    color: COLORS.navy,
  },
  metaLine: {
    fontSize: 9,
    color: COLORS.muted,
    marginTop: 2,
  },
  partijenRij: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  partijBlok: {
    width: '48%',
    backgroundColor: COLORS.surface2,
    borderRadius: 6,
    padding: 14,
  },
  partijTitel: {
    fontSize: 8,
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  partijNaam: {
    fontSize: 12,
    color: COLORS.navy,
    fontWeight: 600,
    marginBottom: 2,
  },
  partijRegel: {
    fontSize: 9,
    color: COLORS.navy,
    marginBottom: 1,
  },
  // Regeltabel
  tabel: {
    marginBottom: 16,
  },
  tabelKop: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gold,
    paddingBottom: 4,
    marginBottom: 4,
  },
  tabelRij: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 4,
  },
  thLinks: {
    fontSize: 8,
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  thRechts: {
    fontSize: 8,
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'right',
  },
  colOmschrijving: { width: '40%' },
  colAantal: { width: '12%', textAlign: 'right' },
  colStuksprijs: { width: '18%', textAlign: 'right' },
  colBtw: { width: '12%', textAlign: 'right' },
  colBedrag: { width: '18%', textAlign: 'right' },
  cel: {
    fontSize: 9,
    color: COLORS.navy,
  },
  celRechts: {
    fontSize: 9,
    color: COLORS.navy,
    textAlign: 'right',
  },
  // Totalen + btw-overzicht
  totalenBlok: {
    marginTop: 8,
    alignItems: 'flex-end',
  },
  totaalRij: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    width: '60%',
    marginBottom: 3,
  },
  totaalLabel: {
    width: '60%',
    fontSize: 9,
    color: COLORS.muted,
    textAlign: 'right',
    paddingRight: 8,
  },
  totaalWaarde: {
    width: '40%',
    fontSize: 9,
    color: COLORS.navy,
    textAlign: 'right',
  },
  totaalLabelSterk: {
    width: '60%',
    fontSize: 11,
    color: COLORS.navy,
    fontWeight: 600,
    textAlign: 'right',
    paddingRight: 8,
  },
  totaalWaardeSterk: {
    width: '40%',
    fontSize: 11,
    color: COLORS.navy,
    fontWeight: 600,
    textAlign: 'right',
  },
  totaalScheiding: {
    width: '60%',
    borderTopWidth: 1,
    borderTopColor: COLORS.gold,
    marginTop: 4,
    marginBottom: 4,
  },
  sectieTitel: {
    fontFamily: 'Cormorant Garamond',
    fontWeight: 600,
    fontSize: 15,
    color: COLORS.navy,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 4,
    marginBottom: 8,
    marginTop: 16,
  },
  notitie: {
    fontSize: 9,
    color: COLORS.navy,
    marginTop: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 28,
    left: 48,
    right: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: COLORS.muted,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 6,
  },
})

export function FactuurPdfDocument({ data }: { data: FactuurPdfData }) {
  ensureFonts()

  return (
    <Document title={`Factuur ${data.factuurnummer}`} author="Velaro">
      <Page size="A4" style={styles.page}>
        {/* Kop met logo, titel, factuurnummer en -datum. Eigen stallogo (#98) indien
            aanwezig; anders het standaard Velaro-logo. */}
        <View style={styles.header} fixed>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={data.stalLogoDataUrl ?? LOGO_PATH} style={styles.logo} />
          <View style={styles.headerRight}>
            <Text style={styles.title}>Factuur</Text>
            <Text style={styles.metaLine}>Factuurnummer {data.factuurnummer}</Text>
            {data.factuurdatum && (
              <Text style={styles.metaLine}>Factuurdatum {data.factuurdatum}</Text>
            )}
            {data.vervaldatum && (
              <Text style={styles.metaLine}>Vervaldatum {data.vervaldatum}</Text>
            )}
          </View>
        </View>

        {/* Afzender (stal) + ontvanger (factuurgegevens). */}
        <View style={styles.partijenRij}>
          <View style={styles.partijBlok}>
            <Text style={styles.partijTitel}>Afzender</Text>
            <Text style={styles.partijNaam}>{data.afzender.naam}</Text>
            {data.afzender.adres && (
              <Text style={styles.partijRegel}>{data.afzender.adres}</Text>
            )}
          </View>
          <View style={styles.partijBlok}>
            <Text style={styles.partijTitel}>Aan</Text>
            <Text style={styles.partijNaam}>{data.ontvanger.naam}</Text>
            {data.ontvanger.adres && (
              <Text style={styles.partijRegel}>{data.ontvanger.adres}</Text>
            )}
            {data.ontvanger.kvkNumber && (
              <Text style={styles.partijRegel}>KvK: {data.ontvanger.kvkNumber}</Text>
            )}
            {data.ontvanger.vatNumber && (
              <Text style={styles.partijRegel}>Btw: {data.ontvanger.vatNumber}</Text>
            )}
          </View>
        </View>

        {/* Regeltabel: omschrijving, aantal, stuksprijs excl. btw, btw-tarief, regelbedrag. */}
        <View style={styles.tabel}>
          <View style={styles.tabelKop} fixed>
            <Text style={[styles.thLinks, styles.colOmschrijving]}>Omschrijving</Text>
            <Text style={[styles.thRechts, styles.colAantal]}>Aantal</Text>
            <Text style={[styles.thRechts, styles.colStuksprijs]}>Stuksprijs</Text>
            <Text style={[styles.thRechts, styles.colBtw]}>Btw</Text>
            <Text style={[styles.thRechts, styles.colBedrag]}>Bedrag</Text>
          </View>
          {data.regels.map((regel, i) => (
            <View key={i} style={styles.tabelRij} wrap={false}>
              <Text style={[styles.cel, styles.colOmschrijving]}>{regel.omschrijving}</Text>
              <Text style={[styles.celRechts, styles.colAantal]}>{regel.aantal}</Text>
              <Text style={[styles.celRechts, styles.colStuksprijs]}>{regel.stuksprijs}</Text>
              <Text style={[styles.celRechts, styles.colBtw]}>{regel.btwTarief}</Text>
              <Text style={[styles.celRechts, styles.colBedrag]}>{regel.regelbedrag}</Text>
            </View>
          ))}
        </View>

        {/* Totalen + btw-overzicht per tarief. */}
        <View style={styles.totalenBlok} wrap={false}>
          <View style={styles.totaalRij}>
            <Text style={styles.totaalLabel}>Subtotaal (excl. btw)</Text>
            <Text style={styles.totaalWaarde}>{data.subtotaal}</Text>
          </View>
          {data.btwGroepen.map((groep, i) => (
            <View key={i} style={styles.totaalRij}>
              <Text style={styles.totaalLabel}>
                Btw {groep.tarief} over {groep.grondslag}
              </Text>
              <Text style={styles.totaalWaarde}>{groep.btwBedrag}</Text>
            </View>
          ))}
          <View style={styles.totaalRij}>
            <Text style={styles.totaalLabel}>Totale btw</Text>
            <Text style={styles.totaalWaarde}>{data.totaleBtw}</Text>
          </View>
          <View style={styles.totaalScheiding} />
          <View style={styles.totaalRij}>
            <Text style={styles.totaalLabelSterk}>Totaal (incl. btw)</Text>
            <Text style={styles.totaalWaardeSterk}>{data.totaal}</Text>
          </View>
        </View>

        {/* Opmerking (optioneel). */}
        {data.notes && (
          <View wrap={false}>
            <Text style={styles.sectieTitel}>Opmerking</Text>
            <Text style={styles.notitie}>{data.notes}</Text>
          </View>
        )}

        {/* Voettekst */}
        <View style={styles.footer} fixed>
          <Text>Factuur {data.factuurnummer} — {data.afzender.naam}</Text>
          <Text
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  )
}
