---
issue: 51
title: "Herstructureer paarden-detailpagina (staleigenaar) naar tab-layout met 70/30 kolommen"
status: "Done"
labels: []
url: "https://github.com/MiniMaxi-user/velaro/issues/51"
archivedAt: 2026-06-19
---

# #51 — Herstructureer paarden-detailpagina (staleigenaar) naar tab-layout met 70/30 kolommen

# Story â€” Herstructureer paarden-detailpagina (staleigenaar) naar tab-layout met 70/30 kolommen

Type: VERBETERING (UI-herstructurering, geen datamodel-wijziging)
Status: **Nog niet bouwen** â€” alleen verhelderd en op het bord gezet.

---

## Doel

De paarden-detailpagina (`/paarden/[id]`) toont nu Ã©Ã©n lange kolom met losse
panelen (Algemeen, Identificatie, Afstamming, Voederschema, Gezondheid, Berichten)
plus een zijkolom. Voor de **staleigenaar/medewerker** wordt dit een rommelige,
lange scroll. We herstructureren de pagina naar een rustige **tab-layout** met een
vaste contextkolom rechts.

## Scope

- Betreft de weergave voor **stalleden** (OWNER en STAFF) â€” d.w.z. `canEdit === true`.
- De weergave voor de **paardeneigenaar** (`canEdit === false`, ziet o.a.
  `StalGegevensPanel`) valt **buiten** deze story en blijft ongewijzigd, tenzij
  expliciet anders besloten.

## Layout

Onder het detail-headerblok (paardnaam + de 4 badges) komt een grid met **twee
kolommen: 70% links / 30% rechts**.

- **Rechterkolom (30%) â€” altijd zichtbaar**, ongeacht de actieve tab:
  1. **Identificatie** (UELN, chipnummer, paspoortnummer) â€” verhuist hierheen vanuit
     de huidige hoofdkolom.
  2. Daaronder: **Welzijn / EU** (slachtuitsluiting + datum).

- **Linkerkolom (70%) â€” tabstrip** met de volgende tabbladen:

  | Tab | Inhoud |
  |-----|--------|
  | **Algemeen** | De huidige panelen **Algemeen** Ã©n **Afstamming** samengevoegd in deze tab. |
  | **Gezondheid** | De bestaande `GezondheidTabs` met de sub-tabs Vaccinaties, Ontworming, Dierenarts, Hoefsmit (ongewijzigd, Ã©Ã©n niveau dieper genest onder deze tab). |
  | **Eigenaren** | Overzicht van alle eigenaren met hun gegevens (naam, e-mailadres). Per eigenaar een **bewerk-icoon (pen)** dat naar de bewerkpagina van die eigenaar leidt. Plus de bestaande mogelijkheid om eigenaren toe te voegen/koppelen (`EigenaarBeheer`: koppelen op e-mail + account aanmaken via `/paarden/[id]/eigenaren/nieuw`). |
  | **Voederschema** | Het bestaande `VoederschemaPanel` (rantsoenkaart). |
  | **Berichten** | Het bestaande `BerichtenPanel` (paardberichten). |

## Verduidelijkingen / open punten (vÃ³Ã³r bouwen beantwoorden)

1. **Bewerkpagina eigenaar bestaat nog niet.** Vandaag kun je eigenaren alleen
   *koppelen* (op e-mail) en *ontkoppelen*, en een account aanmaken via
   `/paarden/[id]/eigenaren/nieuw`. Het pen-icoon ("bewerkpagina van de eigenaar")
   vereist een **nieuwe route + pagina** om eigenaargegevens (naam, e-mail) te
   bewerken. Beslis: hoort die bewerkpagina bij deze story, of wordt het een
   aparte PBI? (Aanbeveling: aparte PBI; deze story toont het pen-icoon en linkt
   ernaartoe.)
2. **"Alle gegevens van de eigenaren":** het `User`-model bevat momenteel alleen
   `name` en `email`. "Alle gegevens" = naam + e-mailadres (+ eventueel
   account-/koppelstatus). Bevestig of er meer velden gewenst zijn (telefoon,
   adres) â€” dat zou een datamodel-uitbreiding zijn.
3. **Default/actieve tab:** Algemeen als standaard. Akkoord?
4. **Tab-state:** client-side (`useState` in een nieuw client wrapper-component)
   of via URL-query (`?tab=gezondheid`, deelbaar/bladwijzerbaar). Aanbeveling:
   URL-query, zodat een diepe link naar bv. Gezondheid mogelijk is.
5. **Responsive gedrag:** op smalle schermen klapt het 70/30-grid naar Ã©Ã©n kolom
   (rechterkolom onder de tabs). Bevestigen.
6. **Ontkoppelen blijft** in de Eigenaren-tab beschikbaar (bestaande functionaliteit).

## Betrokken bestanden (referentie, niet uitputtend)

- `src/app/(app)/paarden/[id]/page.tsx` â€” layout omzetten naar 70/30 grid + tabs;
  Identificatie en Welzijn/EU naar de rechterkolom.
- Nieuw: `src/features/paarden/PaardDetailTabs.tsx` (client) â€” tabstrip + actieve-tab-state.
- Hergebruik: `GezondheidTabs`, `VoederschemaPanel`, `BerichtenPanel`, `EigenaarBeheer`.
- `src/features/paarden/EigenaarBeheer.tsx` â€” pen-icoon per eigenaar toevoegen (link
  naar bewerkpagina) naast de bestaande ontkoppel-knop.
- `src/styles/globals.css` â€” tab-styling + 70/30-grid (hergebruik bestaande tokens;
  er bestaat al een tab-patroon bij `GezondheidTabs` om op voort te bouwen).
- (Mogelijk, afhankelijk van punt 1) nieuwe route `/paarden/[id]/eigenaren/[ownerId]/bewerken`.

## Acceptatiecriteria

1. Onder paardnaam + badges staat een 70/30 grid; de rechterkolom (30%) toont
   Identificatie met daaronder Welzijn/EU en is bij elke tab zichtbaar.
2. De linkerkolom (70%) heeft tabs: Algemeen, Gezondheid, Eigenaren, Voederschema,
   Berichten.
3. Tab Algemeen bevat de inhoud van de huidige panelen Algemeen + Afstamming.
4. Tab Gezondheid bevat de bestaande gezondheid-sub-tabs (Vaccinaties, Ontworming,
   Dierenarts, Hoefsmit), functioneel ongewijzigd.
5. Tab Eigenaren toont per eigenaar de gegevens, een pen-icoon naar de
   eigenaar-bewerkpagina, Ã©n de bestaande mogelijkheid om eigenaren te
   koppelen/toe te voegen en te ontkoppelen.
6. Tab Voederschema toont het bestaande VoederschemaPanel.
7. Tab Berichten toont het bestaande BerichtenPanel.
8. De herstructurering geldt voor de OWNER/STAFF-weergave (`canEdit`); de
   paardeneigenaar-weergave is ongewijzigd.
9. Geen datamodel-wijziging in deze story (tenzij punt 1/2 anders beslist).
