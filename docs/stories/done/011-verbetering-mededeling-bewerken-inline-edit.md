---
issue: 11
title: "VERBETERING: Mededeling bewerken (inline edit)"
status: "Done"
labels: []
url: "https://github.com/MiniMaxi-user/velaro/issues/11"
archivedAt: 2026-06-19
---

# #11 — VERBETERING: Mededeling bewerken (inline edit)

# Voorstel 9 - Mededeling bewerken (inline edit)

Type: VERBETERING

---

## Wat de klant mist

In de MededelingenSectie op het paardenprofiel (/paarden/[id]) kunnen stal-
medewerkers en staleigenaren mededelingen plaatsen en verwijderen. Bewerken
ontbreekt volledig. Als een medewerker een tikfout maakt in een mededeling,
of een verkeerde naam of datum intypt, is de enige uitweg: verwijderen en
opnieuw typen. Een mededeling met een correctie-opmerking als vervolg plaatsen
is omslachtig en vervuilt de communicatielijdlijn voor de paardeneigenaar.

Dit is hetzelfde patroon als bij de gezondheidsregistraties (voorstel 1) en
de taken (voorstel 3): bewerkfunctionaliteit ontbreekt in alle CRUD-modules.
Nu is de mededelingenfunctie â€” de primaire communicatielijn richting de
paardeneigenaar â€” aan de beurt.

---

## Waarom waardevol voor de doelgroep (pensionstallen)

Mededelingen zijn de officiÃ«le communicatie tussen stal en eigenaar binnen
Velaro. Zodra een mededeling zichtbaar is voor de paardeneigenaar, wil de
medewerker een type- of inhoudsfout snel kunnen herstellen zonder de eigenaar
te verwarren met een verwijdering + herplaatsing.

Concreet voorbeeld: een medewerker typt "been warm links achter, rust gegeven"
maar bedoelt "rechts achter". Nu moet hij de mededeling verwijderen (knop
tonen, bevestigen) en dezelfde tekst opnieuw intypen met de correctie. Als de
eigenaar in die paar seconden al gekeken heeft, ziet hij een verdwenen bericht
en vraagt zich af wat er aan de hand is.

Businessplan-aansluiting:
- "Communicatie" staat als MVP-onderdeel 4 in het businessplan.
- "Gebruiksgemak" is een van de vijf genoemde succesfactoren: een CRUD-module
  zonder bewerkfunctie is niet volledig en ondermijnt het vertrouwen van de
  gebruiker in de tool.
- Bouwvolgorde stap 5 in CLAUDE.md: "Eigenaarscommunicatie + gedeeld profiel"
  â€” de mededelingenfunctie is gebouwd (stap 5), maar pas volledig als ook de
  bewerkoptie beschikbaar is.

---

## Concrete implementatie-instructies

Scope: Ã©Ã©n nieuwe server action, uitbreiding van MededelingenSectie met
inline bewerkformulier. Geen nieuwe routes, geen schemawijziging.

### 1. Server action toevoegen in src/features/mededelingen/actions.ts

Voeg toe na de bestaande deleteNote action:

    export async function updateNote(id: string, horseId: string, formData: FormData) {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) redirect('/login')

      const note = await prisma.stableNote.findUnique({ where: { id } })
      if (!note || note.horseId !== horseId) throw new Error('Mededeling niet gevonden')

      const horse = await prisma.horse.findUnique({ where: { id: horseId } })
      if (!horse) throw new Error('Paard niet gevonden')

      // Alleen de auteur mag zijn eigen mededeling bewerken (geen OWNER-override)
      if (note.authorId !== user.id) throw new Error('Geen toegang')

      const message = (formData.get('message') as string)?.trim()
      if (!message) return { error: 'Bericht is verplicht' }

      await prisma.stableNote.update({ where: { id }, data: { message } })
      revalidatePath(`/paarden/${horseId}`)
    }

Autorisatieregel: alleen de auteur van de mededeling mag deze bewerken.
Een OWNER kan mededelingen van anderen verwijderen maar niet overschrijven
â€” dat zou de integriteit van de communicatiehistorie aantasten.

### 2. MededelingenSectie uitbreiden met inline bewerkstaat

Bestand: src/features/mededelingen/MededelingenSectie.tsx

Voeg toe bovenaan de component (useState import bestaat al niet â€” voeg toe):

    import { useState, useTransition, useRef } from 'react'
    import { createNote, deleteNote, updateNote } from './actions'

Voeg per note-item een lokale editId-state toe op component-niveau:

    const [editId, setEditId] = useState<string | null>(null)
    const [editError, setEditError] = useState<string | null>(null)
    const [saving, startSave] = useTransition()

In de map over notes: wanneer n.id === editId, toon een inline formulier in
plaats van de note-tekst:

    {editId === n.id ? (
      <form
        onSubmit={(e) => {
          e.preventDefault()
          setEditError(null)
          const fd = new FormData(e.currentTarget)
          startSave(async () => {
            const result = await updateNote(n.id, horseId, fd)
            if (result?.error) {
              setEditError(result.error)
            } else {
              setEditId(null)
            }
          })
        }}
      >
        <textarea
          name="message"
          className="input"
          rows={2}
          defaultValue={n.message}
          required
          autoFocus
        />
        {editError && <div className="form-feedback form-feedback--error">{editError}</div>}
        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          <button type="submit" className="btn-primary btn-primary--sm" disabled={saving}>
            {saving ? '...' : 'Opslaan'}
          </button>
          <button
            type="button"
            className="btn-ghost btn-ghost--sm"
            onClick={() => { setEditId(null); setEditError(null) }}
          >
            Annuleren
          </button>
        </div>
      </form>
    ) : (
      <div className="note-item__message">{n.message}</div>
    )}

### 3. Bewerken-knop tonen naast de Verwijder-knop

In de note-item__header, naast de bestaande DeleteNoteButton, voeg toe een
"Bewerken"-knop die alleen zichtbaar is als de ingelogde gebruiker de auteur
van de mededeling is (n.authorId === userId):

    {n.authorId === userId && editId !== n.id && (
      <button
        type="button"
        className="btn-ghost btn-ghost--sm"
        onClick={() => { setEditId(n.id); setEditError(null) }}
      >
        Bewerken
      </button>
    )}

De bewerken-knop verdwijnt automatisch als het inline formulier actief is
(editId === n.id), zodat de header opgeruimd blijft.

### Bestanden die wijzigen

- src/features/mededelingen/actions.ts â€” nieuwe updateNote action toevoegen
- src/features/mededelingen/MededelingenSectie.tsx â€” inline bewerkstaat

### Geen wijzigingen nodig in

- Prisma-schema (StableNote heeft alle benodigde velden)
- Routes (geen nieuwe pagina)
- Queries (geen nieuwe query)
- DeleteNoteButton.tsx (blijft ongewijzigd)

---

## Acceptatiecriteria

1. Een staleigenaar of medewerker die de auteur is van een mededeling ziet
   een "Bewerken"-knop naast de "Verwijder"-knop in de note-header.
2. Bij klikken op Bewerken verschijnt een inline textarea met de huidige
   tekst als defaultValue. De noot-tekst verdwijnt zolang de bewerkmodus
   actief is.
3. Na opslaan verschijnt de bijgewerkte tekst direct in de tijdlijn zonder
   pagina-refresh. De timestamp (createdAt) verandert niet.
4. De "Annuleren"-knop sluit de bewerkmodus zonder wijzigingen op te slaan.
5. Een OWNER die niet de auteur is ziet geen "Bewerken"-knop, maar kan de
   mededeling nog steeds verwijderen (bestaand gedrag blijft intact).
6. Een paardeneigenaar (canCreate === false) ziet noch de Bewerken- noch de
   Verwijder-knop (bestaand gedrag: deleteknop is al afgeschermd via canDelete).
7. Geen Prisma-migratie nodig.
