---
issue: 77
title: "[STAL-04] Voer, verzorging, weidegang & faciliteiten (voorvullen uit voederschema)"
status: "Done"
labels: ["contract", "stalling", "tested"]
url: "https://github.com/MiniMaxi-user/velaro/issues/77"
archivedAt: 2026-06-19
---

# #77 — [STAL-04] Voer, verzorging, weidegang & faciliteiten (voorvullen uit voederschema)

**Epic:** Contractinhoud: opties & voorwaarden (#90)
**Hangt af van:** STAL-01 (#74, datamodel â€” Done), STAL-03 (#76, huisvesting-config-blok â€” Ready)

# User Story
Als **staleigenaar (OWNER) of stalmedewerker (STAFF)**
wil ik **voer & verzorging, weidegang en faciliteitengebruik op een concept-stallingscontract vastleggen â€” met de voervelden voorgevuld vanuit het bestaande voederschema van het paard**
zodat **de contractafspraken aansluiten op de werkelijke verzorging van het paard en ik gegevens niet dubbel hoef in te voeren.**

# Context
Deze story breidt het dienstpakket op het stallingscontract uit met de optieblokken "Voer & verzorging", "Weidegang" en "Faciliteiten" uit Â§3.3 van de contractvisie. STAL-03 introduceert het patroon waarbij optieblokken als data in het `config`-JSON-veld van `Contract` worden opgeslagen; STAL-04 voegt drie extra blokken toe in datzelfde `config`-veld en in hetzelfde bewerkscherm.

De voervelden worden voorgevuld uit het bestaande `FeedingPlan` van het paard (model bestaat al: `roughage` = ruwvoer, `concentrate` = krachtvoer, `supplements`, `restrictions`, `notes`), zodat de stal de afspraken niet opnieuw hoeft in te typen. Voorgevulde waarden blijven bewerkbaar op het contract â€” het contract legt de afgesproken situatie vast, los van latere wijzigingen in het voederschema.

De bestaande update-action (`updateStallingContract` in `src/features/contracten/actions.ts`) en het bewerkscherm (`ContractForm`) zijn de plek waar deze blokken worden aangehaakt. Autorisatie en CONCEPT-bewaking volgen het bestaande patroon (`getEditableConceptContract`).

# Scope
**Binnen scope:**
- Drie optieblokken op het concept-stallingscontract, opgeslagen in `Contract.config` (JSON), in lijn met het STAL-03-patroon:
  - **Voer & verzorging**: ruwvoer en krachtvoer (tekstvelden), met een knop "Overnemen uit voederschema" die deze velden vult vanuit `FeedingPlan` (`roughage` -> ruwvoer, `concentrate` -> krachtvoer). Velden blijven daarna bewerkbaar.
  - **Weidegang**: wel/niet, individueel/groep, uren per dag en/of seizoensaanduiding.
  - **Faciliteiten** (multi-select): binnenbak, buitenbak, longeerpiste, stapmolen, solarium, wasplaats.
- Sectie(s) voor deze blokken in het contract-bewerkscherm (`ContractForm`).
- Uitbreiding van de bestaande update-action; opslaan en weer tonen van de waarden.
- Autorisatie: alleen OWNER/STAFF van de stal van het paard; alleen bij status CONCEPT (server-side afgedwongen, conform bestaand patroon).

**Buiten scope:**
- Uitmesten / opstrooien / boxtype â€” dat valt onder het huisvestingblok van STAL-03.
- Prijs van extra diensten / dienstpakketten â€” STAL-05 (#78).
- Rendering in de contract-PDF â€” STAL-12 (#85).
- Wijzigingen aan het `FeedingPlan` zelf (alleen-lezen voorvullen, geen terugschrijven).

# Acceptatiecriteria
- [ ] **Voorvullen uit voederschema:** Als een paard een `FeedingPlan` heeft, wanneer een OWNER/STAFF op een CONCEPT-contract "Overnemen uit voederschema" kiest, dan worden de velden ruwvoer en krachtvoer gevuld met respectievelijk `roughage` en `concentrate`, en blijven ze daarna bewerkbaar.
- [ ] **Geen voederschema:** Als een paard geen `FeedingPlan` heeft, wanneer het bewerkscherm wordt geopend, dan blijven de voervelden leeg en blijft "Overnemen uit voederschema" zonder fout bruikbaar (vult niets, of is uitgeschakeld met duidelijke uitleg).
- [ ] **Weidegang opslaan:** Als een OWNER/STAFF op een CONCEPT-contract de weidegang-opties invult (wel/niet, individueel/groep, uren/seizoen) en opslaat, dan worden ze in `Contract.config` bewaard en bij heropenen van het scherm en in de contractweergave getoond.
- [ ] **Faciliteiten opslaan:** Als een OWNER/STAFF op een CONCEPT-contract faciliteiten aanvinkt en opslaat, dan worden de geselecteerde faciliteiten bewaard en getoond.
- [ ] **Voervelden opslaan:** Als de voervelden (al dan niet voorgevuld) zijn aangepast en opgeslagen, dan worden de aangepaste waarden op het contract bewaard, onafhankelijk van latere wijzigingen in het `FeedingPlan`.
- [ ] **Autorisatie:** Als een paardeigenaar (niet OWNER/STAFF) deze velden probeert op te slaan, dan wordt dit server-side geweigerd.
- [ ] **CONCEPT-bewaking:** Als het contract niet de status CONCEPT heeft, dan kunnen deze blokken niet worden bewerkt (server-side afgedwongen, conform bestaand patroon).

# Oplevert (testbaar)
Het volledige dienstpakket (voer & verzorging, weidegang, faciliteiten) is op een concept-stallingscontract vastlegbaar en zichtbaar, met de voervelden voorgevuld vanuit het bestaande voederschema.

# Open vragen
Geen.
