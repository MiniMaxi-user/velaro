---
issue: 113
title: "Contract pas mogelijk na relatietype + stallingsvorm; stallingsvorm bepaalt contracttype"
status: "Done"
labels: []
url: "https://github.com/MiniMaxi-user/velaro/issues/113"
archivedAt: 2026-06-19
---

# #113 — Contract pas mogelijk na relatietype + stallingsvorm; stallingsvorm bepaalt contracttype

## Waarom

Een stallingscontract kan op dit moment vrijwel altijd worden aangemaakt: de knop
"Nieuw stallingscontract" controleert alleen of er een eigenaar gekoppeld is. Het
relatietype (As 1, #103) en de stallingsvorm (As 2, #103) sturen de gebruiker niet â€”
de relatietype-matching (#105) is puur informatieve tekst zonder gevolg. Daardoor kun
je een stallingscontract opmaken voor een stalpaard of een lespaard, en wordt het
contracttype altijd hardcoded op `FULL_PENSION` gezet, ongeacht de stallingsvorm.

De gebruiker verwacht in de frontend geholpen te worden: een contract hoort pas
mogelijk te zijn wanneer relatietype Ã©n stallingsvorm bewust zijn ingesteld, en de
stallingsvorm hoort het contracttype te bepalen.

## Scope

We ondersteunen in deze stap **volledig pension** en **halfpension**. Weidestalling,
paddock en tijdelijke stalling vallen bewust buiten scope (later per vorm te verfijnen).

## Acceptatiecriteria

- [ ] "Nieuw stallingscontract" is alleen mogelijk wanneer:
  - relatietype = pensionpaard, **en**
  - stallingsvorm gezet Ã©n âˆˆ {volledig pension, halfpension}, **en**
  - er minstens Ã©Ã©n eigenaar aan het paard gekoppeld is.
- [ ] Ontbreekt een voorwaarde, dan is de knop uitgeschakeld met een duidelijke
  uitleg (bijv. "Stel eerst de stallingsvorm in", "Stel eerst het relatietype in",
  "Voor dit relatietype is geen stallingscontract beschikbaar", "Voor deze
  stallingsvorm is nog geen contract beschikbaar", "Koppel eerst een eigenaar").
- [ ] De stallingsvorm bepaalt het contracttype: volledig pension â†’ Full pension,
  halfpension â†’ Half pension. Het type wordt zo (niet meer hardcoded FULL_PENSION)
  op het contract opgeslagen.
- [ ] De voorwaarden worden server-side afgedwongen in de aanmaak-actie en de
  aanmaak-pagina (niet alleen in de UI): een directe aanroep zonder geldige
  combinatie wordt geweigerd.
- [ ] Het type-veld in het formulier toont het bepaalde type ("Stalling â€” Full
  pension" / "Stalling â€” Half pension"); de misleidende hint "Je kunt dit wijzigen"
  vervalt zolang er Ã©Ã©n type per stallingsvorm is.
- [ ] Unit-tests dekken de poortlogica per relevante combinatie (pensionpaard +
  volledig/half = toegestaan met juist type; ontbrekend relatietype/stallingsvorm;
  niet-ondersteunde stallingsvorm; niet-pension relatietype; geen eigenaar).

## Niet in scope

- Contracten voor weidestalling/paddock/tijdelijke stalling.
- Lease-contracten (lease-module, epic #59).
- Schemawijzigingen: contracttype blijft de bestaande vrije `Contract.type`-string.
