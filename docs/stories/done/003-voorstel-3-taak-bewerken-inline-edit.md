---
issue: 3
title: "Voorstel 3 - Taak bewerken (inline edit)"
status: "Done"
labels: []
url: "https://github.com/MiniMaxi-user/velaro/issues/3"
archivedAt: 2026-06-19
---

# #3 — Voorstel 3 - Taak bewerken (inline edit)

# Voorstel 3 - Taak bewerken (inline edit)

Type: VERBETERING

---

## Wat de klant mist

Op de takenpagina (/stal/taken) kunnen medewerkers taken aanmaken, afvinken en
verwijderen. Bewerken ontbreekt volledig. Als een medewerker een taak met een
tikfout in de omschrijving opslaat, of de verkeerde datum of het verkeerde paard
selecteert, is de enige uitweg: verwijderen en opnieuw aanmaken. Dat wist ook het
zichtbare afvinkhistorie (isCompleted + completedAt).

Dit is hetzelfde probleem als bij de gezondheidsregistraties (voorstel 1), maar
dan voor de dagelijkse werkvloer. Medewerkers gebruiken de takenpagina elke dag;
frustratie hier raakt het dagelijks gebruik het meest direct.

---

## Waarom waardevol voor de doelgroep (pensionstallen)

Pensionstallen werken met wisselende medewerkers die snel taken invoeren op hun
telefoon of tablet. Tikfouten en verkeerde paardkoppelingen zijn onvermijdelijk.
Een bewerkmogelijkheid die binnen de bestaande pagina werkt (geen extra navigatie)
past bij het snelle werktempo op een stal.

Businessplan-aansluiting:
- "Gebruiksgemak" is een van de vijf genoemde succesfactoren in het businessplan.
- De CLAUDE.md-bouwvolgorde noemt "Stalbewoners-overzicht + planning (dagelijkse
  taken/agenda)" als stap 4 â€” deze stap is gebouwd maar nog niet afgerond zolang
  CRUD niet volledig is.

---

## Wat gebouwd moet worden

Scope: Ã©Ã©n nieuwe server action, uitbreiding van TaakItem met een inline
bewerkformulier, geen nieuwe routes en geen schemawijziging.

### 1. Server action toevoegen in src/features/taken/actions.ts

    export async function updateTask(taskId: string, formData: FormData) {
      const { stable } = await getStaffContext()
      const task = await prisma.task.findUnique({ where: { id: taskId } })
      if (!task || task.stableId !== stable.id) throw new Error('Taak niet gevonden')

      const title = (formData.get('title') as string)?.trim()
      const dateStr = formData.get('date') as string
      const horseId = (formData.get('horseId') as string) || null

      if (!title) throw new Error('Omschrijving is verplicht')
      if (!dateStr) throw new Error('Datum is verplicht')

      await prisma.task.update({
        where: { id: taskId },
        data: { title, date: new Date(dateStr), horseId: horseId || null },
      })

      revalidatePath('/stal/taken')
    }

### 2. TaakItem uitbreiden met inline bewerkmodus

In src/features/taken/TaakItem.tsx:

- Voeg een lokale boolean state `bewerken` toe.
- Wanneer `bewerken === false`: toon de huidige weergave + een knop "Bewerken"
  naast de bestaande "Verwijder"-knop.
- Wanneer `bewerken === true`: vervang de taaknaam/paardlabel door een inline
  formulier met:
  - een tekstveld (name="title", defaultValue=task.title)
  - een datumveld (name="date", defaultValue=huidige datum van de taak)
  - een select voor het paard (name="horseId", zelfde opties als TaakForm)
  - een "Opslaan"-knop en een "Annuleren"-knop
- Bij verzenden: roep updateTask(task.id, formData) aan via useTransition,
  zet daarna `bewerken` terug op false.
- Bij annuleren: zet `bewerken` terug op false zonder actie.

TaakItem heeft nu een extra prop nodig: `horses: { id: string; name: string }[]`
zodat het paard-select gevuld kan worden.

### 3. Horses doorgeven vanuit de takenpagina

In src/app/(app)/stal/taken/page.tsx worden horses al opgehaald
(getHorsesForStable). Geef `horses` als prop mee aan elk TaakItem:

    <TaakItem key={task.id} task={task} horses={horses.map(h => ({ id: h.id, name: h.name }))} />

### 4. Autorisatie

Geen extra check nodig: getStaffContext() in de action controleert al dat de
uitvoerende gebruiker OWNER of STAFF is van de betreffende stal, en dat de taak
bij die stal hoort.

---

## Acceptatiecriteria

1. Een staleigenaar of medewerker kan op een bestaande taak klikken op "Bewerken",
   de omschrijving, datum en/of het gekoppelde paard aanpassen, en opslaan.
   Na opslaan toont de taaklijst de gewijzigde gegevens zonder pagina-refresh.
2. De "Annuleren"-knop sluit de bewerkmodus zonder wijzigingen door te voeren.
3. Taken die al afgevinkt zijn kunnen ook bewerkt worden (alleen omschrijving
   en koppeling; isCompleted wordt niet gereset door een update).
4. Geen nieuw Prisma-model en geen database-migratie nodig: alle velden
   (title, date, horseId) bestaan al in het Task-model.
5. Een paardeneigenaar zonder stalbeheerrol heeft geen toegang tot /stal/taken
   en kan de action ook niet aanroepen (bestaande getStaffContext-check).
