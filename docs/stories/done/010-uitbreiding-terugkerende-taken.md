---
issue: 10
title: "UITBREIDING: Terugkerende taken"
status: "Done"
labels: []
url: "https://github.com/MiniMaxi-user/velaro/issues/10"
archivedAt: 2026-06-19
---

# #10 — UITBREIDING: Terugkerende taken

# Voorstel 8 - Terugkerende taken

Type: UITBREIDING

---

## Wat de klant mist

Pensionstallen draaien op cyclische routines: de hoefsmid komt elke zes weken,
ontworming gaat elk kwartaal de ronde, dagelijkse verzorgingstaken herhalen
zich elke dag of elke week. Op dit moment moet elke taak handmatig opnieuw
worden ingevoerd voor elke dag. Er is geen manier om een taak in te stellen
als 'herhaal dagelijks', 'herhaal wekelijks op maandag' of 'herhaal
maandelijks'.

Een staleigenaar of medewerker die dagelijkse voertijden, wekelijkse longe-
sessies of maandelijkse hoefverzorging wil bijhouden, typt dezelfde omschrijving
elke keer opnieuw. Dat kost tijd, leidt tot inconsistenties in omschrijvingen
en zorgt ervoor dat taken simpelweg worden overgeslagen zodra de dagelijkse
invoerlast te hoog wordt.

---

## Waarom waardevol voor de doelgroep (pensionstallen)

Pensionstallen zijn routinegedreven bedrijven. De waarde van een takenmodule
zit niet in het eenmalig aanmaken van taken, maar in het bijhouden van
terugkerende verantwoordelijkheden over tijd. Zonder herhaling is de
takenpagina een notitieblokje in plaats van een planningtool.

Businessplan-aansluiting:
- Het businessplan noemt 'Planning' als MVP-onderdeel 2, direct na het
  centrale paardenprofiel. Terugkerende taken zijn de kern van stalbeheer
  als planningsinstrument.
- 'Gebruiksgemak' is een van de vijf genoemde succesfactoren: iedere dag
  opnieuw handmatig een taak aanmaken is het tegenovergestelde van
  gebruiksgemak.
- 'Mobiele ervaring' staat als succesfactor: terugkerende taken zijn op
  mobiel juist het meest waardevol omdat medewerkers alleen de uitzondering
  hoeven te signaleren, niet de hele planning opnieuw te typen.
- CLAUDE.md bouwvolgorde stap 4 (taken/planning) is gebouwd maar incompleet
  zolang herhaling ontbreekt. Concurrenten als Stalmanager en EquineM bieden
  dit als basisfeature.

---

## Wat gebouwd moet worden

Scope: schema-uitbreiding met een nieuw RecurringTask-model, twee server
actions, een uitbreiding van de takenpagina-query en een klein UI-formulier.
Geen nieuwe routes.

### 1. Schema-uitbreiding in prisma/schema.prisma

Nieuw model toevoegen:

    model RecurringTask {
      id         String        @id @default(uuid()) @db.Uuid
      stableId   String        @db.Uuid
      horseId    String?       @db.Uuid
      title      String
      frequency  RecurringFreq
      dayOfWeek  Int?          // 0=ma t/m 6=zo; alleen bij WEEKLY
      dayOfMonth Int?          // 1-28; alleen bij MONTHLY
      isActive   Boolean       @default(true)
      createdAt  DateTime      @default(now())

      stable Stable  @relation(fields: [stableId], references: [id], onDelete: Cascade)
      horse  Horse?  @relation(fields: [horseId], references: [id], onDelete: SetNull)

      @@index([stableId])
    }

    enum RecurringFreq {
      DAILY
      WEEKLY
      MONTHLY
    }

Stable en Horse krijgen elk een relatie: recurringTasks RecurringTask[]

Uitvoeren na de wijziging:
    npx prisma migrate dev --name add-recurring-tasks

### 2. Genereer-logica in src/features/taken/recurringHelpers.ts

Exporteer een pure functie shouldRunToday(task, date) die controleert of
een RecurringTask-sjabloon op de gegeven datum actief is:
- DAILY: altijd true.
- WEEKLY: true als de weekdag van date overeenkomt met task.dayOfWeek
  (0=maandag via (date.getDay() + 6) % 7).
- MONTHLY: true als date.getDate() === task.dayOfMonth.

### 3. Server action ensureRecurringTasksForDate

Voeg toe aan src/features/taken/actions.ts. De action haalt actieve
RecurringTask-sjablonen op voor de stal, filtert via shouldRunToday,
en maakt voor elke treffer een Task-rij aan als die nog niet bestaat
(idempotent via findFirst-check op stableId + horseId + title + date).

Roep deze action aan in src/app/(app)/stal/taken/page.tsx direct voor
de getTasksForDate-aanroep, zodat de dag-weergave altijd compleet is.

### 4. Server actions voor sjabloonbeheer in src/features/taken/actions.ts

createRecurringTask(formData): valideert title + frequency, berekent
dayOfWeek/dayOfMonth uit de form, slaat op via prisma.recurringTask.create.

deleteRecurringTask(id): controleert r.stableId === stable.id, verwijdert
via prisma.recurringTask.delete. Beide roepen revalidatePath('/stal/taken') aan.

### 5. UI-component src/features/taken/TerugkerendeTakenBeheer.tsx

Client component, staat standaard ingeklapt (useState) om de takenpagina
niet te overladen. Toon/verberg via een knop 'Terugkerende taken beheren'.

Wanneer geopend toont het:
- Lijst van actieve sjablonen: titel, frequentielabel ('Dagelijks',
  'Wekelijks op [dag]', 'Maandelijks op dag [N]'), optioneel paard,
  en een verwijderknop met confirm().
- Formulier voor nieuw sjabloon: tekstveld (title), select frequentie
  (Dagelijks / Wekelijks / Maandelijks), conditionele extra velden
  (dagkiezer bij Wekelijks, dagnummer 1-28 bij Maandelijks), paard-select.

### 6. Query toevoegen aan src/features/taken/queries.ts

    export async function getRecurringTasksForStable(stableId) {
      return prisma.recurringTask.findMany({
        where: { stableId, isActive: true },
        include: { horse: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'asc' },
      })
    }

### 7. Integratie in src/app/(app)/stal/taken/page.tsx

Voeg getRecurringTasksForStable toe aan de Promise.all en geef recurringTasks
als prop mee aan TerugkerendeTakenBeheer. Render het component onderaan de
pagina, na de gedaan-sectie.

---

## Acceptatiecriteria

1. Een staleigenaar of medewerker kan een terugkerende taak aanmaken met
   frequentie Dagelijks, Wekelijks (dag naar keuze) of Maandelijks
   (dagnummer naar keuze). De taak verschijnt daarna automatisch op elke
   relevante dag in de takenpagina zonder handmatige invoer.
2. Bij het openen van een dag waarvoor terugkerende taken gelden worden de
   bijbehorende Task-rijen automatisch aangemaakt als ze nog niet bestaan.
   Een taak wordt nooit twee keer aangemaakt voor dezelfde dag (idempotent).
3. Terugkerende taken die zijn aangemaakt als Task-rij kunnen worden afgevinkt
   en verwijderd zoals elke andere taak; dit raakt de RecurringTask-sjabloon
   niet.
4. In het TerugkerendeTakenBeheer-paneel zijn alle actieve sjablonen zichtbaar
   met een duidelijk frequentielabel. Een sjabloon verwijderen stopt toekomstige
   aanmaak maar verwijdert geen al aangemaakte Task-rijen.
5. Een paardeneigenaar zonder stalbeheerrol heeft geen toegang tot de
   takenpagina en kan de actions niet aanroepen (bestaande getStaffContext-check).
6. Sjablonen aangemaakt na een bepaalde datum genereren geen taken voor
   datums in het verleden (createdAt-check in ensureRecurringTasksForDate).
