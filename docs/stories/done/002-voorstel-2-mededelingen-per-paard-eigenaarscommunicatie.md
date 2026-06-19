---
issue: 2
title: "Voorstel 2 - Mededelingen per paard (eigenaarscommunicatie)"
status: "Done"
labels: []
url: "https://github.com/MiniMaxi-user/velaro/issues/2"
archivedAt: 2026-06-19
---

# #2 — Voorstel 2 - Mededelingen per paard (eigenaarscommunicatie)

# Voorstel 2 - Mededelingen per paard (eigenaarscommunicatie)

Type: UITBREIDING

---

## Wat de klant mist

Een paardeneigenaar die inlogt op Velaro ziet momenteel alleen de read-only
profielgegevens van zijn paard: basisinfo, gezondheidsregistraties en
identificatiegegevens. Er is geen manier voor de staleigenaar of medewerker
om een bericht achter te laten dat specifiek voor die eigenaar of dat paard
bedoeld is.

In de praktijk loopt alle communicatie nu via WhatsApp of mondelinge overdracht.
Dat is precies het probleem dat het businessplan beschrijft: de markt is versnipperd
over WhatsApp en losse apps. Een eenvoudige mededelingenfunctie per paard verandert
Velaro van een administratietool in een communicatieplatform.

---

## Waarom waardevol voor de doelgroep (pensionstallen)

Pensionstallen communiceren dagelijks met eigenaren over:
- Kleine blessures of observaties ("been warm, rust gehouden")
- Bezoekplanningen van dierenarts of hoefsmid
- Bijzonderheden in gedrag of eetlust
- Bevestiging dat een taak is uitgevoerd ("vaccinatie vandaag gezet")

Nu gaat dit via een aparte WhatsApp-groep of losse appjes. De eigenaar kan
dit niet terugvinden in de context van het paard, en de stal heeft geen
bewijsbare communicatiehistorie.

Een chronologische tijdlijn van mededelingen per paard, zichtbaar voor zowel
de staleigenaar/medewerker als de paardeneigenaar, lost dit direct op.

Businessplan-aansluiting:
- Bouwvolgorde stap 5 uit CLAUDE.md: "Eigenaarscommunicatie + gedeeld profiel"
- Businessplan-doel: platform ipv losse app, communicatie als MVP-onderdeel
- Succesfactoren: "Gebruiksgemak" en "Netwerkeffecten" - de eigenaar keert
  dagelijks terug naar de app als er relevante berichten voor hem/haar staan

---

## Wat gebouwd moet worden

Scope: een nieuw Prisma-model, twee server actions, een query en een
UI-sectie op het paardenprofiel. Geen nieuwe route nodig.

### 1. Prisma-schema uitbreiden

Nieuw model toevoegen aan prisma/schema.prisma:

    model StableNote {
      id        String   @id @default(uuid()) @db.Uuid
      horseId   String   @db.Uuid
      authorId  String   @db.Uuid
      message   String
      createdAt DateTime @default(now())

      horse  Horse @relation(fields: [horseId], references: [id], onDelete: Cascade)
      author User  @relation(fields: [authorId], references: [id], onDelete: Cascade)

      @@index([horseId])
    }

Horse krijgt een relatie: notes StableNote[]
User krijgt een relatie: stableNotes StableNote[]

Daarna uitvoeren: prisma migrate dev --name add-stable-notes

### 2. Query in src/features/mededelingen/queries.ts

getNotesForHorse(horseId: string): haalt de laatste 20 mededelingen op,
inclusief author (name, email), gesorteerd op createdAt desc.

### 3. Server actions in src/features/mededelingen/actions.ts

createNote(horseId, formData):
  - vereist stableMember-rol (OWNER of STAFF), anders throw
  - slaat message op met authorId = ingelogde user
  - revalidatePath voor het paardenprofiel

deleteNote(noteId, horseId):
  - vereist OWNER-rol of eigen bericht (authorId == user.id)
  - verwijdert de rij
  - revalidatePath

### 4. UI-component src/features/mededelingen/MededelingenSectie.tsx

Client component met:
- Formulier: textarea + verzend-knop, alleen zichtbaar als canEdit true
- Tijdlijn: avatar met initialen auteur, naam, datum, berichttekst,
  verwijderknop zichtbaar voor OWNER of eigen bericht
- Lege staat: "Nog geen mededelingen voor dit paard."

### 5. Integratie op het paardenprofiel

In src/app/(app)/paarden/[id]/page.tsx:
- getNotesForHorse aanroepen naast de bestaande queries
- MededelingenSectie toevoegen als nieuw panel in de hoofdkolom,
  onderaan na de drie gezondheidsblokken
- Props meegeven: notes, horseId, canEdit, isOwner (rol === "OWNER")

---

## Acceptatiecriteria

1. Een staleigenaar of medewerker kan een mededeling typen op het
   paardenprofiel en opslaan. De mededeling verschijnt direct in de
   tijdlijn met naam en timestamp.
2. Een paardeneigenaar ziet de tijdlijn van mededelingen voor zijn paard
   (read-only); het invoerformulier is niet zichtbaar.
3. Een OWNER kan elke mededeling verwijderen; STAFF kan alleen eigen
   berichten verwijderen.
4. De sectie toont een lege staat als er nog geen mededelingen zijn.
5. Geen schemawijziging buiten het nieuwe StableNote-model en de twee
   nieuwe relaties op Horse en User.
