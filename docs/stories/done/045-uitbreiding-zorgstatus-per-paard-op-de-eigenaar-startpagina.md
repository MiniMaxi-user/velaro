---
issue: 45
title: "UITBREIDING: Zorgstatus per paard op de eigenaar-startpagina"
status: "Done"
labels: []
url: "https://github.com/MiniMaxi-user/velaro/issues/45"
archivedAt: 2026-06-19
---

# #45 — UITBREIDING: Zorgstatus per paard op de eigenaar-startpagina

# Voorstel 14 - Zorgstatus per paard op de eigenaar-startpagina

Type: UITBREIDING

---

## Wat de klant mist (als paardeneigenaar)

Ik log in op /eigenaar en zie mijn paard Storm. Ik zie de laatste mededelingen
van de stal, maar ik zie nergens of de gezondheidsregistratie van Storm
actueel is. Is zijn vaccinatie nog geldig? Wanneer is de hoefsmid voor het
laatste langs geweest? Is er een ontworming verlopen?

Als eigenaar weet ik dat de stal dit bijhoudt, maar ik kan het niet zien. Als
ik naar het volledige profiel ga (/paarden/[id]) en de GezondheidTabs open,
zie ik de losse tabellen pas na inspecteren -- er is geen samenvatting.

De staleigenaar heeft op /stal een Aankomende zorg paneel met een duidelijk
overzicht van verlopen en aankomende behandelingen. De paardeneigenaar heeft
niets vergelijkbaars, terwijl hij of zij net zo goed baat heeft bij dit
signaal: ik betaal pensionkosten, ik wil weten of de verplichte vaccinatie
van mijn paard nog geldig is voor de komende wedstrijd.

Concreet scenario: een paardeneigenaar opent de app de avond voor een
wedstrijd. Hij ziet op /eigenaar de naam van zijn paard en twee mededelingen.
Nergens staat dat de griepvaccinatie van Storm al zes weken geleden verlopen
is. Hij ontdekt dit pas bij de check-in, waar zijn deelname wordt geweigerd.

---

## Waarom waardevol (businesswaarde)

Businessplan-aansluitingspunten:

- Bouwvolgorde CLAUDE.md stap 5 Eigenaarscommunicatie plus gedeeld profiel is
  de eerstvolgende openstaande stap. De eigenaar ziet zijn paard al; hem ook
  de gezondheidsacties laten zien, voltooit het gedeeld profiel deel van
  stap 5 inhoudelijk.
- Communicatie als MVP-onderdeel 3 in het businessplan omvat ook het
  proactief informeren van de eigenaar over de toestand van zijn paard.
  Gezondheidsacties zijn toestandsinformatie die de eigenaar net zo hard
  aangaat als mededelingen van de stal.
- Netwerkeffecten zijn een succesfactor. Een eigenaar die zijn zorgstatus
  op de startpagina ziet, heeft een reden om de app dagelijks te openen.
  Hogere retentie versterkt de SaaS-metrics van Velaro.
- Mobiele ervaring als succesfactor. Een paardeneigenaar die onderweg even
  controleert of alles in orde is, heeft behoefte aan een compacte samenvatting
  op de startpagina, niet aan drie klikken via tabbladen.
- Differentiatie ten opzichte van Stalmanager en EquineM: geen van de
  concurrenten biedt de eigenaar een gedeeld zorgstatusoverzicht.

---

## Wat gebouwd moet worden (technisch)

Scope: een nieuwe query-functie, uitbreiding van de eigenaar-startpagina
en inline render-code. Geen schemawijziging, geen nieuwe routes.

### 1. Nieuwe query in src/features/gezondheid/queries.ts

De bestaande getAankomendGezondheidActies werkt op stableId. Voeg een variant
toe die op horseId werkt, voor gebruik vanuit de eigenaar-context.

Functienaam: getZorgActiesVoorPaard(horseId: string, dagenVooruit = 60)
Returntype: Promise<GezondheidActie[]>

Implementatie: identiek aan getAankomendGezondheidActies, maar vervang de
where-clausule horse: { stableId } door where: { horseId, nextDate: { lte: grens } }
voor elk van de drie queries (Vaccination, Deworming, HoefsmitBezoek).
Sorteer op nextDate asc. Returntype en isVerlopen-logica blijven gelijk.

Merk op: horizon is 60 dagen (ruimer dan de 30 dagen op het staldashboard),
omdat eigenaren doorgaans minder frequent inloggen en vroeger gewaarschuwd
willen worden over naderende verplichte behandelingen zoals vaccinaties.

### 2. Eigenaar-startpagina uitbreiden in src/app/(app)/eigenaar/page.tsx

Importeer getZorgActiesVoorPaard uit @/features/gezondheid/queries en
formatDatum uit @/features/paarden/paardHelpers (als die import nog ontbreekt).

Laad zorgacties parallel met de bestaande queries door de Promise.all uit te
breiden met een derde rij:

    const [notesPerPaard, ongelezen, zorgActiesPerPaard] = await Promise.all([
      Promise.all(horses.map((h) => getNotesForHorse(h.id, 2))),
      Promise.all(horses.map((h) => getUnreadCountForOwner(user.id, h.id))),
      Promise.all(horses.map((h) => getZorgActiesVoorPaard(h.id, 60))),
    ])

Bepaal per paard in de map:

    const zorgActies = zorgActiesPerPaard[index]
    const verlopenActies = zorgActies.filter((a) => a.isVerlopen)

Voeg in de panel-header naast de bestaande ongelezen-badge een
verlopen-zorg-badge toe, alleen zichtbaar als verlopenActies.length > 0:

    {verlopenActies.length > 0 && (
      <span className="badge badge-warning">
        {verlopenActies.length} zorg verlopen
      </span>
    )}

Voeg in de panel-body na het mededelingen-blok een zorgstatus-sectie toe,
alleen zichtbaar als zorgActies.length > 0. Per actie: een badge (Verlopen
of datum) en de omschrijving, analoog aan AankomendZorgPanel.

### Bestanden die wijzigen

- src/features/gezondheid/queries.ts -- getZorgActiesVoorPaard toevoegen
  (circa 40 regels, direct afgeleid van getAankomendGezondheidActies)
- src/app/(app)/eigenaar/page.tsx -- zorgacties laden en zorgstatus-sectie
  renderen per paard (circa 35 regels)

### Geen wijzigingen nodig in

- prisma/schema.prisma
- AankomendZorgPanel.tsx (staldashboard blijft ongewijzigd)
- GezondheidTabs.tsx
- Alle andere routes en componenten

---

## Inschatting omvang

Klein tot middel.

- Geen database-impact (geen migratie).
- Een nieuwe query-functie, direct afgeleid van een bestaande.
- Een pagina uitbreiden met een extra datalaag en een korte render-sectie.
- Geen nieuw component nodig.
- Totaal: circa 75 regels code toevoegen verspreid over twee bestanden.

---

## Acceptatiecriteria

1. Een paardeneigenaar ziet op /eigenaar per paard een Zorgstatus-sectie
   wanneer er vaccinatie-, ontworming- of hoefsmit-data met een nextDate
   binnen 60 dagen of verlopen zijn geregistreerd.
2. Verlopen acties tonen een amber Verlopen-badge. Aankomende acties tonen
   de datum als neutrale badge.
3. Wanneer er geen zorgacties zijn binnen 60 dagen (of geen nextDate ingevuld),
   is de sectie niet zichtbaar. De eigenaar-startpagina toont geen lege blokken.
4. De zorgstatus-sectie staat visueel gescheiden van de mededelingen (borderTop)
   maar binnen hetzelfde paard-panel, zodat het een coherent paardenoverzicht
   vormt.
5. Wanneer er verlopen zorgacties zijn, verschijnt in de panel-header naast de
   paard-naam een badge met tekst N zorg verlopen, analoog aan de ongelezen-
   badge voor mededelingen uit voorstel 12. Dit signaal is zichtbaar zonder
   in het panel te scrollen.
6. De weergave gebruikt dezelfde badge-stijlen als het staldashboard-paneel
   Aankomende zorg, zodat de gebruiker hetzelfde visuele patroon herkent.
7. Geen Prisma-migratie nodig.
8. Het staldashboard en alle andere bestaande paginas zijn niet geraakt.
