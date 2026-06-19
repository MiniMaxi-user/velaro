---
issue: 49
title: "Voorstel 18 - Voederschema (rantsoenkaart) op het paardenprofiel"
status: "Done"
labels: []
url: "https://github.com/MiniMaxi-user/velaro/issues/49"
archivedAt: 2026-06-19
---

# #49 — Voorstel 18 - Voederschema (rantsoenkaart) op het paardenprofiel

# Voorstel 18 - Voederschema (rantsoenkaart) op het paardenprofiel

Type: UITBREIDING

---

## Wat de klant mist (als staleigenaar, medewerker en eigenaar)

Ik run een pensionstal met twintig paarden. Elk paard eet anders: het ene
krijgt twee scheppen krachtvoer per dag, het andere alleen hooi, een derde
heeft een supplement tegen maagklachten en een vierde mag absoluut geen
suikerrijk voer. Op dit moment legt Velaro dit nergens vast.

Het paardenprofiel toont alles - ras, identificatie, afstamming, gezondheid,
mededelingen - behalve juist datgene wat een medewerker elke ochtend en
avond nodig heeft: wat krijgt dit paard te eten? Die kennis zit nu in het
hoofd van de vaste verzorger, op een briefje op de stal of in de
WhatsApp-groep. Valt de vaste medewerker uit, of komt er een nieuwe
stagiair, dan is die informatie weg.

Concreet scenario: de vaste verzorger is ziek. Een invaller doet de
avondronde. Hij opent in Velaro het profiel van een paard om te zien wat
het moet eten - en vindt niets. Hij voert op gevoel, geeft het verkeerde
of vergeet het supplement. De eigenaar ontdekt het en verliest vertrouwen
in de stal.

Tweede scenario: een paardeneigenaar wil weten of zijn paard daadwerkelijk
het voer en supplement krijgt dat hij heeft afgesproken. Hij kan dat nergens
in de app terugzien en moet bellen.

---

## Waarom waardevol (businesswaarde)

Businessplan-aansluitingspunten:

- Centraal paardenprofiel is MVP-onderdeel 1 en de kern van Velaro. Het
  voederschema is een van de meest gebruikte, dagelijks geraadpleegde stukken
  paardspecifieke informatie in een pensionstal. Zolang dit ontbreekt, is het
  profiel niet de complete bron van waarheid die het claimt te zijn.
- Gebruiksgemak is een van de vijf succesfactoren. Een nieuwe medewerker die
  in een oogopslag het rantsoen per paard ziet, kan direct zelfstandig de
  voerronde doen. Dat is precies het soort dagelijkse afhankelijkheid die
  Velaro onmisbaar maakt en wegtrekt van het briefje-op-de-stal.
- Communicatie (MVP-onderdeel 3): door het voederschema ook leesbaar te maken
  voor de paardeneigenaar, ziet de eigenaar transparant wat de stal zijn
  paard voert. Dat versterkt het vertrouwen tussen stal en klant - de kern
  van de pensionrelatie.
- Differentiatie: een gestructureerde, per-paard rantsoenkaart die
  staf invult en eigenaren kunnen inzien, is een concreet en herkenbaar
  voordeel ten opzichte van Stalmanager en EquineM voor de pensionstal-niche.

Past binnen de MVP-scope: het is een uitbreiding van het bestaande
paardenprofiel (bouwvolgordestap 2), niet een sprong naar facturatie (stap 6),
open API, marketplace of AI. Het is een afgebakende, paardspecifieke feature.

---

## Wat gebouwd moet worden (technisch)

Scope: een nieuw FeedingPlan-model (een-op-een met Horse), een query, een
server action, een client component op het paardenprofiel en een leesbare
sectie op de eigenaar-startpagina. Geen nieuwe routes; alles draait binnen het
bestaande /paarden/[id] en /eigenaar. Geen bestandsuploads, geen storage.

### 1. Schema-uitbreiding in prisma/schema.prisma

Nieuw model toevoegen na HoefsmitBezoek:

    model FeedingPlan {
      id        String   @id @default(uuid()) @db.Uuid
      horseId   String   @unique @db.Uuid
      roughage     String?
      concentrate  String?
      supplements  String?
      restrictions String?
      notes        String?
      updatedAt DateTime @updatedAt
      createdAt DateTime @default(now())

      horse Horse @relation(fields: [horseId], references: [id], onDelete: Cascade)
    }

Velden: roughage = ruwvoer (bv. 3x daags hooi), concentrate = krachtvoer
(bv. 2 scheppen muesli ochtend en avond), supplements = supplementen,
restrictions = beperkingen/allergie (bv. geen suikerrijk voer), notes =
overige opmerkingen. Bewust vrije tekstvelden, simpel voor de MVP.

Aan Horse toevoegen: feedingPlan FeedingPlan?

Uitvoeren na de wijziging:
    npx prisma migrate dev --name add-feeding-plan

### 2. Query in src/features/paarden/queries.ts

Een aparte functie toevoegen:

    export async function getFeedingPlan(horseId: string) {
      return prisma.feedingPlan.findUnique({ where: { horseId } })
    }

Op de eigenaar-startpagina kan dezelfde functie per paard worden aangeroepen.

### 3. Server action in src/features/paarden/actions.ts

Voeg een upsert-action saveFeedingPlan toe (een voederschema bestaat hooguit
een keer per paard). De action haalt de huidige gebruiker op, controleert via
getStableRole dat de gebruiker OWNER of STAFF van de stal van het paard is,
leest de vijf velden uit formData (elk getrimd of null), doet
prisma.feedingPlan.upsert op horseId, en roept revalidatePath aan voor
/paarden/[id]. Autorisatie volgt het bestaande patroon in dit bestand: alleen
OWNER/STAFF van de stal mag schrijven (role !== null). Paardeneigenaren hebben
alleen leesrecht.

### 4. Nieuw client component src/features/paarden/VoederschemaPanel.tsx

Een paneel analoog aan de bestaande detail-panelen. Twee modi:
- canEdit = true (staf/eigenaar van de stal): toont de vijf velden als
  bewerkbaar formulier (ruwvoer, krachtvoer, supplementen, beperkingen,
  opmerkingen) met een opslaan-knop via useActionState, zoals PaardForm.
- canEdit = false (paardeneigenaar): toont dezelfde velden alleen-lezen,
  met een em-dash voor lege velden, in de stijl van het Veld-component op
  het profiel.

Voor beperkingen met inhoud: toon die in een opvallende kleur (badge-warning
of danger), omdat een voerbeperking veiligheidskritisch is.

### 5. Voederschema-paneel op het paardenprofiel
   in src/app/(app)/paarden/[id]/page.tsx

Laad het voederschema mee in de bestaande Promise.all en render
VoederschemaPanel in de hoofdkolom, logischerwijs direct na het Algemeen-paneel
en voor of na GezondheidTabs. De canEdit-prop is de bestaande canEdit-variabele
(role !== null).

### 6. Compacte leesweergave op de eigenaar-startpagina
   in src/app/(app)/eigenaar/page.tsx

Laad per paard het voederschema en toon een compacte alleen-lezen sectie
Voederschema in het paard-panel, alleen zichtbaar als er minstens een veld
gevuld is. De eigenaar kan niet bewerken.

### Bestanden die wijzigen

- prisma/schema.prisma -- FeedingPlan model plus relatie op Horse
- src/features/paarden/queries.ts -- getFeedingPlan (circa 4 regels)
- src/features/paarden/actions.ts -- saveFeedingPlan upsert-action (circa 25 regels)
- src/features/paarden/VoederschemaPanel.tsx -- nieuw client component
  (circa 80 regels, lees- en bewerkmodus)
- src/app/(app)/paarden/[id]/page.tsx -- voederschema laden en paneel renderen
  (circa 8 regels)
- src/app/(app)/eigenaar/page.tsx -- voederschema per paard laden en compacte
  sectie renderen (circa 15 regels)
- src/styles/globals.css -- eventueel enkele utility-klassen voor het paneel
  (hergebruik bestaande panel- en detail-field-klassen waar mogelijk)

### Geen wijzigingen nodig in

- GezondheidTabs.tsx, MededelingenSectie.tsx, TaakItem.tsx
- Alle taken-, mededelingen- en admin-bestanden
- Andere routes

---

## Inschatting omvang

Middel.

- Schema-uitbreiding met migratie is vereist (een nieuw model, een-op-een).
- Een query-functie, een upsert-server-action.
- Een nieuw client component met lees- en bewerkmodus (circa 80 regels).
- Twee bestaande paginas uitbreiden met datalaag en render.
- Totaal: circa 130-150 regels nieuw of gewijzigd, verspreid over zes tot
  zeven bestanden. Geen bestandsuploads of storage.

---

## Acceptatiecriteria

1. Op /paarden/[id] verschijnt een paneel Voederschema met de velden
   ruwvoer, krachtvoer, supplementen, beperkingen en opmerkingen.
2. Een staleigenaar of stalmedewerker (role !== null) kan het voederschema
   invullen, wijzigen en opslaan via een formulier in dat paneel.
3. Na opslaan toont het paneel direct de bijgewerkte waarden (revalidatePath).
4. Een paardeneigenaar ziet het voederschema alleen-lezen en heeft geen
   bewerk- of opslaanknop.
5. Een gevuld veld beperkingen wordt visueel benadrukt (waarschuwingskleur),
   omdat een voerbeperking veiligheidskritisch is.
6. Lege velden tonen een em-dash in muted kleur, conform het bestaande
   Veld-component op het profiel.
7. Op /eigenaar ziet de eigenaar per paard-panel een compacte alleen-lezen
   Voederschema-sectie, alleen zichtbaar als minstens een veld gevuld is.
8. Er bestaat hooguit een voederschema per paard (upsert op horseId, uniek).
9. Prisma-migratie is vereist (nieuw model: FeedingPlan).
10. Geen nieuwe routes; geen bestandsuploads of storage.
11. Bestaande profielonderdelen (gezondheid, mededelingen, identificatie) zijn
    niet geraakt.
