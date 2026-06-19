---
issue: 7
title: "VERBETERING: Bevestigingsdialoog bij ontkoppelen paardeneigenaar"
status: "Done"
labels: []
url: "https://github.com/MiniMaxi-user/velaro/issues/7"
archivedAt: 2026-06-19
---

# #7 — VERBETERING: Bevestigingsdialoog bij ontkoppelen paardeneigenaar

# Voorstel 7 - Bevestigingsdialoog bij ontkoppelen paardeneigenaar

Type: VERBETERING

---

## Wat de klant mist

In EigenaarBeheer.tsx staat de Ontkoppelen-knop voor het loskoppelen van een
paardeneigenaar van een paard. Deze knop roept de server action removeHorseOwner
direct aan, zonder bevestigingsvraag. Een klik is direct en onomkeerbaar.

Elke andere verwijderknop in de app vraagt wel om bevestiging:

| Component               | Bevestiging? |
|-------------------------|--------------|
| DeletePaardButton       | Ja (confirm) |
| LidVerwijderenButton    | Ja (confirm) |
| DeleteGezondheidButton  | Ja (confirm) |
| DeleteNoteButton        | Ja (confirm) |
| EigenaarBeheer (huidig) | Nee -- ontbreekt |

Een staleigenaar die per ongeluk op Ontkoppelen klikt, verbreekt daarmee de
toegang van de eigenaar tot het paardenprofiel. Die eigenaar kan zijn paard
plots niet meer zien, inclusief de mededelingen van de stal. Herstel vereist
dat de staleigenaar de eigenaar opnieuw opzoekt op e-mailadres en opnieuw koppelt.

---

## Waarom waardevol voor de doelgroep (pensionstallen)

Pensionstallen zijn verantwoordelijk voor de communicatie met paardeneigenaren.
Als een eigenaar door een misklick van de stal zijn toegang verliest, levert
dat direct een klacht of vertrouwensbreuk op.

Businessplan-aansluiting:
- Gebruiksgemak is een van de vijf genoemde succesfactoren in het businessplan.
  Gebruiksgemak omvat ook foutpreventie: de gebruiker mag niet per ongeluk iets
  kapot kunnen maken.
- Eigenaarscommunicatie staat als MVP-onderdeel benoemd (bouwvolgorde stap 5
  in CLAUDE.md). De eigenaarskoppeling is de brug tussen stal en eigenaar; die
  mag niet per ongeluk worden verbroken.
- Netwerkeffecten (businessplan succesfactor) vereisen dat eigenaren actief en
  zonder obstakels ingelogd blijven.

---

## Concrete implementatie-instructies

Scope: een bestand, drie regels code aanpassen. Geen nieuwe routes, geen nieuwe
server actions, geen schemawijziging.

### Bestand: src/features/paarden/EigenaarBeheer.tsx

De huidige handleRemove-functie (regels 32-38):

    async function handleRemove(ownershipId: string) {
      setRemoveError(null)
      const result = await removeHorseOwner(horseId, ownershipId)
      if (result?.error) {
        setRemoveError(result.error)
      }
    }

Nieuwe versie met bevestigingsvraag en naam-parameter, analoog aan
LidVerwijderenButton:

    async function handleRemove(ownershipId: string, naam: string) {
      if (!confirm("Weet je zeker dat je " + naam + " als eigenaar wilt ontkoppelen?")) return
      setRemoveError(null)
      const result = await removeHorseOwner(horseId, ownershipId)
      if (result?.error) {
        setRemoveError(result.error)
      }
    }

De eigenaarsnaam is beschikbaar als o.user.name ?? o.user.email.

Huidige onClick in de knop-rij:

    onClick={() => handleRemove(o.id)}

Nieuwe onClick:

    onClick={() => handleRemove(o.id, o.user.name ?? o.user.email)}

### Wijzigingen op een rij

1. Functiesignatuur handleRemove uitbreiden met parameter naam: string.
2. confirm()-aanroep toevoegen als eerste regel van de functie.
3. Knop-onClick aanpassen om de naam door te geven.

---

## Acceptatiecriterium

1. Een staleigenaar klikt op Ontkoppelen bij een eigenaar op het
   paardenprofiel. Er verschijnt een bevestigingsdialoog met de naam van
   de eigenaar. Bij Annuleren gebeurt er niets; de eigenaar blijft gekoppeld.
2. Pas bij bevestigen wordt de koppeling verbroken en verdwijnt de eigenaar
   uit de tabel.
3. Geen schemawijziging, geen nieuwe routes, geen nieuwe server actions.
4. Gedrag is nu consistent met alle andere verwijderknoppen in de app.
