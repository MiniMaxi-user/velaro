---
issue: 66
title: "[Lease 07] Kostenverdeling & betaaladministratie"
status: "Done"
labels: ["lease"]
url: "https://github.com/MiniMaxi-user/velaro/issues/66"
archivedAt: 2026-06-19
---

# #66 — [Lease 07] Kostenverdeling & betaaladministratie

Onderdeel van epic #59. Gereviewd met de huidige app-context en de visie uit `velaro-leasemodule.md`.

**Doel:** maandelijkse leasevergoeding + splitsing van kostenposten administreren, met btw-afhandeling.

## UI & plaatsing
- **Paneel "Kosten & betaling"** binnen de **Lease-tab** (of op een lease-detailpagina `/lease/[leaseId]`), in `panel`-stijl.
- **Kostenverdeel-tabel:** rijen per post (Hoefsmid, Dierenarts, Voer, Stalling, Tuig, Overig) met kolommen *Post | Wie betaalt (eigenaar/leaser) | Bedrag*. Inline bewerkbaar; "wie betaalt" als select.
- **Leasevergoeding:** apart veld (maandbedrag) met **btw-toggle 21%**; toon onder de tabel een `detail-fields`-blok met *Subtotaal / Btw 21% / Totaal p/m* zodat het btw-effect transparant is. Korte hint dat lease 21% is (sport/sportaccommodatie 9% geldt hier niet).
- **Maandoverzicht:** een compacte samenvattingskaart per partij ("Leaser betaalt â‚¬â€¦ p/m", "Eigenaar draagt â€¦"). Grote/onvoorziene dierenartskosten markeerbaar met een `badge-warning` "Onvoorzien".
- Echte incasso/PSP-koppeling is **buiten scope** van deze story (alleen administratie/overzicht) â€” noteer als follow-up richting de latere facturatie-stap (bouwvolgorde 6).

## UX-richtlijnen
- Btw nooit verstoppen: subtotaal/btw/totaal altijd zichtbaar.
- Wie-betaalt-wat in Ã©Ã©n oogopslag leesbaar; default-verdeling voorinvullen (leaser: vergoeding; eigenaar: zorgkosten).

## Acceptatie
- Per lease zijn vergoeding + kostenverdeling + btw correct zichtbaar; maandoverzicht per partij.

**Afhankelijkheden:** Lease 06. Sluit aan op facturatie-stap. **Size:** L
