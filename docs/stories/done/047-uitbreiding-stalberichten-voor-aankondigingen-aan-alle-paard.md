---
issue: 47
title: "UITBREIDING: Stalberichten voor aankondigingen aan alle paardeneigenaren"
status: "Done"
labels: []
url: "https://github.com/MiniMaxi-user/velaro/issues/47"
archivedAt: 2026-06-19
---

# #47 — UITBREIDING: Stalberichten voor aankondigingen aan alle paardeneigenaren

# Voorstel 16 - Stalberichten: aankondigingen aan alle paardeneigenaren

Type: UITBREIDING

---

## Wat de klant mist (als staleigenaar)

Ik beheer een pensionstal met twintig paarden en vijftien eigenaren. Ik wil
alle eigenaren informeren over de stalsluitingen kerst, de nieuwe openingstijden
of dat de rijbaan volgende week wordt afgezet voor onderhoud. Op dit moment kan
ik per paard een mededeling plaatsen. Dat betekent: twintig keer dezelfde tekst
intypen, twintig keer plaatsen, twintig keer op het goede paard klikken.

Er is geen manier om een bericht aan de hele stal tegelijk te sturen.

De bestaande mededelingenfunctie is gekoppeld aan een individueel paard. Dat is
juist voor paard-specifieke communicatie, maar niet voor stalbreed nieuws dat
alle eigenaren evenveel aangaat. Een stalbericht is een apart type: gestuurd
door de stal, zichtbaar voor alle eigenaren van die stal, niet gebonden aan
een specifiek paard.

Concreet scenario: kerst nadert. De staleigenaar wil berichten dat de stal op
24 en 25 december gesloten is voor bezoekers. Hij opent Velaro en ziet geen
knop daarvoor. Hij gooit het in de WhatsApp-groep. Velaro heeft weer een reden
gemist om het centrale communicatieplatform voor de stal te zijn.

---

## Waarom waardevol (businesswaarde)

Businessplan-aansluitingspunten:

- Communicatie staat als MVP-onderdeel 3 in het businessplan. Communicatie is
  meer dan paard-specifieke berichten. Stalberichten zijn de kern van
  staleigenaarscommunicatie: sluitingen, regelwijzigingen, evenementen. Zolang
  dit ontbreekt, concurreert Velaro niet met WhatsApp maar vult het een gat
  dat WhatsApp laat.
- Netwerkeffecten zijn een succesfactor. Eigenaren die stalbreed nieuws in de
  app ontvangen, hebben een reden om dagelijks in te loggen, niet alleen
  wanneer hun paard een probleem heeft. Hogere dagelijkse opens versterken
  retentie en SaaS-metrics.
- Mobiele ervaring als succesfactor: een stalbericht verschijnt op de
  eigenaar-startpagina zodra de eigenaar inlogt, zonder dat hij per paard
  door de mededelingen hoeft te bladeren.
- Differentiatie ten opzichte van Stalmanager en EquineM: massaberichten aan
  eigenaargroepen ontbreken bij de voornaamste concurrenten. Dit is een
  concreet voordeel dat de staleigenaar voelt bij elke stalbreed aankondiging.
- Bouwvolgorde CLAUDE.md stap 5 Eigenaarscommunicatie plus gedeeld profiel
  is de eerstvolgende openstaande stap. Stalberichten zijn de logische
  aanvulling op paard-specifieke mededelingen: samen dekken ze de volledige
  communicatiebehoefte van de staleigenaar richting zijn klanten.

---

## Wat gebouwd moet worden (technisch)

Scope: nieuw StableAnnouncement-model, twee server actions, een query,
een nieuw client component voor het staldashboard en een sectie op de
eigenaar-startpagina. Geen nieuwe routes buiten de bestaande /stal en
/eigenaar.

### 1. Schema-uitbreiding in prisma/schema.prisma

Nieuw model toevoegen na StableNoteRead:

    model StableAnnouncement {
      id        String   @id @default(uuid()) @db.Uuid
      stableId  String   @db.Uuid
      authorId  String   @db.Uuid
      message   String
      createdAt DateTime @default(now())

      stable Stable @relation(fields: [stableId], references: [id], onDelete: Cascade)
      author User   @relation(fields: [authorId], references: [id], onDelete: Cascade)

      @@index([stableId])
    }

Aan Stable toevoegen: announcements StableAnnouncement[]
Aan User toevoegen:   stableAnnouncements StableAnnouncement[]

Uitvoeren na de wijziging:
    npx prisma migrate dev --name add-stable-announcements

### 2. Query in src/features/mededelingen/queries.ts

Exporteer twee nieuwe functies:

    export async function getAnnouncementsForStable(stableId: string, limit = 5) {
      return prisma.stableAnnouncement.findMany({
        where: { stableId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: { author: { select: { name: true, email: true } } },
      })
    }

    export async function getAnnouncementsForHorse(horseId: string, limit = 3) {
      const horse = await prisma.horse.findUnique({
        where: { id: horseId },
        select: { stableId: true },
      })
      if (!horse) return []
      return getAnnouncementsForStable(horse.stableId, limit)
    }

### 3. Server actions in src/features/mededelingen/actions.ts

Voeg toe na de bestaande actions:

    export async function createAnnouncement(stableId: string, formData: FormData) {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) redirect('/login')

      const role = await getStableRole(user.id, stableId)
      if (role !== 'OWNER') throw new Error('Alleen staleigenaren kunnen stalberichten plaatsen')

      const message = (formData.get('message') as string)?.trim()
      if (!message) return { error: 'Bericht is verplicht' }

      await prisma.stableAnnouncement.create({
        data: { stableId, authorId: user.id, message },
      })
      revalidatePath('/stal')
    }

    export async function deleteAnnouncement(id: string) {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) redirect('/login')

      const ann = await prisma.stableAnnouncement.findUnique({ where: { id } })
      if (!ann) throw new Error('Stalbericht niet gevonden')

      const role = await getStableRole(user.id, ann.stableId)
      if (role !== 'OWNER') throw new Error('Geen toegang')

      await prisma.stableAnnouncement.delete({ where: { id } })
      revalidatePath('/stal')
    }

### 4. Nieuw client component src/features/mededelingen/StalbrichtPanel.tsx

Analoog aan MededelingenSectie maar zonder paard-koppeling. Het component
ontvangt als props: stableId, announcements (initieel geladen door de server
component) en isOwner. Het toont:
- De lijst van berichten als note-item blokken (auteur, datum, tekst).
- Per bericht een verwijderknop met confirm-dialoog, alleen als isOwner.
- Onderaan een formulier (textarea en plaatsen-knop), alleen als isOwner.

### 5. Stalberichten laden op het staldashboard in src/app/(app)/stal/page.tsx

Uitbreiding van de bestaande Promise.all om announcements parallel te laden:

    const [horses, tasks, zorgActies, announcements] = await Promise.all([
      getHorsesForStable(stable.id),
      getTasksForDate(stable.id, today),
      getAankomendGezondheidActies(stable.id),
      getAnnouncementsForStable(stable.id, 5),
    ])

Render StalbrichtPanel als een nieuw paneel op het dashboard, na de
bestaande AankomendZorgPanel. De isOwner-prop wordt bepaald op basis van
de bestaande role-variabele (role === 'OWNER').

### 6. Stalberichten-sectie op de eigenaar-startpagina
   in src/app/(app)/eigenaar/page.tsx

Uitbreiding van de bestaande Promise.all:

    const [notesPerPaard, ongelezen, announcementsPerPaard] = await Promise.all([
      Promise.all(horses.map((h) => getNotesForHorse(h.id, 2))),
      Promise.all(horses.map((h) => getUnreadCountForOwner(user.id, h.id))),
      Promise.all(horses.map((h) => getAnnouncementsForHorse(h.id, 3))),
    ])

In elk paard-panel: toon boven de mededelingen-sectie een compacte
Stalberichten-sectie, alleen zichtbaar als announcementsPerPaard[index].length > 0.
Per bericht: datum en berichttekst. Auteursnaam is minder relevant voor de
eigenaar; de stal is als afzender impliciet. De eigenaar kan niet plaatsen
of verwijderen.

### Bestanden die wijzigen

- prisma/schema.prisma -- StableAnnouncement model plus relaties op Stable en User
- src/features/mededelingen/queries.ts -- twee nieuwe functies (circa 20 regels)
- src/features/mededelingen/actions.ts -- createAnnouncement en deleteAnnouncement
  (circa 35 regels)
- src/features/mededelingen/StalbrichtPanel.tsx -- nieuw client component
  (circa 60 regels, analoog aan MededelingenSectie)
- src/app/(app)/stal/page.tsx -- announcements laden en StalbrichtPanel
  renderen (circa 10 regels)
- src/app/(app)/eigenaar/page.tsx -- announcementsPerPaard laden en sectie
  renderen (circa 20 regels)

### Geen wijzigingen nodig in

- MededelingenSectie.tsx (per-paard mededelingen blijven ongewijzigd)
- GezondheidTabs.tsx, TaakItem.tsx, Sidebar.tsx
- Alle andere routes

---

## Inschatting omvang

Middel.

- Schema-uitbreiding met migratie is vereist.
- Twee nieuwe query-functies, twee nieuwe server actions.
- Een nieuw client component (circa 60 regels), sterk analoog aan
  MededelingenSectie.
- Twee bestaande paginas uitbreiden met een datalaag en render-sectie.
- Totaal: circa 145 regels nieuw of gewijzigd, verspreid over zes bestanden.

---

## Acceptatiecriteria

1. Een staleigenaar ziet op /stal een Stalberichten-panel met de vijf
   recentste stalberichten en een formulier om een nieuw stalbericht te plaatsen.
2. Het plaatsen van een stalbericht is voorbehouden aan de OWNER-rol. Een
   STAFF-medewerker en een paardeneigenaar zien het formulier niet.
3. Een staleigenaar kan een stalbericht verwijderen via een verwijderknop met
   confirm-dialoog, analoog aan andere verwijderknoppen in de app.
4. Een paardeneigenaar ziet op /eigenaar in het paard-panel een
   Stalberichten-sectie met de drie recentste berichten van de stal waar zijn
   paard staat. De sectie is alleen zichtbaar als er berichten zijn.
5. Een paardeneigenaar kan geen stalberichten plaatsen of verwijderen.
6. Als een eigenaar paarden in meerdere stallen heeft, ziet hij per paard-panel
   de berichten van de bijbehorende stal, niet door elkaar.
7. Prisma-migratie is vereist (nieuw model: StableAnnouncement).
8. De bestaande paard-specifieke mededelingen (StableNote) zijn niet geraakt.
9. Geen nieuwe routes nodig.
