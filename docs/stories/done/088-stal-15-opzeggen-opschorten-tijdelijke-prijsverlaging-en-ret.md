---
issue: 88
title: "[STAL-15] Opzeggen, opschorten, tijdelijke prijsverlaging en retentierecht-status"
status: "Done"
labels: ["contract", "stalling"]
url: "https://github.com/MiniMaxi-user/velaro/issues/88"
archivedAt: 2026-06-19
---

# #88 — [STAL-15] Opzeggen, opschorten, tijdelijke prijsverlaging en retentierecht-status

**Epic:** Beheer & dashboard
**Hangt af van:** STAL-09 (#82, actief contract), STAL-05 (#78, opzegtermijn/looptijd)
**Samenhang:** STAL-14 (#87, verlengen) deelt dezelfde statusmachine en `Message`-meldingen; samen voltooien #87 en #88 de levensloop van een actief stallingscontract.

# User Story

Als **stal (OWNER/STAFF)** wil ik een actief stallingscontract kunnen opzeggen, tijdelijk opschorten, een tijdelijke prijsverlaging vastleggen en wanbetaling/retentierecht markeren, zodat de hele levensloop van het contract beheersbaar is en netjes wordt afgesloten.

(De eigenaar is wederpartij en ontvangt meldingen; de bedienende acties liggen â€” net als bij aanbieden/versioneren â€” bij de stal.)

# Context

Journey F/S3 uit `velaro-contracten.md` (Â§4 statusmachine, Â§6 journey F/S3, Â§3.2 opschorten/prijsverlaging, Â§3.4 bijzondere beÃ«indiging). Dit is het laatste blok dat de statusmachine voor stalling v1 compleet maakt: na deze story is de stalling-engine v1 functioneel volledig (CONCEPT â†’ AANGEBODEN â†’ ACTIEF â†’ opzeggen/opschorten/beÃ«indigen).

De benodigde enum-waarden bestaan al in `prisma/schema.prisma` (`ACTIEF`, `OPGESCHORT`, `OPZEGGING_LOOPT`, `BEEINDIGD`). De overgangen worden toegevoegd aan de bestaande statusmachine (`src/features/contracten/statusMachine.ts`, `TOEGESTANE_OVERGANGEN`) en de acties aan `src/features/contracten/actions.ts`, in dezelfde stijl als `offerContract`/`acceptContract` (server-side autorisatie + `assertOvergangToegestaan` + append-only `statusHistorie` in `Contract.config` + `Message` in Ã©Ã©n transactie). De opzegtermijn komt uit het bestaande `config.prijsLooptijd.looptijd.opzegtermijn`-blok (STAL-05).

# Scope

**Binnen scope**
- **Opzeggen:** stal-actie op een ACTIEF contract; systeem berekent de einddatum op basis van de opzegtermijn uit STAL-05 â†’ status OPZEGGING_LOOPT; op de berekende einddatum â†’ BEEINDIGD.
- **Opschorten:** stal-actie op een ACTIEF contract met een opgegeven einddatum â†’ status OPGESCHORT; op de einddatum keert het automatisch terug naar ACTIEF.
- **Tijdelijke prijsverlaging:** afwijkend bedrag + start-/einddatum, vastgelegd als data op het contract (`Contract.config`). Geen inning.
- **Retentierecht/wanbetaling:** markeerbare status/notitie op het contract conform de retentierecht-clausule (art. 3:290 BW), vastgelegd als data. Geen incasso.
- **Bijzondere beÃ«indiging:** opzegrecht bij langdurige blessure (drempel in weken, conform contract) en beÃ«indiging van rechtswege bij overlijden van het paard.
- Alle statusovergangen lopen via de statusmachine (Â§4), server-side afgedwongen, met een melding aan de wederpartij via `Message`.

**Buiten scope**
- Facturatie, incasso en geldstroom: retentierecht, wanbetaling en prijsverlaging worden uitsluitend als status/clausule-data vastgelegd (geen betaalverwerking).
- Verlengen (stilzwijgend/expliciet) â€” dat is STAL-14 (#87).
- Lease-specifieke kalender/dag-effecten (Â§8) â€” niet van toepassing op stalling v1.

# Acceptatiecriteria

- [ ] **Opzeggen** â€” Als een contract de status ACTIEF heeft, wanneer de stal het opzegt, dan berekent het systeem de einddatum op basis van de opzegtermijn (STAL-05) en krijgt het contract status OPZEGGING_LOOPT tot die datum. De wederpartij ontvangt een melding via `Message`.
- [ ] **Opzeg-einddatum verstrijkt (lazy)** â€” Als een contract de status OPZEGGING_LOOPT heeft en de berekende einddatum is verstreken, wanneer het contract wordt geladen bij paginabezoek of een relevante serveractie, dan wordt de status BEEINDIGD en wordt eenmalig (idempotent) een melding via `Message` aan de wederpartij aangemaakt.
- [ ] **Opschorten** â€” Als een contract de status ACTIEF heeft, wanneer de stal het opschort met een einddatum, dan krijgt het contract status OPGESCHORT. De wederpartij ontvangt een melding.
- [ ] **Opschort-einddatum verstrijkt (lazy)** â€” Als een contract de status OPGESCHORT heeft en de opgegeven einddatum is verstreken, wanneer het contract wordt geladen bij paginabezoek of een relevante serveractie, dan keert de status terug naar ACTIEF en wordt eenmalig (idempotent) een melding via `Message` aan de wederpartij aangemaakt.
- [ ] **Tijdelijke prijsverlaging** â€” Als een contract ACTIEF is, wanneer de stal een tijdelijke prijsverlaging vastlegt (bedrag + start-/einddatum), dan wordt dit als data op het contract opgeslagen zonder dat er inning of facturatie plaatsvindt.
- [ ] **Wanbetaling/retentierecht** â€” Als de stal wanbetaling/retentierecht wil vastleggen, dan is dit als status/notitie op het contract markeerbaar (data, geen incasso).
- [ ] **Overlijden paard** â€” Als het paard overlijdt, dan eindigt het contract van rechtswege (status BEEINDIGD) en ontvangt de wederpartij een melding.
- [ ] **Langdurige blessure** â€” Als een paard langdurig geblesseerd is boven de in het contract vastgelegde drempel, dan kan het versnelde opzegrecht conform contract worden ingeroepen.
- [ ] **Statusmachine afgedwongen** â€” Elke overgang (opzeggen, opschorten, terugkeer, beÃ«indigen) is server-side gevalideerd via de statusmachine; een niet-toegestane overgang wordt geweigerd zonder dat er iets verandert. Elke overgang wordt append-only in `config.statusHistorie` gelogd.

# Technische Notities

- Voeg de overgangen toe aan `TOEGESTANE_OVERGANGEN` in `statusMachine.ts`: `ACTIEF â†’ [OPGESCHORT, OPZEGGING_LOOPT, BEEINDIGD]`, `OPGESCHORT â†’ [ACTIEF]`, `OPZEGGING_LOOPT â†’ [BEEINDIGD]`.
- Acties in `actions.ts` volgen het bestaande patroon: `getAuthorizedStaff` (alleen OWNER/STAFF), `assertOvergangToegestaan`, statuswissel + `Message` in Ã©Ã©n `prisma.$transaction`, en `metStatusHistorie` voor de append-only log.
- Prijsverlaging en retentierecht/wanbetaling als JSON-blokken onder `Contract.config` (geen schemawijziging nodig), in lijn met de bestaande config-sleutels.
- **Trigger van tijdgebonden overgangen â€” beslist: LAZY berekenen.** De automatische, datum-gebaseerde overgangen (OPGESCHORT â†’ ACTIEF op de einddatum; OPZEGGING_LOOPT â†’ BEEINDIGD op de opzeg-einddatum) worden **lazy** afgeleid bij paginabezoek/laden van het contract of bij een relevante serveractie. Er komt **geen cron/scheduler en geen nieuwe infra**. Bij het laden van een contract bepaalt een helper of een tijdgebonden overgang verschuldigd is en past die â€” via de bestaande statusmachine in dezelfde transactie â€” alsnog toe. Dit is consistent met de beslissing voor STAL-14 (#87).
- **Idempotente melding.** De bijbehorende `Message` wordt aangemaakt op het moment dat de lazy-berekening de overgang **voor het eerst** detecteert. Maak de aanmaak idempotent (bijv. afgeleid uit de append-only `config.statusHistorie`/een markeerveld), zodat herhaalde paginabezoeken niet meerdere meldingen genereren. De statusovergang zelf is van nature idempotent omdat de statusmachine een al-uitgevoerde overgang weigert.
- Geen implementatieontwerp voor de UI hier; volg de bestaande contracten-UI-componenten (`ContractActies.tsx`, `ContractenPanel.tsx`).
