---
issue: 38
title: "UITBREIDING: Ongelezen-badge voor eigenaar bij nieuwe mededelingen"
status: "Done"
labels: []
url: "https://github.com/MiniMaxi-user/velaro/issues/38"
archivedAt: 2026-06-19
---

# #38 — UITBREIDING: Ongelezen-badge voor eigenaar bij nieuwe mededelingen

# Voorstel 12 - Ongelezen-badge voor eigenaar bij nieuwe mededelingen

Type: UITBREIDING

---

## Wat de klant mist (als paardeneigenaar)

Ik log in op Velaro en zie mijn paard op de eigenaar-startpagina. Eronder staan
'Laatste mededelingen'. Maar ik weet niet of dit berichten zijn die ik al eerder
heb gezien of dat er iets nieuws is binnengekomen. Er is geen teller, geen
markering, geen signaal. Ik moet elke keer de tekst lezen om te weten of er
iets veranderd is ten opzichte van gisteren.

Concreet scenario: de stal plaatst vrijdagavond een mededeling dat Storm een
hoefprobleem heeft. De eigenaar opent de app zaterdagochtend, ziet de
startpagina en denkt: "Dit heb ik al gelezen" â€” terwijl het nieuw is. Hij mist
het bericht en rijdt toch naar de stal.

Wat ontbreekt: een ongelezen-teller op de eigenaar-startpagina en een
'gezien'-markering die bijhoudt welke mededelingen de eigenaar al heeft gelezen.

---

## Waarom waardevol (businesswaarde)

Pensionstallen communiceren dagelijks met eigenaren over de toestand van hun
paard. De mededelingenfunctie is nu functioneel maar passief â€” de eigenaar
moet zelf controleren. Een ongelezen-badge maakt de app actief: de eigenaar
wordt getrokken naar de relevante informatie.

Businessplan-aansluitingspunten:

- Communicatie staat als MVP-onderdeel 3 in het businessplan. Een ongelezen-
  teller is het verschil tussen een archief en een communicatiekanaal.
- Netwerkeffecten zijn een succesfactor: eigenaren die weten dat er iets nieuws
  staat, openen de app vaker. Meer opens = hogere retentie = sterkere SaaS-
  metrics voor Velaro.
- Mobiele ervaring: een ongelezen-badge werkt op elk schermformaat en is het
  meest herkenbare UX-patroon voor mobiele communicatie-apps.
- Bouwvolgorde CLAUDE.md stap 5 "Eigenaarscommunicatie + gedeeld profiel" is
  de eerstvolgende openstaande stap. De eigenaar ziet zijn paard al; hem ook
  laten weten dat er iets nieuws staat, voltooit de communicatielus.

Concurrentie-argument: Stalmanager en EquineM bieden geen ongelezen-markering
op berichten. Dit is een eenvoudig differentiatiepunt dat eigenaren direct
voelen.

---

## Wat gebouwd moet worden (technisch)

Scope: nieuw StableNoteRead-model, een server action markeerAlsGelezen, een
uitbreiding van de eigenaar-query en een badge in de eigenaar-UI.
Geen nieuwe routes.

### 1. Schema-uitbreiding in prisma/schema.prisma

Nieuw model toevoegen na StableNote:

    model StableNoteRead {
      id        String   @id @default(uuid()) @db.Uuid
      noteId    String   @db.Uuid
      userId    String   @db.Uuid
      readAt    DateTime @default(now())

      note StableNote @relation(fields: [noteId], references: [id], onDelete: Cascade)
      user User       @relation(fields: [userId], references: [id], onDelete: Cascade)

      @@unique([noteId, userId])
      @@index([userId])
    }

Aan StableNote toevoegen: reads StableNoteRead[]
Aan User toevoegen:        stableNoteReads StableNoteRead[]

Uitvoeren na de wijziging:
    npx prisma migrate dev --name add-stable-note-reads

### 2. Query uitbreiden in src/features/mededelingen/queries.ts

Nieuwe exportfunctie getUnreadCountForOwner(userId, horseId):

    export async function getUnreadCountForOwner(userId: string, horseId: string) {
      const gelezen = await prisma.stableNoteRead.findMany({
        where: { userId },
        select: { noteId: true },
      })
      const gelezenIds = new Set(gelezen.map((r) => r.noteId))

      const totaal = await prisma.stableNote.count({ where: { horseId } })
      const ongelezen = await prisma.stableNote.count({
        where: { horseId, id: { notIn: [...gelezenIds] } },
      })
      return { totaal, ongelezen }
    }

### 3. Server action in src/features/mededelingen/actions.ts

Voeg toe na de bestaande actions:

    export async function markNotesAsRead(horseId: string) {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Alleen eigenaren van dit paard mogen markeren
      const isOwner = await prisma.horseOwner.findFirst({
        where: { horseId, userId: user.id },
      })
      if (!isOwner) return

      const notes = await prisma.stableNote.findMany({
        where: { horseId },
        select: { id: true },
      })

      await prisma.$transaction(
        notes.map((n) =>
          prisma.stableNoteRead.upsert({
            where: { noteId_userId: { noteId: n.id, userId: user.id } },
            create: { noteId: n.id, userId: user.id },
            update: {},
          })
        )
      )
    }

### 4. Eigenaar-startpagina uitbreiden in src/app/(app)/eigenaar/page.tsx

Laad naast de notes ook de ongelezen-teller per paard:

    // Vervang de bestaande notesPerPaard-aanroep door een gecombineerde fetch:
    const [notesPerPaard, ongelezen] = await Promise.all([
      Promise.all(horses.map((h) => getNotesForHorse(h.id, 2))),
      Promise.all(horses.map((h) => getUnreadCountForOwner(user.id, h.id))),
    ])

Toon in de panel-header van elk paard een badge naast de naam wanneer
ongelezen[index].ongelezen > 0:

    {ongelezen[index].ongelezen > 0 && (
      <span className="badge badge-warning">
        {ongelezen[index].ongelezen} nieuw
      </span>
    )}

### 5. Mededelingen markeren als gelezen bij het openen van het paardenprofiel

In src/app/(app)/paarden/[id]/page.tsx, na de canView-check, voeg toe voor
een eigenaar (role === null en canView is true via HorseOwner):

    // Markeer mededelingen als gelezen voor paardeneigenaren
    const isHorseOwner = !role && canView
    if (isHorseOwner) {
      await markNotesAsRead(id)
    }

Zo verdwijnt de badge vanzelf de volgende keer dat de eigenaar de startpagina
opent, nadat hij het profiel heeft bezocht.

### Bestanden die wijzigen

- prisma/schema.prisma â€” StableNoteRead model plus relaties op StableNote en User
- src/features/mededelingen/queries.ts â€” getUnreadCountForOwner toevoegen
- src/features/mededelingen/actions.ts â€” markNotesAsRead toevoegen
- src/app/(app)/eigenaar/page.tsx â€” ongelezen-teller ophalen en badge renderen
- src/app/(app)/paarden/[id]/page.tsx â€” markNotesAsRead aanroepen voor eigenaren

### Geen wijzigingen nodig in

- MededelingenSectie.tsx (geen wijziging in het tonen van mededelingen)
- GezondheidTabs.tsx, TaakItem.tsx, Sidebar.tsx
- Alle andere routes

---

## Inschatting omvang

Middel.

- Schema-uitbreiding met migratie is vereist.
- Vier bestaande bestanden worden uitgebreid; geen nieuwe routes.
- De markeer-logica is idempotent (upsert) en heeft geen race-conditions.
- De ongelezen-teller is een eenvoudige count-vergelijking; geen real-time
  updates nodig, de startpagina is een server component en herlaadt bij
  navigatie automatisch.

---

## Acceptatiecriteria

1. Een paardeneigenaar ziet op /eigenaar naast de paard-naam een badge
   "N nieuw" wanneer er mededelingen zijn die hij nog niet heeft geopend.
   De badge is niet zichtbaar wanneer alle mededelingen zijn gelezen.
2. Wanneer de eigenaar het paardenprofiel (/paarden/[id]) bezoekt, worden
   alle mededelingen van dat paard voor hem als gelezen gemarkeerd.
3. De volgende keer dat de eigenaar /eigenaar laadt, is de badge weg.
4. Een staleigenaar of medewerker heeft geen badge op de eigenaar-startpagina
   (zij gebruiken /stal en /paarden, niet /eigenaar).
5. Een nieuwe mededeling van de stal doet de badge bij alle gekoppelde
   eigenaren van dat paard opnieuw oplichten (de mededeling heeft nog geen
   StableNoteRead-rij voor die eigenaren).
6. Prisma-migratie is vereist (nieuw model: StableNoteRead).
