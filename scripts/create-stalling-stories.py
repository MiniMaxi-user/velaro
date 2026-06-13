#!/usr/bin/env python3
"""
Maakt de stories + epics voor Stalling-engine v1 (full pension) aan op
GitHub (repo MiniMaxi-user/velaro) en zet ze op het projectbord (project 2)
in kolom Backlog. Stories krijgen labels contract,stalling,refine; epics
krijgen contract,stalling,epic. Epics linken via een task-list naar hun
child-stories.

Idempotent-ish: bestaande issues met dezelfde [STAL-xx]/[EPIC] titel worden
overgeslagen.
"""
import json
import subprocess
import sys

OWNER = "MiniMaxi-user"
REPO = "MiniMaxi-user/velaro"
PROJECT = "2"
PROJECT_ID = "PVT_kwHOBJnhiM4BaXsM"
STATUS_FIELD = "PVTSSF_lAHOBJnhiM4BaXsMzhVPyiQ"
BACKLOG = "f75ad846"


def run(args, allow_fail=False):
    r = subprocess.run(args, capture_output=True, text=True)
    if r.returncode != 0 and not allow_fail:
        print("ERR:", " ".join(args), "\n", r.stderr, file=sys.stderr)
        sys.exit(1)
    return r.stdout.strip(), r.stderr.strip(), r.returncode


def existing_titles():
    out, _, _ = run(["gh", "issue", "list", "--repo", REPO, "--state", "all",
                     "--limit", "300", "--json", "number,title"])
    data = json.loads(out)
    return {i["title"]: i["number"] for i in data}


def create_issue(title, body, labels):
    args = ["gh", "issue", "create", "--repo", REPO, "--title", title, "--body", body]
    for l in labels:
        args += ["--label", l]
    out, err, _ = run(args)
    url = out.splitlines()[-1]
    number = int(url.rstrip("/").split("/")[-1])
    return number, url


def add_to_board(url):
    run(["gh", "project", "item-add", PROJECT, "--owner", OWNER, "--url", url], allow_fail=True)


def board_item_map():
    out, _, _ = run(["gh", "project", "item-list", PROJECT, "--owner", OWNER,
                     "--format", "json", "-L", "200"])
    data = json.loads(out)
    m = {}
    for i in data["items"]:
        n = i.get("content", {}).get("number")
        if n is not None:
            m[n] = i["id"]
    return m


def set_backlog(item_id):
    run(["gh", "project", "item-edit", "--project-id", PROJECT_ID, "--id", item_id,
         "--field-id", STATUS_FIELD, "--single-select-option-id", BACKLOG])


# ── Stories ────────────────────────────────────────────────────────────────
# Elke story: key, title (zonder prefix), deps (lijst van keys), epic-naam, body.
STORY_LABELS = ["contract", "stalling", "refine"]
EPIC_LABELS = ["contract", "stalling", "epic"]

STORIES = []


def story(key, title, epic, deps, body):
    STORIES.append({"key": key, "title": f"[{key}] {title}", "epic": epic,
                    "deps": deps, "body": body})


story("STAL-01", "Concept-stallingscontract aanmaken en tonen op het paardprofiel",
      "Contract-fundament & concept-contract", [],
      """**Epic:** Contract-fundament & concept-contract
**Hangt af van:** — (fundament; blokkeert alle overige STAL-stories)

## User story
Als **staleigenaar (OWNER)** wil ik op een paardprofiel een nieuw stallingscontract (full pension) als concept kunnen aanmaken, zodat ik de overeenkomst met de paardeigenaar in Velaro kan opbouwen voordat ik die aanbied.

## Context & scope
Eerste verticale slice + datamodel-fundament voor de hele contracten-module. Levert een werkend concept-contract op dat zichtbaar is op het paardprofiel. Alleen de stalling-familie, type full pension, met minimale velden. Opties/prijs/looptijd/verzekering volgen in latere stories.
**Buiten scope:** opties invullen (STAL-03/04), prijs/looptijd (STAL-05), verzekering (STAL-06), aanbieden (STAL-08), PDF (STAL-12), lease-familie.

## Gedeeld datamodel (fundament — door alle STAL-stories gebruikt)
Nieuwe Prisma-modellen in `prisma/schema.prisma`:
- `Contract`: id, `horseId`→Horse, `stableId`→Stable, `family` (enum `ContractFamily { STALLING, LEASE }`), `type` (string, v1 = "FULL_PENSION"), `counterpartyUserId`→User (de paardeigenaar als wederpartij; nullable tot gekozen), `status` (enum `ContractStatus`), `currentVersion` Int default 1, config-velden/JSON (uitgebreid in latere stories), createdAt/updatedAt.
- `ContractStatus` enum: `CONCEPT, AANGEBODEN, GEACCEPTEERD, ACTIEF, OPGESCHORT, OPZEGGING_LOOPT, VERLENGD, BEEINDIGD, VERLOPEN, GEANNULEERD, AFGEWEZEN, VERVANGEN`.
- Relatie op `Horse`: `contracts Contract[]`.
- Migratie draaien + `npx prisma generate`.

## Functionele inhoud
- Nieuwe feature-map `src/features/contracten/` (queries.ts, actions.ts, componenten) — spiegel de bestaande feature-opbouw (zoals `features/paarden`).
- Route/sectie op het paardprofiel: een **Contracten**-paneel/tab op `src/app/(app)/paarden/[id]/page.tsx` (alleen zichtbaar voor OWNER/STAFF) met knop "Nieuw stallingscontract".
- Aanmaak-route `src/app/(app)/paarden/[id]/contracten/nieuw/page.tsx`: kiest wederpartij = de aan het paard gekoppelde eigenaar (`HorseOwner` voorgesteld), ingangsdatum, en maakt een `Contract` aan met `family=STALLING`, `type=FULL_PENSION`, `status=CONCEPT`.
- Server action `createStallingContract` met autorisatie (alleen OWNER/STAFF van de stal; hergebruik `getStableRole`).
- Contract verschijnt in het Contracten-paneel met status-badge "Concept".

## Acceptatiecriteria
- [ ] Migratie draait schoon; `npx prisma generate` en `npx tsc --noEmit` slagen.
- [ ] Given een OWNER/STAFF op een paardprofiel, When hij "Nieuw stallingscontract" kiest en eigenaar + ingangsdatum invult, Then bestaat er een `Contract` met family=STALLING, type=FULL_PENSION, status=CONCEPT, gekoppeld aan paard + eigenaar.
- [ ] Het concept verschijnt in het Contracten-paneel op het paardprofiel met badge "Concept".
- [ ] Een paardeigenaar (niet-staf) kan dit scherm/deze actie niet gebruiken (server-side afgedwongen).

## Oplevert (testbaar)
Een staleigenaar kan een full-pension concept-contract aanmaken en ziet het op het paardprofiel. Einde-tot-einde testbaar zonder verdere stories.

## Open vragen
- Eén lopend stallingscontract per paard afdwingen, of toestaan dat er meerdere concepten naast elkaar bestaan? (Voorstel: meerdere concepten toestaan, max. één ACTIEF.)
""")

story("STAL-02", "Concept-contract bewerken en verwijderen",
      "Contract-fundament & concept-contract", ["STAL-01"],
      """**Epic:** Contract-fundament & concept-contract
**Hangt af van:** STAL-01 (gedeeld datamodel + concept-contract)

## User story
Als **staleigenaar (OWNER/STAFF)** wil ik een concept-stallingscontract kunnen bewerken en verwijderen, zodat ik fouten kan corrigeren of een concept kan weggooien voordat het wordt aangeboden.

## Context & scope
Beheer van een contract zolang het status CONCEPT heeft. Na aanbieden gelden andere regels (versionering, STAL-11).
**Buiten scope:** bewerken na aanbieden; versionering.

## Functionele inhoud
- Bewerk-route `src/app/(app)/paarden/[id]/contracten/[contractId]/bewerken/page.tsx` voor de basisvelden uit STAL-01 (wederpartij, ingangsdatum).
- Server actions `updateStallingContract` en `deleteStallingContract` met autorisatie (OWNER/STAFF) en statuscheck (alleen toegestaan bij CONCEPT).
- Verwijderknop met bevestiging in het Contracten-paneel.

## Acceptatiecriteria
- [ ] Given een CONCEPT-contract, When OWNER/STAFF het bewerkt, Then worden de velden bijgewerkt.
- [ ] Given een CONCEPT-contract, When OWNER/STAFF het verwijdert (na bevestiging), Then is het weg uit het paardprofiel.
- [ ] Bewerken/verwijderen wordt server-side geweigerd als de status niet CONCEPT is.

## Oplevert (testbaar)
Concepten zijn volledig beheersbaar (CRUD-cyclus rond) vóór aanbieden.

## Open vragen
Geen.
""")

story("STAL-03", "Huisvesting & dienstpakket-opties op het contract",
      "Contractinhoud: opties & voorwaarden", ["STAL-01"],
      """**Epic:** Contractinhoud: opties & voorwaarden
**Hangt af van:** STAL-01 (gedeeld datamodel)

## User story
Als **staleigenaar** wil ik de huisvesting en het dienstpakket (boxtype, uitmesten/opstrooien, toezicht) op het stallingscontract vastleggen, zodat duidelijk is wat de stal levert.

## Context & scope
Eerste optieblok uit §3.3 (stalling). Opties worden als data op het contract opgeslagen en later in de PDF gerenderd (STAL-12).
**Buiten scope:** voer/weidegang/faciliteiten (STAL-04), prijs (STAL-05).

## Functionele inhoud
- Uitbreiden contract-config (velden of JSON-blok `huisvesting`): boxtype (binnen/buiten/paddock/groep), stalplek/boxnummer (voorvullen uit `Horse.boxNumber`), uitmesten ja/nee, opstrooien + beddingtype, toezicht/verzorging.
- Sectie "Huisvesting & verzorging" in het contract-bewerkscherm.
- Server action breidt update uit; autorisatie OWNER/STAFF, alleen bij CONCEPT.

## Acceptatiecriteria
- [ ] Given een CONCEPT-contract, When OWNER/STAFF de huisvesting-opties invult en opslaat, Then worden ze op het contract bewaard en getoond.
- [ ] Boxnummer wordt voorgevuld uit het paardprofiel maar is overschrijfbaar.

## Oplevert (testbaar)
Het dienstpakket (huisvesting) is vastlegbaar en zichtbaar op het contract.

## Open vragen
Geen.
""")

story("STAL-04", "Voer, verzorging, weidegang & faciliteiten (voorvullen uit voederschema)",
      "Contractinhoud: opties & voorwaarden", ["STAL-01", "STAL-03"],
      """**Epic:** Contractinhoud: opties & voorwaarden
**Hangt af van:** STAL-01 (datamodel), STAL-03 (huisvestingblok)

## User story
Als **staleigenaar** wil ik voer, weidegang en faciliteitengebruik op het contract vastleggen — voorgevuld uit het bestaande voederschema — zodat de afspraken aansluiten op de werkelijke verzorging van het paard.

## Context & scope
Optieblokken "Voer & verzorging", "Weidegang" en "Faciliteiten" uit §3.3. Hergebruik bestaand `FeedingPlan` om voer voor te vullen.
**Buiten scope:** prijs van extra diensten (STAL-05).

## Functionele inhoud
- Contract-config uitbreiden met: voer (ruwvoer/krachtvoer — voorvullen uit `FeedingPlan` van het paard via bestaande query), uitmesten reeds in STAL-03; weidegang (wel/niet, individueel/groep, uren/seizoen); faciliteiten (binnen-/buitenbak, longeerpiste, stapmolen, solarium, wasplaats — multi-select).
- "Overnemen uit voederschema"-knop die de voervelden vult vanuit `FeedingPlan`.
- Update-action + autorisatie (OWNER/STAFF, CONCEPT).

## Acceptatiecriteria
- [ ] Given een paard met een `FeedingPlan`, When OWNER/STAFF "Overnemen uit voederschema" kiest, Then worden de voervelden voorgevuld en blijven bewerkbaar.
- [ ] Weidegang en faciliteiten worden als data op het contract opgeslagen en getoond.

## Oplevert (testbaar)
Volledig dienstpakket (voer/weidegang/faciliteiten) staat op het contract, geïntegreerd met bestaande paarddata.

## Open vragen
Geen.
""")

story("STAL-05", "Prijs, borg & looptijd-instellingen",
      "Contractinhoud: opties & voorwaarden", ["STAL-01"],
      """**Epic:** Contractinhoud: opties & voorwaarden
**Hangt af van:** STAL-01 (datamodel)

## User story
Als **staleigenaar** wil ik de pensionprijs, borg en looptijd-voorwaarden vastleggen, zodat de financiële en contractuele kern van de overeenkomst klopt.

## Context & scope
§3.2 (looptijd) + prijs/borg uit §3.3, als data (geen facturatie). Opzegtermijn voor stalling standaard ≥ 1 kalendermaand.
**Buiten scope:** innen/facturatie; verzekering (STAL-06).

## Functionele inhoud
- Contract-config uitbreiden met: pensionprijs (bedrag + incl./excl. btw-vlag + frequentie maand), borg (aan/uit + bedrag), aard (bepaalde/onbepaalde tijd), ingangsdatum (uit STAL-01), einddatum (bij bepaalde tijd), minimumperiode, opzegtermijn (waarde + eenheid; default 1 maand, schriftelijk), verlenging (stilzwijgend per maand/periode | expliciet | geen), proefperiode (aan/uit + duur), indexering (aan/uit + grondslag + moment).
- Sectie "Prijs & looptijd" in het bewerkscherm met validatie (bv. einddatum vereist bij bepaalde tijd; opzegtermijn ≥ 1 maand bij onbepaalde tijd → waarschuwing).
- Update-action + autorisatie (OWNER/STAFF, CONCEPT).

## Acceptatiecriteria
- [ ] Given een CONCEPT-contract, When OWNER/STAFF prijs/borg/looptijd invult, Then worden deze opgeslagen en getoond.
- [ ] Bij onbepaalde tijd is de default opzegtermijn 1 kalendermaand.
- [ ] Validatie verhindert opslaan van bepaalde tijd zonder einddatum.

## Oplevert (testbaar)
De financiële en looptijd-kern van het contract is configureerbaar — nodig voor aanbieden (STAL-08) en beheer (STAL-14/15).

## Open vragen
- Btw-percentage vast op één tarief of instelbaar? (Voorstel: vlag incl./excl. + één instelbaar percentage.)
""")

story("STAL-06", "Verplicht verzekerings- & aansprakelijkheidsblok",
      "Contractinhoud: opties & voorwaarden", ["STAL-01"],
      """**Epic:** Contractinhoud: opties & voorwaarden
**Hangt af van:** STAL-01 (datamodel)

## User story
Als **staleigenaar** wil ik het verzekerings- en aansprakelijkheidsblok verplicht invullen, zodat het contract juridisch sluitend is voordat ik het aanbied.

## Context & scope
De gevoeligste blokken (§3.0/§3.3): verzekering + aansprakelijkheid. **Verplicht** in te vullen vóór aanbieden (STAL-08 valideert hierop).
**Buiten scope:** juridische teksten zelf (worden door een hippisch jurist geleverd; hier alleen het raamwerk + datavelden).

## Functionele inhoud
- Contract-config uitbreiden met:
  - Verzekering: WA-/aansprakelijkheidsverzekering eigenaar verplicht (ja + polisnummer/maatschappij aantonen), brandverzekering paard (ja/nee), eigenaar verzekert paard zelf (bevestiging).
  - Aansprakelijkheid: risico-acceptatie eigenaar; bezitter-aansprakelijkheid (art. 6:179 BW); notitie bedrijfsmatig gebruik (art. 6:181 BW) — bij full pension zonder training NVT, maar veld aanwezig; zorgplicht stal; aansprakelijkheid stal beperkt en gekoppeld aan dekking.
- Sectie "Verzekering & aansprakelijkheid" met **verplicht-markering**; deze velden zijn vereist voordat de status naar AANGEBODEN mag (afgedwongen in STAL-08).
- Update-action + autorisatie (OWNER/STAFF, CONCEPT).

## Acceptatiecriteria
- [ ] Given een CONCEPT-contract, When OWNER/STAFF het blok invult, Then worden de gegevens opgeslagen.
- [ ] De verplichte velden (verzekering eigenaar + polis, aansprakelijkheidsacceptatie) zijn als "verplicht" gemarkeerd in de UI.
- [ ] Een onvolledig blok blokkeert later het aanbieden (zie STAL-08).

## Oplevert (testbaar)
Het juridisch verplichte blok is vastlegbaar en vormt de poort naar aanbieden.

## Open vragen
- Welke exacte velden eist de jurist als minimaal verplicht? (Open vraag richting hippisch jurist; voorlopig: verzekering eigenaar + polisnummer + aansprakelijkheidsacceptatie.)
""")

story("STAL-07", "Entings- & gezondheidsplicht gekoppeld aan de gezondheidsregistratie",
      "Contractinhoud: opties & voorwaarden", ["STAL-01"],
      """**Epic:** Contractinhoud: opties & voorwaarden
**Hangt af van:** STAL-01 (datamodel)

## User story
Als **staleigenaar** wil ik de entings- en gezondheidsplicht (vaccinatie, ontworming, hoefsmid) op het contract vastleggen en koppelen aan de bestaande gezondheidsregistratie, zodat naleving zichtbaar en bewaakbaar is.

## Context & scope
Optieblok "Entings-/gezondheidsplicht" uit §3.3. Hergebruik bestaande modellen `Vaccination`, `Deworming`, `HoefsmitBezoek`.
**Buiten scope:** automatische meldingen (lopen via bestaande gezondheidsherinneringen; koppeling benoemd in STAL-14/§7).

## Functionele inhoud
- Contract-config uitbreiden met: verplichte vaccinaties (influenza/tetanus, interval), ontworming/mestonderzoekbeleid, hoefsmidinterval, dierenarts-drempel (toestemming boven bedrag + meldingsplicht).
- In de contract-weergave: een statusindicatie die de afgesproken plicht afzet tegen de laatst geregistreerde `Vaccination`/`Deworming`/`HoefsmitBezoek` van het paard (bv. "vaccinatie up-to-date / verlopen").
- Update-action + autorisatie (OWNER/STAFF, CONCEPT).

## Acceptatiecriteria
- [ ] Given een CONCEPT-contract, When OWNER/STAFF de gezondheidsplicht invult, Then wordt deze opgeslagen en getoond.
- [ ] De contract-weergave toont of de bestaande gezondheidsregistratie aan de afgesproken plicht voldoet.

## Oplevert (testbaar)
Gezondheidsafspraken staan op het contract en zijn gekoppeld aan de echte paarddata.

## Open vragen
Geen.
""")

story("STAL-08", "Statusmachine + contract aanbieden (met verplicht-veld-validatie) en melding aan eigenaar",
      "Aanbieden & accepteren", ["STAL-01", "STAL-05", "STAL-06"],
      """**Epic:** Aanbieden & accepteren
**Hangt af van:** STAL-01 (datamodel/status), STAL-05 (prijs/looptijd), STAL-06 (verplicht verzekering/aansprakelijkheid)

## User story
Als **staleigenaar** wil ik een concept-contract aan de paardeigenaar aanbieden, zodat het proces formeel start en de eigenaar het kan beoordelen.

## Context & scope
Implementeert de statusmachine (§4) en de overgang CONCEPT → AANGEBODEN, inclusief validatie dat de verplichte blokken (STAL-05 prijs/looptijd, STAL-06 verzekering/aansprakelijkheid) volledig zijn. Melding via de bestaande Meldingen-functionaliteit (`Message`).
**Buiten scope:** accepteren/afwijzen (STAL-09), PDF (STAL-12), versionering (STAL-11).

## Functionele inhoud
- Centrale statusmachine-helper in `features/contracten/` met toegestane overgangen (§4) en server-side afdwinging.
- Server action `offerContract`: controleert volledigheid van verplichte velden; zet status CONCEPT → AANGEBODEN; legt aanbiedmoment vast; logt de statuswijziging.
- Melding naar de paardeigenaar via `Message` (paard-/eigenaargericht), zodat de bestaande meldingen-bel/-weergave het oppakt.
- "Aanbieden"-knop in het Contracten-paneel (alleen bij CONCEPT, alleen OWNER/STAFF) met validatie-feedback.

## Acceptatiecriteria
- [ ] Given een volledig CONCEPT-contract, When OWNER/STAFF "Aanbieden" kiest, Then wordt de status AANGEBODEN en krijgt de eigenaar een melding.
- [ ] Given een onvolledig contract (ontbrekende verplichte velden uit STAL-05/06), When men aanbiedt, Then wordt het geweigerd met duidelijke feedback.
- [ ] Niet-toegestane statusovergangen worden server-side geweigerd.

## Oplevert (testbaar)
Het aanbieden werkt end-to-end: status verandert en de eigenaar wordt genotificeerd. Kernmijlpaal van Journey S1.

## Open vragen
Geen.
""")

story("STAL-09", "Paardeigenaar ontvangt aanbod en accepteert of wijst af",
      "Aanbieden & accepteren", ["STAL-08"],
      """**Epic:** Aanbieden & accepteren
**Hangt af van:** STAL-08 (aanbieden + statusmachine)

## User story
Als **paardeigenaar** wil ik een aangeboden stallingscontract kunnen inzien en accepteren of afwijzen, zodat de overeenkomst actief wordt of vervalt.

## Context & scope
Journey S2. De eigenaar werkt in de bestaande paardeigenaar-weergave. Accepteren → GEACCEPTEERD → ACTIEF; afwijzen → AFGEWEZEN (geen tegenvoorstel).
**Buiten scope:** minderjarige/gemachtigde (STAL-10); PDF (STAL-12).

## Functionele inhoud
- In de paardeigenaar-weergave (`src/app/(app)/eigenaar/page.tsx` en/of de read-only paardpagina) een sectie "Contract" die een AANGEBODEN contract toont met de leesbare inhoud.
- Server actions `acceptContract` / `rejectContract` met autorisatie: alleen de `counterpartyUserId` (de eigenaar) mag dit; statusovergangen volgens §4.
- Bij acceptatie: status → GEACCEPTEERD → ACTIEF (v1 direct), melding naar de stal via `Message`; bij afwijzing: status → AFGEWEZEN + melding.

## Acceptatiecriteria
- [ ] Given een AANGEBODEN contract, When de eigenaar accepteert, Then wordt het ACTIEF en krijgt de stal een melding.
- [ ] Given een AANGEBODEN contract, When de eigenaar afwijst, Then wordt het AFGEWEZEN en krijgt de stal een melding.
- [ ] Alleen de gekoppelde eigenaar kan accepteren/afwijzen (server-side afgedwongen); staf niet.

## Oplevert (testbaar)
Volledige aanbod→besluit-lus werkt: een contract kan actief worden of worden afgewezen. Journey S1+S2 end-to-end testbaar.

## Open vragen
Geen.
""")

story("STAL-10", "Minderjarige eigenaar: mede-akkoord gemachtigde vóór activatie",
      "Aanbieden & accepteren", ["STAL-09"],
      """**Epic:** Aanbieden & accepteren
**Hangt af van:** STAL-09 (accepteren)

## User story
Als **stal en gemachtigde (ouder/voogd)** wil ik dat bij een minderjarige eigenaar het mede-akkoord van de gemachtigde vereist is vóór activatie, zodat het contract rechtsgeldig tot stand komt.

## Context & scope
Optieblok "Minderjarigheid" (§3.3). Alleen relevant als de wederpartij als minderjarig is gemarkeerd.
**Buiten scope:** rechtsgeldige digitale handtekening (later).

## Functionele inhoud
- Contract-config: vlag "wederpartij minderjarig" + gegevens gemachtigde (naam, relatie, contact).
- Statusmachine: bij minderjarig vereist activatie zowel acceptatie eigenaar als mede-akkoord gemachtigde; tot beide rond zijn blijft de status GEACCEPTEERD (nog niet ACTIEF).
- Mede-akkoord-actie (in v1: door de gemachtigde via een eenvoudige bevestiging; concrete kanaalkeuze = open vraag).

## Acceptatiecriteria
- [ ] Given een contract met minderjarige eigenaar, When alleen de eigenaar accepteert, Then blijft de status GEACCEPTEERD (niet ACTIEF).
- [ ] Given mede-akkoord van de gemachtigde is geregistreerd, Then wordt de status ACTIEF.

## Oplevert (testbaar)
De minderjarig-route is afgedekt; activatie vereist beide akkoorden.

## Open vragen
- Via welk kanaal geeft de gemachtigde akkoord (eigen account, e-mailbevestiging, of vastlegging door de stal)? Te bepalen vóór bouw.
""")

story("STAL-11", "Versionering: nieuwe versie maken vervangt de vorige",
      "Aanbieden & accepteren", ["STAL-08"],
      """**Epic:** Aanbieden & accepteren
**Hangt af van:** STAL-08 (aanbieden + statusmachine)

## User story
Als **staleigenaar** wil ik een nieuwe versie van een contract kunnen maken, zodat ik gewijzigde voorwaarden kan aanbieden zonder tegenvoorstel-mechaniek (de oude versie wordt vervangen).

## Context & scope
§4-regel "Vervangen door nieuwe versie". Vervangt elke onderhandeling. Snapshot per versie.
**Buiten scope:** PDF per versie (STAL-12 voegt de PDF-uitdraai toe).

## Functionele inhoud
- `ContractVersion`-snapshot (of versie-logging op `Contract` met `currentVersion`): bij "Nieuwe versie" wordt de huidige (AANGEBODEN/AFGEWEZEN) versie op VERVANGEN gezet en een nieuwe CONCEPT met opgehoogd versienummer aangemaakt (kopie van de inhoud).
- Server action `createNewVersion` met autorisatie (OWNER/STAFF) + statuslog.
- Versiehistorie zichtbaar op het contract.

## Acceptatiecriteria
- [ ] Given een AANGEBODEN/AFGEWEZEN contract, When OWNER/STAFF een nieuwe versie maakt, Then krijgt de oude status VERVANGEN en start de nieuwe als CONCEPT met versie+1.
- [ ] De versiehistorie is zichtbaar.

## Oplevert (testbaar)
Iteratie op voorwaarden zonder tegenvoorstel werkt; historie blijft bewaard.

## Open vragen
Geen.
""")

story("STAL-12", "Contract-PDF genereren in huisstijl, met preview en opslag",
      "PDF", ["STAL-06", "STAL-08"],
      """**Epic:** PDF
**Hangt af van:** STAL-06 (verplichte inhoud), STAL-08 (aangeboden versie); profiteert van STAL-03/04/05/07 (overige opties)

## User story
Als **staleigenaar en paardeigenaar** wil ik een nette PDF van het contract kunnen genereren en inzien, zodat beide partijen een leesbaar, opgeslagen document hebben.

## Context & scope
§5 (opstellen/genereren). Rendert het contractobject + alleen de aangezette opties naar een PDF in Velaro-huisstijl (navy/goud, logo). Preview vóór aanbieden en opslag per versie.
**Buiten scope:** PDF inlezen/parsen (latere batch); handtekeningblokken (later, alleen ruimte reserveren).

## Functionele inhoud
- PDF-generatie in `features/contracten/` (server-side; bibliotheekkeuze = open vraag), met vaste opmaak: partijen (stal + eigenaar), artikelen uit de aangezette opties, versienummer + datum, plaats voor latere handtekeningen.
- "Preview-PDF" in het bewerkscherm; bij aanbieden (STAL-08) en bij elke nieuwe versie (STAL-11) wordt de PDF opgeslagen en gekoppeld aan het contract én getoond op het paardprofiel.
- Eigenaar kan de PDF inzien in zijn weergave (sluit aan op STAL-09).

## Acceptatiecriteria
- [ ] Given een contract met ingevulde opties, When men "Preview-PDF" kiest, Then wordt een PDF in huisstijl getoond met alleen de aangezette opties, versienummer en datum.
- [ ] Bij aanbieden wordt de PDF opgeslagen en is hij voor beide partijen zichtbaar.

## Oplevert (testbaar)
Een visueel controleerbaar contractdocument — sluit Journey S1 af met een echt document.

## Open vragen
- Welke PDF-bibliotheek/aanpak (server-side render) past binnen de Next.js/Vercel-stack? Te bepalen vóór bouw.
- Waar worden PDF's opgeslagen (Vercel Blob / Supabase Storage)?
""")

story("STAL-13", "Contract-dashboard per partij",
      "Beheer & dashboard", ["STAL-09"],
      """**Epic:** Beheer & dashboard
**Hangt af van:** STAL-09 (actieve contracten bestaan)

## User story
Als **staleigenaar en paardeigenaar** wil ik een overzicht van mijn contracten met status, einddatums en openstaande acties, zodat ik grip houd op lopende afspraken.

## Context & scope
Journey D/S3 (overzicht). Per rol een lijst: de stal ziet alle contracten van zijn stal; de eigenaar ziet zijn eigen contracten.
**Buiten scope:** verlengen/opzeggen-acties zelf (STAL-14/15) — hier alleen het overzicht + signalering.

## Functionele inhoud
- Stal: een contracten-overzicht (bv. onder `stal/` of binnen het paardprofiel-overzicht) met status, wederpartij, ingangs-/einddatum, eerstvolgende actie.
- Eigenaar: contract-sectie in de paardeigenaar-weergave met dezelfde kerninfo voor zijn paard(en).
- Signalering van openstaande acties (bv. aangeboden/te verlengen) via badges; herbruik bestaande badge-stijlen.

## Acceptatiecriteria
- [ ] Given contracten in diverse statussen, When OWNER/STAFF het overzicht opent, Then ziet hij alle stalcontracten met status + einddatum + actie.
- [ ] De eigenaar ziet alleen zijn eigen contract(en).

## Oplevert (testbaar)
Beide partijen hebben overzicht; basis voor beheeracties.

## Open vragen
Geen.
""")

story("STAL-14", "Verlengen (stilzwijgend en expliciet) met meldingen",
      "Beheer & dashboard", ["STAL-09", "STAL-05"],
      """**Epic:** Beheer & dashboard
**Hangt af van:** STAL-09 (actief contract), STAL-05 (looptijd/verlenging)

## User story
Als **stal en eigenaar** wil ik dat contracten conform de looptijdregels verlengen, zodat lopende afspraken niet onbedoeld eindigen.

## Context & scope
Journey E/S3 (verlengen). Stilzwijgend = automatisch + melding; expliciet = beide partijen bevestigen.
**Buiten scope:** opzeggen/opschorten (STAL-15).

## Functionele inhoud
- Looptijd-mijlpaal-logica die het naderende einde/verlengmoment bepaalt en signaleert via `Message` (§7).
- Stilzwijgend: status → VERLENGD met nieuwe periode + melding aan beide partijen.
- Expliciet: bevestig-actie voor stal en eigenaar; pas na beide → VERLENGD.

## Acceptatiecriteria
- [ ] Given een contract met stilzwijgende verlenging dat zijn einde nadert, When het verlengmoment bereikt is, Then wordt het VERLENGD en krijgen beide partijen een melding.
- [ ] Given expliciete verlenging, Then is bevestiging van beide partijen nodig voordat de status VERLENGD wordt.

## Oplevert (testbaar)
Verlengen werkt voor beide verleng-modi; meldingen lopen via de bestaande functionaliteit.

## Open vragen
- Hoe wordt het verlengmoment getriggerd (cron/scheduled job vs. bij paginabezoek berekenen)? Te bepalen vóór bouw.
""")

story("STAL-15", "Opzeggen, opschorten, tijdelijke prijsverlaging en retentierecht-status",
      "Beheer & dashboard", ["STAL-09", "STAL-05"],
      """**Epic:** Beheer & dashboard
**Hangt af van:** STAL-09 (actief contract), STAL-05 (opzegtermijn/looptijd)

## User story
Als **stal en eigenaar** wil ik een actief contract kunnen opzeggen, tijdelijk opschorten of in prijs verlagen, en wanbetaling/retentierecht vastleggen, zodat de hele levensloop van het contract beheersbaar is.

## Context & scope
Journey F/S3 (opzeggen/opschorten/beëindigen). Voltooit de statusmachine (§4) voor stalling v1.
**Buiten scope:** facturatie/incasso (retentierecht alleen als status/clausule-data).

## Functionele inhoud
- Opzeggen: actie berekent einddatum o.b.v. opzegtermijn (STAL-05) → status OPZEGGING_LOOPT → op de einddatum BEEINDIGD.
- Opschorten: status → OPGESCHORT met einddatum; keert daarna automatisch terug naar ACTIEF.
- Tijdelijke prijsverlaging: afwijkend bedrag + start-/einddatum als data (geen inning).
- Retentierecht/wanbetaling: een markeerbare status/notitie op het contract conform de clausule (data, geen incasso).
- Bijzondere beëindiging: opzegrecht bij langdurige blessure (drempel); van rechtswege bij overlijden paard.
- Alle overgangen via de statusmachine (§4), server-side afgedwongen; meldingen via `Message`.

## Acceptatiecriteria
- [ ] Given een ACTIEF contract, When het wordt opgezegd, Then berekent het systeem de einddatum via de opzegtermijn en is de status OPZEGGING_LOOPT tot die datum, daarna BEEINDIGD.
- [ ] Given een ACTIEF contract, When het wordt opgeschort met einddatum, Then is de status OPGESCHORT en keert het daarna terug naar ACTIEF.
- [ ] Wanbetaling/retentierecht is als status/notitie vastlegbaar.
- [ ] Bij overlijden paard eindigt het contract van rechtswege.

## Oplevert (testbaar)
De volledige levensloop (opzeggen/opschorten/beëindigen) is afgedekt — stalling-engine v1 is functioneel compleet.

## Open vragen
Geen.
""")


# ── Epics ──────────────────────────────────────────────────────────────────
EPICS = [
    {"title": "[EPIC] Contract-fundament & concept-contract",
     "children": ["STAL-01", "STAL-02"],
     "intro": "Datamodel-fundament voor de contracten-module + het aanmaken en beheren van een concept-stallingscontract (full pension). Levert de basis waar alle andere stalling-stories op bouwen."},
    {"title": "[EPIC] Contractinhoud: opties & voorwaarden",
     "children": ["STAL-03", "STAL-04", "STAL-05", "STAL-06", "STAL-07"],
     "intro": "Alle optieblokken en voorwaarden van het stallingscontract: huisvesting, voer/weidegang/faciliteiten (voorgevuld uit het voederschema), prijs/borg/looptijd, het verplichte verzekerings- & aansprakelijkheidsblok, en de entings-/gezondheidsplicht."},
    {"title": "[EPIC] Aanbieden & accepteren",
     "children": ["STAL-08", "STAL-09", "STAL-10", "STAL-11"],
     "intro": "De statusmachine en de kernflow Journey S1+S2: aanbieden (met verplicht-veld-validatie + melding), accepteren/afwijzen door de eigenaar, mede-akkoord bij minderjarigheid, en versionering."},
    {"title": "[EPIC] PDF",
     "children": ["STAL-12"],
     "intro": "Genereren van het contract als PDF in Velaro-huisstijl, met preview en opslag per versie. (PDF inlezen/parsen valt buiten deze batch.)"},
    {"title": "[EPIC] Beheer & dashboard",
     "children": ["STAL-13", "STAL-14", "STAL-15"],
     "intro": "Journey S3: overzicht/dashboard per partij en de volledige levensloop — verlengen, opzeggen, opschorten, tijdelijke prijsverlaging en retentierecht-status."},
]


def main():
    existing = existing_titles()
    keymap = {}  # STAL-key -> issue number

    print("== Stories aanmaken ==")
    for s in STORIES:
        if s["title"] in existing:
            num = existing[s["title"]]
            print(f"  bestaat al: {s['title']} (#{num})")
        else:
            deps = ", ".join(s["deps"]) if s["deps"] else "—"
            body = s["body"]
            num, url = create_issue(s["title"], body, STORY_LABELS)
            add_to_board(url)
            print(f"  aangemaakt: {s['title']} -> #{num}")
        keymap[s["key"]] = num

    print("== Epics aanmaken ==")
    epic_numbers = []
    for e in EPICS:
        if e["title"] in existing:
            num = existing[e["title"]]
            print(f"  bestaat al: {e['title']} (#{num})")
            epic_numbers.append(num)
            continue
        tasks = "\n".join(
            f"- [ ] #{keymap[c]} {c}" for c in e["children"]
        )
        body = (
            e["intro"]
            + "\n\n## Stories in deze epic\n" + tasks
            + "\n\n> Stories zijn verticale slices: elke story levert testbare functionaliteit op en kan iteratief opgepakt worden. Volgorde = nummering; afhankelijkheden staan per story onder \"Hangt af van\"."
        )
        num, url = create_issue(e["title"], body, EPIC_LABELS)
        add_to_board(url)
        epic_numbers.append(num)
        print(f"  aangemaakt: {e['title']} -> #{num}")

    print("== Status op Backlog zetten ==")
    items = board_item_map()
    all_numbers = list(keymap.values()) + epic_numbers
    for n in all_numbers:
        iid = items.get(n)
        if iid:
            set_backlog(iid)
            print(f"  #{n} -> Backlog")
        else:
            print(f"  #{n} NIET op bord gevonden (controleer handmatig)")

    print("== Klaar ==")
    print("Stories:", {k: f"#{v}" for k, v in keymap.items()})
    print("Epics:", epic_numbers)


if __name__ == "__main__":
    main()
