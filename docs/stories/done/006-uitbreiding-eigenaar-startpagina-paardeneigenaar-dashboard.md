---
issue: 6
title: "UITBREIDING: Eigenaar-startpagina (paardeneigenaar dashboard)"
status: "Done"
labels: []
url: "https://github.com/MiniMaxi-user/velaro/issues/6"
archivedAt: 2026-06-19
---

# #6 — UITBREIDING: Eigenaar-startpagina (paardeneigenaar dashboard)

# Voorstel 6 - Eigenaar-startpagina (paardeneigenaar dashboard)

Type: UITBREIDING

---

## Wat de klant mist

Een paardeneigenaar die inlogt op Velaro belandt op het staldashboard
(/stal). Omdat hij geen StableMember-rol heeft, ziet hij alleen de
lege staat "Je bent nog niet aan een stal gekoppeld." â€” ongeacht het
feit dat er al een of meer paarden aan zijn account zijn gekoppeld.

De enige weg naar zijn paard loopt via /paarden in het zijmenu, maar
ook die pagina is niet ingericht op de eigenaarsbeleving: het toont
dezelfde lege-staat-logica als de stallijst wanneer er geen actieve
stal is.

De eigenaar heeft geen startpagina die hem welkom heet, zijn paarden
direct toont en de recente mededelingen van de stal samenvat. Dat is
precies de dagelijkse reden waarom een eigenaar terugkeert naar de app.

---

## Waarom waardevol voor de doelgroep

Pensionstallen verkopen het gebruik van Velaro aan hun klanten (de
paardeneigenaren) als service. De eigenaar moet bij eerste login
direct waarde zien: zijn paard, de laatste mededelingen van de stal,
en eventuele aankomende gezondheidsacties. Als dat niet werkt, haakt
de eigenaar af en valt de stal terug op WhatsApp.

Businessplan-aansluiting:
- Bouwvolgorde stap 5 in CLAUDE.md: "Eigenaarscommunicatie + gedeeld
  profiel" â€” het gedeelde profiel bestaat al (paardenprofiel is leesbaar
  voor eigenaren), maar de eigenaarsbeleving bij inloggen ontbreekt.
- Het businessplan noemt "Netwerkeffecten" als succesfactor: die
  ontstaan alleen als eigenaren actief terugkeren naar het platform.
  Een persoonlijke startpagina is de dagelijkse haak.
- "Communicatie" staat als MVP-onderdeel in het businessplan; de
  mededelingenfunctie is gebouwd maar pas zichtbaar als de eigenaar
  zijn paard weet te vinden. Een startpagina maakt dit onmiddellijk
  toegankelijk.

---

## Wat gebouwd moet worden

Scope: Ã©Ã©n nieuwe pagina (/eigenaar), een redirect in de app-root,
uitbreiding van bestaande queries. Geen schemawijziging, geen nieuwe
server actions.

### 1. Nieuwe route: src/app/(app)/eigenaar/page.tsx

Server component. Laadt de paarden van de ingelogde gebruiker via de
bestaande getHorsesForOwner(userId) query uit
src/features/paarden/queries.ts.

Per paard: laad de laatste twee mededelingen via getNotesForHorse(id)
(bestaat al in src/features/mededelingen/queries.ts) â€” beperkt tot 2
zodat de startpagina compact blijft.

Toon:
- Paginatitel "Mijn paarden" met de naam van de eigenaar.
- Per paard een kaart (panel) met:
  - Paard-naam + ras + leeftijd als badges (hergebruik bestaande
    badge-klassen en berekenLeeftijd uit paardHelpers).
  - Link "Bekijk profiel" naar /paarden/[id].
  - Sectie "Laatste mededelingen": toon de twee meest recente berichten
    (auteur, datum, berichttekst). Lege staat als er geen zijn.
- Lege staat als de eigenaar geen paarden heeft: "Je hebt nog geen
  paarden in je account. Neem contact op met je pensionstal."

### 2. Redirect in de app-root

Het staldashboard (src/app/(app)/stal/page.tsx) controleert al of
stable === null en toont dan een lege staat. Voeg vÃ³Ã³r die check een
controle toe: als de gebruiker gÃ©Ã©n StableMember is maar wÃ©l
HorseOwner-rijen heeft, redirect dan naar /eigenaar.

Toevoegen aan src/app/(app)/stal/page.tsx, direct na de stable-check:

    import { prisma } from '@/lib/prisma'
    ...
    // In de server component, na getUserStable:
    if (!stable) {
      const isHorseOwner = await prisma.horseOwner.count({ where: { userId: user.id } })
      if (isHorseOwner > 0) redirect('/eigenaar')
    }

### 3. Navigatie-item toevoegen in SidebarClient

In src/components/SidebarClient.tsx is EIGENAAR_NAV momenteel:

    const EIGENAAR_NAV = [
      { href: '/paarden', label: 'Mijn paarden', icon: 'horse', exact: false },
    ]

Vervang dit door:

    const EIGENAAR_NAV = [
      { href: '/eigenaar', label: 'Dashboard',    icon: 'dashboard', exact: true },
      { href: '/paarden',  label: 'Mijn paarden', icon: 'horse',     exact: false },
    ]

Zo heeft de eigenaar een eigen "Dashboard"-knop die direct naar zijn
startpagina gaat, analoog aan de staldashboard-knop voor medewerkers.

### 4. Query: mededelingen-samenvatting per paard

De bestaande getNotesForHorse haalt 20 berichten op. Voeg een
optionele limit-parameter toe aan de functie in
src/features/mededelingen/queries.ts:

    export async function getNotesForHorse(horseId: string, limit = 20) {
      return prisma.stableNote.findMany({
        where: { horseId },
        include: { author: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        take: limit,
      })
    }

Op de eigenaar-startpagina wordt getNotesForHorse(horse.id, 2) aangeroepen.

---

## Acceptatiecriteria

1. Een paardeneigenaar die inlogt (en geen StableMember-rol heeft) wordt
   automatisch doorgestuurd van /stal naar /eigenaar.
2. Op /eigenaar ziet de eigenaar een kaart per gekoppeld paard met naam,
   ras, leeftijd en de twee meest recente mededelingen.
3. Elke kaart bevat een werkende link naar /paarden/[id] voor het
   volledige profiel.
4. De eigenaar-kaart toont een lege staat ("Nog geen mededelingen")
   als er nog niets is geplaatst.
5. Een gebruiker die zowel StableMember als HorseOwner is (bijv. een
   staleigenaar met eigen paard) blijft op /stal â€” de redirect geldt
   alleen voor gebruikers zonder StableMember-rol.
6. De zijbalk toont voor eigenaren een "Dashboard"-link naar /eigenaar.
7. Geen Prisma-migratie nodig: alle benodigde modellen en relaties
   bestaan al (HorseOwner, StableNote, Horse).
