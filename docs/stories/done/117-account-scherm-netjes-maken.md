---
issue: 117
title: "Account scherm netjes maken"
status: "Done"
labels: ["tested"]
url: "https://github.com/MiniMaxi-user/velaro/issues/117"
archivedAt: 2026-06-19
---

# #117 — Account scherm netjes maken

# User Story

**Als** staleigenaar (OWNER)
**wil ik** dat het Accounts-scherm (/stal/accounts) afgewerkt en consistent is - met een duidelijke toelichting achter een info-icoon, data die meebeweegt met de actieve-stal-selectie, klikbare verwijzingen, en herkenbare rij-acties (bewerken via een pen-icoon, verwijderen via een prullenbak-icoon met bevestiging),
**zodat** ik externe accounts (paardeneigenaren en bereiders) snel en vertrouwd kan beheren in lijn met de rest van Velaro.

# Context

Het Accounts-scherm is opgeleverd in **#114** (/stal/accounts, In Review). Deze story is de **afwerk-/polishronde** op datzelfde scherm op basis van reviewfeedback. Er wordt **geen nieuw scherm** geintroduceerd: alle wijzigingen vallen binnen de bestaande feature src/features/stal/accounts en de pagina src/app/(app)/stal/accounts/page.tsx.

Relevante bestaande situatie (onderzocht in de codebase):
- De toelichtingstekst staat nu als platte alinea plus een aparte info-balk bovenaan het scherm (page.tsx, regel 41-65).
- Het scherm toont nu altijd alle OWNER-stallen van de gebruiker (getStableExternalAccounts, queries.ts). Het houdt nog geen rekening met de actieve-stal-cookie. Andere stalschermen (/stal/leden, /stal/taken, /stal/contracten, /paarden) doen dat wel via getActiveStableId plus de schildwacht ALLE_STALLEN.
- In de tabel staat de stalnaam als platte tekst (AccountsOverzicht.tsx, regel 75); paardnamen zijn al wel klikbaar naar /paarden/[id].
- De rij-acties bestaan nu uit een tekstknop Verwijderen (btn-danger btn-danger--sm) met een browser-bevestiging. Er is geen bewerk-actie.
- Er bestaat geen bewerkpagina voor een extern account: externe accounts worden alleen aangemaakt via PersoonAanmakenForm (/paarden/[id]/personen/nieuw); een User-rij (naam/e-mail) van een paardeneigenaar/bereider kan nergens worden bewerkt.
- Het UI/UX-uitlijningsprobleem (twee inputs naast elkaar niet verticaal uitgelijnd) zit in het generieke .form-grid (grid-template-columns: 1fr 1fr) in combinatie met .form-group (globals.css, regel 1338-1343): zodra een kolom een langer/afbrekend label of extra helptekst heeft, zakt het inputveld ten opzichte van de buurkolom.

## Duplicatie- en journey-analyse

- Geen nieuw scherm, geen duplicatie met het Team-scherm. Het Accounts-scherm (externe accounts) en /stal/leden (interne medewerkers, StableMember) blijven strikt gescheiden; de verwijzing naar Team blijft staan. Deze story raakt die afbakening niet.
- Geen overlap met #116. #116 verplaatst zakelijke User-velden naar OwnerBusinessProfile (alleen voor OWNER-accounts). Externe accounts (paardeneigenaar/bereider) hebben die velden niet; deze story raakt het zakelijke-gegevens-model niet.
- Stal-link: er bestaat geen stal-detailpagina; alleen /stallen (overzicht), /stallen/[id]/bewerken en /stallen/[id]/openen (zet de actieve stal). De stal-link wordt daarom niet naar een niet-bestaande detailpagina gemaakt - zie Scope.
- Bewerk-actie: omdat er geen account-bewerkpagina bestaat, levert deze story een minimale bewerkpagina voor een extern account (naam plus e-mail van de User-rij). De koppeling eigenaar/bereider per paard blijft op het paardprofiel; dit scherm bewerkt het account, niet de paardkoppeling.

# Scope

In scope:
1. Info-icoon in plaats van platte tekst. Vervang de losse toelichtingsalinea door een info-icoon met de tekst als tooltip/uitklap: "Hier zie je alle externe accounts die als paardeneigenaar of bereider aan een paard op jouw stal(len) gekoppeld zijn. Stalmedewerkers (eigenaren en medewerkers) beheer je op het Team-scherm." De expliciete Naar-Team-verwijzing blijft als zichtbare actie behouden.
2. Meebewegen met actieve-stal-selectie. Het scherm respecteert de actieve-stal-cookie (getActiveStableId plus ALLE_STALLEN), net als /stal/leden: bij een specifieke actieve stal toont het alleen externe accounts van die stal; bij Alle stallen alle OWNER-stallen. De pagina-titel toont de actieve stalnaam of Alle stallen, consistent met /stal/leden.
3. Stal als link. Maak de stalnaam in de lijst klikbaar. Klikken opent/activeert die stal via /stallen/[id]/openen (er is geen stal-detailpagina; dit sluit aan op het bestaande actieve-stal-mechanisme).
4. Bewerk-actie via pen-icoon. Voeg per rij een pen-icoon toe dat naar een (nieuwe) bewerkpagina voor dat externe account leidt, waar naam en e-mail van de User bewerkt kunnen worden. Server-side autorisatie identiek aan verwijderen (alleen een OWNER van een stal waaraan het account via een paard gekoppeld is). Wijziging van het e-mailadres wordt ook in Supabase Auth doorgevoerd (admin-client), analoog aan het verwijderpad in actions.ts.
5. Verwijderen als prullenbak-icoon. Vervang de tekstknop Verwijderen door een prullenbak-icoon (met toegankelijke aria-label/titel). De bestaande bevestigingsvraag en alle server-side in-gebruik-checks blijven ongewijzigd behouden.
6. UI/UX-uitlijning twee inputs naast elkaar. Los het verticale-uitlijningsprobleem generiek op in .form-grid/.form-group (globals.css), zodat naast elkaar staande inputvelden met ongelijke labellengte toch op gelijke hoogte uitlijnen (bijvoorbeeld labels op vaste hoogte of inputs onderaan uitlijnen). Geldt voor alle paginas die .form-grid gebruiken; geen losse fix per scherm.

Niet in scope:
- Geen nieuw los menu-item of nieuw overzichtsscherm; uitsluitend de bestaande /stal/accounts afwerken.
- Geen wijziging aan het Team-/ledenscherm of aan medewerkerbeheer (StableMember).
- Geen wijziging aan het zakelijke-gegevens-model (#116) of aan OwnerBusinessProfile.
- Geen stal-detailpagina bouwen.
- Op de bewerkpagina geen beheer van de per-paard eigenaar/bereider-koppeling (dat blijft op het paardprofiel) en geen wachtwoord-reset.
- Geen datamodelwijziging (Prisma-schema blijft ongewijzigd).

# Acceptatiecriteria

Info-icoon
- Als ik op /stal/accounts ben, wanneer ik de pagina open, dan zie ik geen platte toelichtingsalinea meer maar een info-icoon, en wanneer ik dat icoon hover/aanklik, dan verschijnt de toelichtingstekst over externe accounts en het Team-scherm.
- Als ik de pagina open, dan is de zichtbare verwijzing/knop naar het Team-scherm (/stal/leden) nog steeds aanwezig.

Actieve-stal-selectie
- Als ik in het linkermenu een specifieke stal als actief heb geselecteerd, wanneer ik /stal/accounts open, dan zie ik alleen de externe accounts die aan een paard op die stal gekoppeld zijn, en toont de titel die stalnaam.
- Als ik Alle stallen actief heb, wanneer ik /stal/accounts open, dan zie ik de externe accounts van al mijn OWNER-stallen en toont de titel Alle stallen (consistent met /stal/leden).

Stal als link
- Als een rij een stalnaam toont, wanneer ik op die stalnaam klik, dan wordt die stal de actieve stal (via /stallen/[id]/openen) en kom ik in de bijbehorende stalcontext terecht.

Bewerken (pen-icoon)
- Als ik een accountrij zie, dan staat er een pen-icoon in de actiekolom; wanneer ik erop klik, dan kom ik op een bewerkpagina voor dat account met de huidige naam en e-mail ingevuld.
- Als ik op de bewerkpagina naam en/of e-mail wijzig en opsla, dan wordt de User-rij bijgewerkt, wordt een gewijzigd e-mailadres ook in Supabase Auth doorgevoerd, en kom ik terug op het accounts-overzicht met de bijgewerkte gegevens.
- Als ik geen OWNER ben van een stal waaraan het account gekoppeld is, wanneer ik de bewerk-actie probeer uit te voeren, dan wordt dit server-side geweigerd (zelfde autorisatie als verwijderen).

Verwijderen (prullenbak-icoon)
- Als ik een accountrij zie, dan is de verwijderactie een prullenbak-icoon met een toegankelijke labeltekst, in plaats van een tekstknop.
- Wanneer ik op het prullenbak-icoon klik, dan verschijnt eerst een bevestigingsvraag, en pas na bevestiging wordt verwijderen geprobeerd; alle bestaande in-gebruik-blokkades en foutmeldingen blijven ongewijzigd werken.

UI/UX-uitlijning
- Als een formulier twee inputvelden naast elkaar toont via .form-grid waarbij een label langer is (of afbreekt), dan staan beide inputvelden verticaal op gelijke hoogte uitgelijnd.
- Dan geldt deze correctie generiek (via globals.css) voor alle paginas die .form-grid gebruiken, zonder per-scherm work-arounds.

Algemeen
- Dan is er geen Prisma-schemawijziging nodig en blijft de scheiding met het Team-scherm (#114) en het zakelijke-gegevens-model (#116) intact.

# Technische notities en relevante bestanden

- Pagina: src/app/(app)/stal/accounts/page.tsx - info-icoon, actieve-stal-titel, doorgeven actieve-stal aan de query.
- Query: src/features/stal/accounts/queries.ts - getStableExternalAccounts uitbreiden met optionele filter op de actieve stal-id (analoog aan /stal/leden-patroon met getActiveStableId plus ALLE_STALLEN).
- UI: src/features/stal/accounts/AccountsOverzicht.tsx - stalnaam als link naar /stallen/[id]/openen, pen-icoon (link naar bewerkpagina) en prullenbak-icoon in plaats van tekstknop.
- Acties: src/features/stal/accounts/actions.ts - nieuwe updateExternalAccount-action (naam/e-mail) met dezelfde OWNER-autorisatie als deleteExternalAccount; e-mailwijziging via de Supabase admin-client (updateUserById).
- Nieuwe bewerkpagina: src/app/(app)/stal/accounts/[userId]/bewerken/page.tsx plus bijbehorend form-component in src/features/stal/accounts.
- Actieve-stal helper: src/lib/active-stable.ts (getActiveStableId, ALLE_STALLEN).
- Stal openen/activeren: src/app/(app)/stallen/[id]/openen/route.ts.
- Styling: src/styles/globals.css - .form-grid (regel 1338) en .form-group (regel 1342) voor de uitlijningsfix; iconen in lijn met bestaande conventies (btn-danger, leden-tabel__acties).
- Volg de bestaande iconenaanpak in de codebase; geen eigen icoon-ontwerp vastleggen.

# Open vragen

- Bewerkpagina - velden: deze story neemt aan dat bewerken het externe account betreft (naam plus e-mail van de User). Klopt deze afbakening, of moet de pen ook iets met de eigenaar/bereider-koppeling per paard doen? Voorstel: account-velden; koppeling blijft op het paardprofiel.
- Stal-link - bestemming: er is geen stal-detailpagina. Deze story laat de stal-link de stal activeren (/stallen/[id]/openen). Akkoord, of is een andere bestemming gewenst?
