---
issue: 118
title: "Als staleigenaar wil ik een foto bij een paard kunnen uploaden, bijsnijden en tonen"
status: "Done"
labels: []
url: "https://github.com/MiniMaxi-user/velaro/issues/118"
archivedAt: 2026-06-19
---

# #118 — Als staleigenaar wil ik een foto bij een paard kunnen uploaden, bijsnijden en tonen

# User Story

Als **staleigenaar (OWNER) / stalmedewerker (STAFF)**
wil ik **een foto bij een paard kunnen uploaden, bijsnijden en vervangen**
zodat **het paard herkenbaar wordt getoond in lijsten, op het profiel en op de contract-PDF**, in plaats van een generiek paard-icoon.

# Context

Op dit moment tonen alle paard-weergaven een vast emoji-icoon (paard-emoji) als avatar:
- In de paardenlijst (`/paarden`) staat in de naam-cel een `.cell-avatar` met het paard-icoon.
- Op de detailpagina (`/paarden/[id]`) staat de naam in de `.detail-header`-balk zonder afbeelding.
- Het bewerk-scherm (`/paarden/[id]/bewerken`) heeft geen foto-veld.
- De contract-PDF toont de paardnaam als tekst, zonder foto.

We hebben al een volledig, herbruikbaar upload-patroon voor het stallogo (#98):
logoStorage.ts (prive Supabase Storage-bucket + signed URL + data-URL voor PDF),
logoValidatie.ts (server-side type/grootte/afmetingen-validatie zonder zware
image-dependency) en LogoBeheer.tsx (preview + upload/vervangen/verwijderen met
client-side voorcontrole). Deze story past datzelfde patroon toe op het paard, met
als extra een bijsnijd-stap (vierkant/cirkel) zodat altijd een nette ronde avatar ontstaat.

Waarom: een paardfoto maakt het platform persoonlijker en herkenbaarder, en geeft
de contract-PDF en de eigenaar-weergave een professionelere uitstraling.

Bron-issue (oorspronkelijke wens): foto tonen in lijsten (klein rondje i.p.v. icoon),
op de detailpagina in de naam-balk (iets groter, met afgewerkte rand), op het edit-scherm
uploadbaar (pennetje bij de foto), met upload-tips (alleen het hoofd in beeld), een
cirkel-bijsnijder na upload, en netjes uitgelijnd op de PDF.

# Scope

In scope
- Datamodel: een veld op Horse voor het storage-pad van de foto (bijv. photoPath String?).
- Prive Supabase Storage-bucket voor paardfotos (analoog aan stable-logos), idempotent aangemaakt.
- Server-side opslag-/verwijder-/signed-URL-/data-URL-helpers (analoog aan logoStorage.ts), inclusief opruimen van de oude foto bij vervangen.
- Server-side validatie van type (PNG/JPG/JPEG) en grootte (analoog aan logoValidatie.ts, hergebruik waar mogelijk).
- Bijsnijden voor opslaan: na het kiezen van een bestand kan de gebruiker met een ronde/vierkante uitsnede bepalen welk deel in beeld komt; het bijgesneden vierkante resultaat wordt geupload. Het rondje is een weergave-masker; opslaan gebeurt als vierkant.
- Upload-/bijsnijd-UI op het bewerk-scherm (/paarden/[id]/bewerken): huidige foto of placeholder met een bewerk-/pennetje-affordance, plus uploaden / vervangen / verwijderen.
- Korte, zichtbare tips bij het uploaden (breng alleen het hoofd van het paard in beeld).
- Tonen van de foto (rond, met nette rand) op:
  - de paardenlijst /paarden (alle drie de weergaven: stal-modus, alle-stallen-modus, paardeneigenaar-modus) -- vervangt het paard-icoon in .cell-avatar.
  - de detailpagina-balk /paarden/[id] -- voor de naam in .detail-header, balkhoogte behouden, met afgewerkte rand.
  - de contract-PDF (pdf.ts) -- netjes uitgelijnd, als rond/vierkant element met afgewerkte rand, via een data-URL (zoals het stallogo). Valt terug op geen-foto wanneer er geen foto is.
- Autorisatie: uploaden/vervangen/verwijderen mag alleen OWNER/STAFF van de stal van het paard (dezelfde grens als paard bewerken: role !== null). Bekijken volgt de bestaande canViewHorse-regel (ook paardeneigenaar ziet de foto).

Niet in scope
- Een apart media- of fotogalerij-scherm; er is een avatar-/profielfoto per paard, geen meerdere fotos.
- Fotos op andere entiteiten (eigenaren/accounts, stal). Dit raakt NIET #114/#116/#117 (accounts-gebied) -- die gaan over paardeneigenaren/bedrijfsgegevens, niet over paarden.
- Automatische beeldherkenning/uitsnijden van het paardenhoofd (alleen handmatig bijsnijden).
- Wijzigingen aan het PaardKaart-component tenzij dat component daadwerkelijk in een zichtbaar scherm gebruikt wordt (zie open vraag).

# Acceptatiecriteria

Uploaden en bijsnijden
- Als ik OWNER/STAFF ben en /paarden/[id]/bewerken open, wanneer het paard nog geen foto heeft, dan zie ik een placeholder met een duidelijke affordance om een foto toe te voegen, plus de tip om alleen het hoofd van het paard in beeld te brengen.
- Als ik een afbeelding kies, wanneer het bestand is geladen, dan kan ik met een ronde/vierkante uitsnede bepalen welk deel zichtbaar wordt voor ik opslaat.
- Als ik een geldige foto bevestig, wanneer het opslaan slaagt, dan wordt de foto bewaard, is de oude foto verwijderd uit opslag, en zie ik direct de nieuwe foto.
- Als ik een bestand kies dat geen PNG/JPG/JPEG is of te groot is, wanneer ik probeer op te slaan, dan krijg ik een Nederlandstalige foutmelding en wordt er niets opgeslagen.
- Als het paard een foto heeft, wanneer ik op verwijderen klik en bevestig, dan wordt de foto verwijderd (storage leeg en photoPath leeg) en valt alles terug op de placeholder/icoon.

Tonen
- Als een paard een foto heeft, wanneer ik de paardenlijst /paarden open (in elke modus), dan zie ik die foto als klein rond avatar i.p.v. het paard-icoon; zonder foto zie ik het bestaande paard-icoon.
- Als een paard een foto heeft, wanneer ik de detailpagina /paarden/[id] open, dan staat de foto rond, met afgewerkte rand, voor de naam in de header-balk; de balkhoogte blijft gelijk aan de huidige situatie.
- Als een paardeneigenaar zijn eigen paard bekijkt, wanneer er een foto is, dan ziet ook hij de foto (lijst + detail), maar heeft hij geen upload-/bewerk-mogelijkheid.
- Als een contract-PDF wordt gegenereerd voor een paard met foto, wanneer de PDF wordt opgebouwd, dan staat de foto netjes uitgelijnd met afgewerkte rand in de PDF; zonder foto bevat de PDF geen lege fotoplaats.

Autorisatie
- Als ik geen OWNER/STAFF ben van de stal van het paard, wanneer ik probeer een foto te uploaden/vervangen/verwijderen, dan wordt de actie server-side geweigerd.

# Technische notities / relevante bestanden

- Sterk leidend referentiepatroon (hergebruiken, niet opnieuw verzinnen):
  - src/features/stal/logoStorage.ts -- bucket-ensure, opslaan/vervangen/verwijderen, getStableLogoSignedUrl (UI), getStableLogoDataUrl (PDF).
  - src/features/stal/logoValidatie.ts -- type/grootte/afmetingen-validatie zonder zware dependency.
  - src/features/stal/LogoBeheer.tsx + logoActions.ts -- upload/vervangen/verwijderen UI + server actions.
  - Maak een analoge paardFotoStorage.ts/validatie in src/features/paarden/ met een eigen prive bucket (bijv. horse-photos), key-prefix per horseId.
- Datamodel: voeg photoPath String? toe aan model Horse (prisma/schema.prisma) + migratie. Schemawijziging is toegestaan (zie project-memory Schemawijzigingen toegestaan).
- Tonen -- lijsten: src/app/(app)/paarden/page.tsx -- vervang in alle drie de tabellen de .cell-avatar met het paard-icoon door de foto (signed URL) met fallback op het icoon. Let op: lijsten halen meerdere paarden op; lever de foto-URLs efficient aan (bijv. een batch signed-URL-stap), niet per rij een losse query.
- Tonen -- detail: src/app/(app)/paarden/[id]/page.tsx -- foto in .detail-header-left voor de detail-title. Mogelijk een kleine CSS-toevoeging in src/styles/globals.css voor de ronde avatar + rand (geen nieuwe kleuren; gebruik bestaande tokens).
- Edit-scherm: src/app/(app)/paarden/[id]/bewerken/page.tsx + src/features/paarden/PaardForm.tsx (of een apart PaardFotoBeheer.tsx-component naar voorbeeld van LogoBeheer.tsx).
- PDF: src/features/contracten/pdf.ts -- voeg een paardFotoDataUrl toe aan de context-opbouw (analoog aan stalLogoDataUrl) en render het in het PDF-document (zoals het Image-element voor het logo).
- Bijsnijder: er is nog GEEN crop-library in package.json. Een lichte, gangbare client-side cropper (bijv. react-easy-crop) is toegestaan voor de cirkel/vierkant-uitsnede; het bijgesneden vierkante beeld wordt geupload. Geen server-side image processing (geen sharp) -- consistent met het logo-patroon dat zonder zware image-dependency werkt.
- UI-teksten Nederlandstalig; styling via bestaande tokens/klassen (.cell-avatar, .detail-header, badges), geen tailwind.config.ts.

# Open vragen

- src/features/paarden/PaardKaart.tsx toont een paard-kaart zonder avatar, maar lijkt niet in een actief scherm gebruikt te worden (de lijsten gebruiken tabellen, niet deze kaart). Wordt PaardKaart nog ergens getoond? Zo ja, dan hoort de foto daar ook bij; zo nee, dan blijft hij buiten scope. Niet blokkerend -- defaultaanname: buiten scope tenzij in gebruik.
