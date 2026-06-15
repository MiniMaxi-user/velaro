Velaro — Bouwplan Contracten-module (het grote plaatje, gedetailleerd)

> **Eén engine, twee contractfamilies.** Deze module is één gedeelde contract-engine
> (type → template met defaults → opties aan/uit → genereren → statusmachine → PDF →
> meldingen) die twee families bedient:
>
> 1. **Stallingsovereenkomst** — stal ↔ **paardeigenaar**. Het standaardcontract van
>    elke pensionstal: de staleigenaar biedt de paardeigenaar een stallingscontract aan.
>    Dit is de terugkerende-omzet-kern (de beachhead uit het businessplan) en wordt als
>    **eerste** familie gebouwd.
> 2. **Lease** — stal ↔ **leaser/bereider**. De oorspronkelijke lease-module (§ lease
>    hieronder), die ongewijzigd onderdeel blijft van dit plan.
>
> Het verschil tussen beide families zit uitsluitend in de contracttype-templates en de
> optiebibliotheek, niet in aparte codepaden. Wie een contract aanbiedt en wie accepteert
> verschilt (eigenaar vs. leaser), maar de aanbied-/accepteer-flow, statusmachine,
> versionering, PDF-generatie en meldingen zijn identiek.

1. Scope & uitgangspunten
Dit is een uitbreiding op het bestaande Velaro. Paardprofiel, stal en paardeigenaar bestaan al. De contracten-module hangt daarbovenop; we bouwen geen nieuwe kernobjecten maar voegen contractfunctionaliteit toe aan wat er staat.

Standaardcontract — stallingsovereenkomst (kern van dit plan). Het meest voorkomende contract van een pensionstal is de overeenkomst tussen de stal (pensionhouder) en de paardeigenaar (klant) over het stallen en verzorgen van het paard. De staleigenaar (OWNER) biedt de paardeigenaar een stallingscontract aan; de paardeigenaar accepteert of wijst af. Dit gebruikt exact dezelfde aanbied-/accepteer-flow en statusmachine als lease, maar met de paardeigenaar als wederpartij in plaats van een leaser. Omdat pensionstalling de terugkerende-omzet-kern is, is dit de eerste contractfamilie die we bouwen.

Eigendom vs. verleasen (lease-familie). Een paard hoort bij een stal en heeft precies één eigenaar. Die eigenaar is óf een paardeigenaar (persoon), óf de stal zelf. Er zijn nooit twee eigenaren naast elkaar. Verleasen doet altijd de stal — de stal is de partij die het paard aan een of meer bereiders/leasers verleast. De eigenaar-persoon verleast dus niet zelf; dat loopt via de stal.

In scope (deze fase): het opstellen, versturen, accepteren en beheren van zowel stallings- als leaseovereenkomsten — van contract opstellen tot activeren, verlengen, opschorten en opzeggen. Inclusief het genereren én inlezen van PDF's. Voor lease bovendien: ondersteuning voor verleasen aan meerdere leasers tegelijk.
Expliciet buiten scope (volgende grote items):

Facturatie / betalingen / btw — wél de haakjes (pensionprijs, borg en kostenverdeling als data in het contract), maar geen geldstroom. Let op: het retentierecht en de wanbetalings­regeling worden als contracttekst/data vastgelegd, maar incasso valt buiten scope.
Digitale handtekening — volgt later; "accepteren" is in deze fase een statuswisseling, geen rechtsgeldige e-handtekening.

Principes:

Het paard blijft het centrale object; contract-data (stalling én lease) hangt eraan.
Eén engine, twee families: stalling (stal↔eigenaar) en lease (stal↔leaser). Verschil zit in templates en opties, niet in codepaden.
Eén eigenaar per paard (persoon óf stal); de stal is altijd de aanbiedende/verleasende partij.
Verleasen aan meerdere bereiders kan, via losse contracten per leaser. Een paard heeft daarentegen normaliter één lopend stallingscontract (met één eigenaar).
Een contract is een configureerbaar object, geen los PDF-tje. De PDF is een uitdraai van dat object op een moment.
Geen tegenvoorstel-mechaniek. Een aanbod wordt geaccepteerd of afgewezen. Iets anders nodig? De stal maakt een nieuwe versie en het proces start opnieuw.
We beginnen klein: per familie één type goed werkend (stalling: full pension; lease: deellease), daarna uitbreiden.


2. Kernconcepten & datamodel (uitbreiding op bestaand)
Bestaand (hergebruiken): Paard / paardprofiel (`Horse`), Stal (`Stable`), Paardeigenaar (`HorseOwner` → `User`). Hierop bouwen we voort. Specifiek voor stalling hergebruiken we ook bestaande paard-data om contractvelden voor te vullen: het voederschema (`FeedingPlan`) voor de voer-/verzorgingsopties, en de gezondheidsregistratie (`Vaccination`, `Deworming`, `HoefsmitBezoek`) voor de entings-/gezondheidsclausules.

Contractfamilie & partijen:

Stallingsovereenkomst — aanbieder = de stal (pensionhouder); wederpartij = de paardeigenaar (klant, `HorseOwner`-persoon). Bij een minderjarige eigenaar tekent de gemachtigde (ouder/voogd) mee. Anders dan bij lease is de wederpartij hier de eigenaar zélf.
Lease — aanbieder/verleaser = de stal; wederpartij = de leaser/bereider.

Eigendoms- & verleasmodel (lease-familie):

Elk paard heeft één eigenaar: een paardeigenaar (persoon) óf de stal.
De stal is altijd de verleaser. Staat het paard bij een eigenaar-persoon, dan verleast de stal namens/in afstemming met die eigenaar; is de stal zelf eigenaar, dan verleast de stal zijn eigen paard.

Rollen (koppeling persoon/stal ↔ paard):

Eigenaar — persoon óf stal; precies één per paard. In het stallingscontract is de eigenaar-persoon de wederpartij; in het leasecontract is hij niet de verleasende partij (tenzij de stal óók de eigenaar is).
Stal (pensionhouder / verleaser) — biedt stallingscontracten aan de eigenaar aan en stelt leasecontracten op.
Leaser / bereider — de huurder; 1 tot n per paard via losse contracten (parallelle leases). Geen gedeeld contract tussen leasers.
Bijrijder — subrol onder een lease; mag rijden, is geen contractpartij.
Gemachtigde — bv. ouder/voogd bij een minderjarige leaser óf minderjarige eigenaar.

Contract — verbindt één paard met één wederpartij (eigenaar bij stalling, leaser bij lease), draagt een familie (stalling/lease), een type, looptijd-configuratie en aan/uitgezette opties (§3), met status (§4) en versienummer.
Meerdere contracten per paard — naast elkaar mogelijk binnen de lease-familie (de stal verleast hetzelfde paard aan meerdere bereiders, twee aparte contracten). Voor stalling geldt normaliter één lopend contract per paard. De compacte beschikbaarheidskalender (§8) is een lease-feature en maakt zichtbaar wie welke dag rijdt.


3. De contract-engine
Een contract opstellen = familie + type kiezen → template laadt slimme defaults → opties aan/uit en parameters invullen → genereren. Drie lagen: contracttypen, looptijd-instellingen, optiebibliotheek. De engine is familie-agnostisch: stalling- en leasetypen zijn beide gewoon templates.

3.0 Kenmerken van de stallingsovereenkomst (onderzoek)
Onderzoek naar Nederlandse pensionstal-/stallingsovereenkomsten levert de volgende vaste kenmerken op. Deze vertalen we 1-op-1 naar een stalling-template (§3.1) en optieblokken (§3.3). De juridische punten (aansprakelijkheid, verzekering, retentierecht) zijn het gevoeligst en maken we — net als bij lease — verplicht in te vullen.

Partijen & paard: NAW + (bij de stal) KvK; paardgegevens uit het bestaande profiel (naam, chip, UELN, paspoort). Bij minderjarige eigenaar: gemachtigde.
Pensionvorm / soort stalling: full pension (volledige verzorging), half pension, weidestalling/weidegang, opfok, trainingspension, of kale box-/standplaatshuur (eigenaar verzorgt zelf). De vorm bepaalt het dienstpakket en — belangrijk juridisch — of de stal bedrijfsmatig "gebruiker" wordt (zie aansprakelijkheid).
Dienstpakket / wat is inbegrepen: huisvesting (binnenbox/buitenbox/paddockbox/groep), voer (ruwvoer + krachtvoer), uitmesten + opstrooien (beddingtype), weidegang (wel/niet, individueel/groep, seizoen), toezicht/verzorging, gebruik faciliteiten (binnen-/buitenbak, longeerpiste, stapmolen, solarium, wasplaats). Het bestaande `FeedingPlan` voedt de voeropties voor.
Prijs & betaling: vast pensionbedrag per maand (incl./excl. btw); wat valt erbuiten (extra diensten met meerprijs → prijslijst-bijlage); betaling vooraf, betaaltermijn/-methode; waarborgsom/borg; jaarlijkse indexering/prijsaanpassing (gekoppeld aan voer- en strooiselkosten).
Looptijd & opzeggen: aanrader is onbepaalde tijd met **minimaal één kalendermaand** schriftelijke opzegtermijn (wettelijke hoofdregel bij onbepaalde tijd). Bepaalde tijd kan ook. Ingangsdatum, evt. proefperiode.
Retentierecht: bij betalingsachterstand mag de stalhouder het paard (en toebehoren) onder zich houden tot het stalgeld is voldaan (art. 3:290 BW). Vastleggen als clausule + data.
Verzekering: de eigenaar moet een WA-/aansprakelijkheidsverzekering (particuliere aansprakelijkheid voor het dier) hebben en bij aanvang aantonen (polisnummer); brandverzekering voor het paard is vaak verplicht; de eigenaar verzekert zijn paard en spullen zelf. De stal heeft een bedrijfsaansprakelijkheidsverzekering.
Aansprakelijkheid (verplicht blok): de eigenaar-bezitter blijft in beginsel aansprakelijk voor schade door eigen gedragingen van het paard (art. 6:179 BW). Bij **kale pensionstalling** blijft dat zo; zodra de stal het paard **bedrijfsmatig gebruikt** (training, lessen) kan de risico-aansprakelijkheid naar de stal verschuiven (art. 6:181 BW) — daarom is de pensionvorm contractueel relevant. De stalhouder heeft een **zorgplicht** (voldoende voer, water, beweging; tijdig dierenarts bij ziekte; goed onderhouden accommodatie; handelen bij ontsnapping). Aansprakelijkheid van de stal beperken we tot zorgplichtschending en koppelen we aan de verzekeringsdekking; een volledige uitsluiting is niet rechtsgeldig omdat de stal bedrijfsmatig handelt.
Gezondheid / veterinair: entingsplicht (influenza/tetanus) — verplicht; ontwormings-/mestonderzoekbeleid; hoefsmid op afroep; toestemming/meldingsplicht bij dierenarts boven een drempelbedrag; gezondheids-/quarantaineregels bij aankomst. Sluit aan op de bestaande gezondheidsregistratie.
Stalreglement / huisregels: openingstijden, gebruik faciliteiten, veiligheid, bezoek — als bijlage.
Beëindiging: opzegtermijn, verwijdering paard, eindafrekening, teruggave borg.
Bijlagen: stalreglement, voerschema, weidegang-schema, prijslijst extra diensten, kopie verzekeringspolis.

Juridische noot: de teksten zelf moeten door een hippisch jurist worden geleverd; Velaro biedt het raamwerk, geen juridische garantie. Het aansprakelijkheids- en verzekeringsblok zijn verplicht in te vullen.

3.1 Contracttypen (elk = template met eigen defaults)

3.1a Stalling-typen (familie: stalling)
TypeDefault dienstpakketDefault kostenDefault verantwoordelijkheidFull pensionVolledige verzorging: box, voer, uitmesten, weidegang, toezichtVast maandbedrag, all-inStal verzorgt; eigenaar blijft bezitter-aansprakelijk (6:179)Half pensionGedeelde verzorging; eigenaar doet deel zelfLager maandbedragGedeeld volgens afsprakenWeidestalling24/7 weide of paddock, basistoezichtLaag maandbedragStal basiszorg; eigenaar veel zelfOpfok / jongpaardOpfok in groep, weidegang, basisverzorgingMaandbedrag opfokStal verzorgt opfokTrainingspensionPension + training/africhtingHoger; trainingscomponentLet op: bedrijfsmatig gebruik → 6:181 kan aansprakelijkheid verschuivenKale box-/standplaatshuurAlleen huisvesting; eigenaar verzorgt zelfLaag, alleen stallingEigenaar volledig
3.1b Lease-typen (familie: lease)
TypeDefault gebruikDefault kostenDefault zeggenschapDeellease / halve leaseVaste dagen/week, gedeeldLeaser betaalt vaste bijdrage; stal/eigenaar draagt vaste lastenStal/eigenaar behoudt zeggenschapFull lease5–7 dagen, als "eigen" paardLeaser draagt (vrijwel) alle kosten + vergoedingGrotendeels leaser, binnen kadersBijrijden / verzorgpaardNaast vaste rijder, weinig/geen vergoedingGeen of kleine bijdrageVolledig stal/eigenaarWedstrijd-/sportleaseSpecifiek voor wedstrijdenHoger; prijzengeldverdeling aanAfspraken over klassen/niveauLease met koopoptieProef vóór koopLeasebedrag evt. verrekend met koopsomStal/eigenaar tot laatste betalingFokmerrie-/draagmerrieleaseInzet voor drachtBedrag per dracht + evt. borgEigendom veulen vooraf regelenBruikleen (om niet)Zonder vergoedingGebruiker draagt verzorgkostenVolledig stal/eigenaar

Het verschil tussen typen is welke opties default aan/uit staan en met welke waarden — geen aparte codepaden. Eén engine, eenvoudig uit te breiden.

3.2 Looptijd-instellingen (per contract — geldt voor beide families)

Aard: bepaalde tijd / onbepaalde tijd. (Stalling: standaard onbepaalde tijd.)
Ingangsdatum + (bij bepaalde tijd) einddatum.
Minimumperiode: bv. 2–3 maanden.
Opzegtermijn: aantal dagen/maanden + methode (schriftelijk). Stalling: minimaal één kalendermaand.
Verlenging: stilzwijgend per maand / stilzwijgend per periode / expliciet her-bevestigen / geen.
Proefperiode: aan/uit + duur (bv. 14 dagen) + regels tijdens proef (vrij opzeggen).
Tijdelijk opschorten: het contract voor een bepaalde periode pauzeren (bv. tijdens blessure, vakantie of afwezigheid) met start- en einddatum; daarna loopt het contract automatisch verder. Bij lease vervallen de gebruiksdagen tijdelijk uit de kalender (§8).
Tijdelijke prijsverlaging: de prijs voor een bepaalde periode verlagen (bv. revalidatie) met afwijkend bedrag + start-/einddatum; daarna terug naar het reguliere tarief. (Data; innen volgt later.)
Borg / waarborgsom: aan/uit + bedrag (stalling: gangbaar).
Indexering / jaarlijkse prijsaanpassing: aan/uit + grondslag (bv. voer- en strooiselkosten) — vooral stalling.
Bijzondere beëindiging: opzegrecht bij langdurige blessure (drempel in weken); van rechtswege eindigen bij overlijden paard; retentierecht bij wanbetaling (stalling).

3.3 Optiebibliotheek — aan/uit klikken binnen een contract
Elke optie: aan/uit-stand (default per type), parameters, en een gekoppeld tekstfragment dat in de PDF komt. Onderstaande blokken zijn gegroepeerd; sommige blokken gelden voor beide families, andere zijn familie-specifiek.

Stalling-blokken (familie: stalling)
BlokOptie / parametersHuisvestingType box (binnen/buiten/paddock/groep); stalplek/boxnummer (uit profiel)Voer & verzorgingRuwvoer + krachtvoer (voorvullen uit `FeedingPlan`); uitmesten + opstrooien; beddingtypeWeidegangWel/niet; individueel/groep; uren/seizoen; in-/uitscharenFaciliteitenBinnen-/buitenbak, longeerpiste, stapmolen, solarium, wasplaats — gebruik ja/neePensionprijsVast maandbedrag + incl./excl. btw-vlag; betaling vooraf; betaaltermijn → vastleggen, niet innenExtra dienstenLijst met meerprijs (bv. extra krachtvoer, dekje wisselen, opzetten/afhalen) → prijslijst-bijlageBorgAan/uit + bedragIndexeringAan/uit + grondslag + moment (jaarlijks)Entings-/gezondheidsplichtVerplichte vaccinaties (influenza/tetanus); ontworming/mestonderzoek; hoefsmidinterval — voorvullen/controleren tegen gezondheidsregistratieDierenarts/beslissingenToestemming stal boven drempelbedrag; meldingsplicht; nooddierenartsRetentierechtClausule + verwijzing (art. 3:290 BW) bij betalingsachterstandStalreglementBijlage verplicht aan/uit

Gedeelde blokken (stalling én lease)
BlokOptie / parametersVerzekeringEigenaar WA-/aansprakelijkheidsverzekering verplicht + polisnummer aantonen; brandverzekering paard; (lease) leaser meeverzekerd op WA-polis; dood-/ongeschiktheids-/ziektekostenverzekeringAansprakelijkheid (verplicht)Risico-acceptatie; bezitter-aansprakelijkheid eigenaar (6:179); bedrijfsmatig gebruik stal (6:181); zorgplicht stal; beperking gekoppeld aan dekkingMinderjarigheidMedeondertekening ouder/voogd verplicht aan/uitBijlagenWeekschema, stalreglement, keuringsverklaring, verzekeringspolis

Lease-blokken (familie: lease)
BlokOptie / parametersGebruiksrechtDagen/week + welke dagen; exclusief vs. gedeeld; toegang accommodatieDisciplinesMulti-select: recreatief, dressuur, springen, buitenritten, mennen…WedstrijdenAan/uit; toegestane klassen/niveau; prijzengeldverdelingRuitersAangewezen ruiter(s); bijrijderregeling aan/uitLocatieStalling waar; "mag verplaatst worden" ja/nee; verhuizing meldenTransportTrailer/vervoer toegestaan; door wieKostenverdelingPer post (stalling, voer, hoefsmid, dierenarts, gebit, tuig): wie betaalt → dataLeasevergoedingBedrag + frequentie + incl./excl. btw-vlag → vastleggen, niet innenVerkoop / voorkeursrechtEerste recht van koop leaser aan/uit; verkooptermijn; communicatieplicht

Juridische noot: het aansprakelijkheidsblok (art. 6:179 BW: bezitter blijft risico-aansprakelijk; art. 6:181 BW: risico verschuift naar de bedrijfsmatige gebruiker) en het verzekeringsblok zijn de gevoeligste — verplicht in te vullen, niet optioneel. Bij stalling is de pensionvorm bepalend voor wie risico-aansprakelijk is.


4. Statusmachine — het contractproces (beide families)
Eén contract doorloopt vaste statussen, ongeacht familie. Geen tegenvoorstel: wil een partij iets anders, dan maakt de stal een nieuwe versie en het proces start opnieuw.
Concept
  → Aangeboden        (verstuurd naar wederpartij: eigenaar bij stalling, leaser bij lease)
  → Geaccepteerd      (wederpartij akkoord)
  → Actief
       → Opgeschort        (tijdelijk gepauzeerd, met einddatum)
       → Opzegging loopt   (einddatum bekend via opzegtermijn)
       → Verlengd          (nieuwe periode)
  → Beëindigd / Verlopen
  → (zijpaden) Geannuleerd · Afgewezen · Vervangen door nieuwe versie
Regels:

Versionering: de stal kan altijd een nieuwe versie van een contract maken. De oude versie krijgt status Vervangen; de nieuwe start weer bij Concept → Aangeboden.
Opschorten: een actief contract kan tijdelijk naar Opgeschort met een einddatum; daarna keert het automatisch terug naar Actief.
Een contract gaat naar Actief zodra de wederpartij accepteert (en, indien minderjarig, de gemachtigde akkoord is). "Akkoord" is in deze fase een statuswissel; rechtsgeldige handtekening volgt later.
Elke statuswijziging en versie wordt gelogd; de gegenereerde PDF van die versie is het document van dat moment.


5. PDF — opstellen & lezen
Opstellen (genereren). Het contractobject + gekozen opties renderen naar een nette PDF in Velaro-huisstijl (navy/goud, logo in de header). Vaste juridische opmaak: partijen (stalling: stal + eigenaar; lease: stal + leaser), artikelen (alleen de aangezette opties verschijnen), versienummer en datum, plus (later) handtekeningblokken. Elke versie wordt opgeslagen aan het contract én aan het paardprofiel.
Versies. Maakt de stal een nieuwe versie, dan genereert die een nieuwe PDF; de vorige blijft bewaard als historie.
Lezen (inlezen/parsen). Twee doelen:

Extern contract koppelen — een stalling of lease is al buiten Velaro gesloten; upload de PDF, koppel aan paard en partijen, zodat beheer (meldingen, looptijd) tóch in Velaro loopt.
Documenten als bron — upload paspoort, keuringsrapport of verzekeringspolis; optioneel data-extractie om velden voor te vullen. Begin met "uploaden + koppelen + handmatig overnemen"; automatische extractie is een latere verfijning.


6. User journeys

— Stallingsovereenkomst (standaardcontract) —

Journey S1 — Stal biedt paardeigenaar een stallingscontract aan
Dit is het kernproces van de pensionstal. Aanbieder is de stal; wederpartij is de paardeigenaar.

Staleigenaar (OWNER) opent het bestaande paardprofiel → "Nieuw contract" → familie Stalling.
Kiest pensionvorm/type (bv. full pension) → template laadt defaults.
Stelt looptijd in (ingangsdatum, onbepaalde tijd, opzegtermijn ≥ 1 maand, evt. proeftijd, borg, indexering).
Zet opties aan/uit en vult parameters: huisvesting, voer/verzorging (voorgevuld uit `FeedingPlan`), weidegang, faciliteiten, pensionprijs, entings-/gezondheidsplicht, verzekering (verplicht), aansprakelijkheid (verplicht).
Kiest de paardeigenaar als wederpartij — de aan het paard gekoppelde eigenaar (`HorseOwner`) wordt voorgesteld; is er nog geen account, dan via uitnodiging op e-mail.
Genereert preview-PDF, controleert.
Verstuurt → status Aangeboden; de paardeigenaar krijgt een melding (§7).

Journey S2 — Paardeigenaar ontvangt en beslist

Paardeigenaar krijgt een melding + de leesbare PDF/preview in zijn eigen omgeving (de bestaande paardeigenaar-weergave).
Accepteert → status Geaccepteerd → Actief; PDF naar beide partijen + paardprofiel.
Wijst af → status Afgewezen (geen tegenvoorstel). Wil de stal andere voorwaarden, dan maakt hij een nieuwe versie (S1 opnieuw; vorige versie wordt Vervangen).
Bij minderjarige eigenaar: gemachtigde (ouder/voogd) geeft mede-akkoord vóór activatie.

Journey S3 — Stallingscontract beheren

Bij activatie: looptijd-mijlpalen gezet (§7); contract zichtbaar op het paardprofiel en op het dashboard van beide partijen.
Verlengen: stilzwijgend → automatisch + melding; expliciet → beide partijen bevestigen → Verlengd.
Opzeggen: systeem rekent einddatum o.b.v. opzegtermijn (≥ 1 maand) → Opzegging loopt → op de einddatum Beëindigd.
Opschorten / tijdelijke prijsverlaging: zoals §3.2 (bv. tijdens afwezigheid of revalidatie).
Wanbetaling: het retentierecht-clausuleblok is leidend; Velaro legt de status/afspraak vast (incasso buiten scope).
Overlijden paard: eindigt van rechtswege.

— Lease —

Journey A — Stal stelt lease op en biedt aan
Dit is het kernproces van de lease-familie. De verleaser is altijd de stal.

Stalbeheerder opent het bestaande paardprofiel → "Nieuw contract" → familie Lease.
Kiest contracttype (bv. deellease) → template laadt defaults.
Stelt looptijd in (ingang, minimumperiode, verlenging, opzegtermijn, proeftijd, evt. opschort-/prijsverlagingsregels).
Zet opties aan/uit en vult parameters (dagen, disciplines, kostenverdeling, verzekering…).
Kiest/voegt de leaser toe (uit matching of via uitnodiging op e-mail).
Genereert preview-PDF, controleert.
Verstuurt → status Aangeboden; leaser krijgt een melding (§7).

Journey B — Stal verleast aan meerdere bereiders
Eén paard, verleasd door de stal aan meerdere bereiders tegelijk via losse contracten:

Bv. de stal verleast aan bereider L1 (ma/wo) én aan bereider L2 (do/za) — twee aparte contracten, elk hun eigen Journey A en eigen status, dezelfde verleaser (de stal).
Of de stal verleast een paard als deellease aan twee bereiders die elk een paar dagen rijden.

Dit zijn losse, onafhankelijke processen met de stal als verleaser. De enige plek waar ze samenkomen is de beschikbaarheidskalender (§8), die dubbele dagen voorkomt.
Journey C — Leaser ontvangt en beslist

Leaser krijgt een melding + de leesbare PDF/preview.
Leaser accepteert → status Geaccepteerd/Actief.
Leaser wijst af → klikt op Afwijzen; status Afgewezen. (Geen tegenvoorstel.) Wil de stal het alsnog laten doorgaan met andere voorwaarden, dan maakt de stal een nieuwe versie (Journey A opnieuw, vorige versie wordt Vervangen).
Bij minderjarige leaser: gemachtigde (ouder) moet mede-akkoord geven vóór activatie.
Akkoord → Actief; PDF naar partijen + paardprofiel.

Journey D — Activeren & beheren

Bij activatie: dagen verschijnen in de kalender (§8); looptijd-mijlpalen gezet (§7).
Dashboard per partij toont actieve contracten, einddatums, openstaande acties.

Journey E — Verlengen

Velaro signaleert (via Meldingen) het nadere einde / verlengmoment.
Stilzwijgend → automatisch verlengd; partijen krijgen een melding.
Expliciet → stal en leaser bevestigen; nieuwe periode → Verlengd.

Journey F — Opzeggen, opschorten / tussentijds beëindigen

Opzegging → systeem rekent einddatum o.b.v. opzegtermijn → Opzegging loopt.
Opschorten → stal zet het contract tijdelijk op pauze met einddatum → Opgeschort; dagen vervallen tijdelijk uit de kalender; keert daarna automatisch terug naar Actief.
Bijzondere grond (langdurige blessure boven drempel) → versneld opzegrecht conform contract.
Overlijden paard → eindigt van rechtswege; contract sluit, kalenderdagen vrij.

Journey G — Extern contract inlezen (stalling of lease)

Stal of wederpartij uploadt bestaande PDF → koppelt paard + partijen + looptijd.
Status direct Actief (al gesloten buiten Velaro); meldingen en beheer lopen voortaan mee.


7. Meldingen
Gebruik de bestaande Meldingen-functionaliteit van Velaro (`Message`) — geen aparte notificatiemotor. De contracten-module stuurt zijn gebeurtenissen daar doorheen: aanbod verstuurd/ontvangen (stalling én lease), geaccepteerd/afgewezen, einde proefperiode, opzegtermijn-deadline, einde opschortperiode, einde tijdelijke prijsverlaging, verleng-/her-bevestigmoment, indexerings-/prijsaanpassingsmoment (stalling), en (via het paardprofiel) vaccinatie- en hoefsmidherinneringen die ook de entingsplicht uit het stallingscontract bewaken.

8. Compacte beschikbaarheidskalender (lease)
Een eenvoudige weekweergave maandag t/m zondag op het paardprofiel: per dag zichtbaar wie het paard rijdt/least. Elk actief leasecontract claimt zijn dagen; opgeschorte contracten vervallen tijdelijk uit de weergave. Bij het opstellen van een nieuw leasecontract zijn bezette dagen zichtbaar zodat je niet dubbel boekt. Bewust compact — geen volledige agenda. Voor stallingscontracten is deze kalender niet nodig (één eigenaar, geen dag-indeling).

9. Bouwvolgorde (klein beginnen, uitbreiden)

Aansluiten op bestaand: contract-rollen + contractobject koppelen aan bestaand paardprofiel/stal/eigenaar, met de stal als aanbiedende partij en een familie-discriminator (stalling/lease).
Contract-engine v1 — stalling eerst (beachhead): alleen full pension — looptijd-instellingen (incl. opzegtermijn, borg, indexering, opschorten), stalling-optiebibliotheek (incl. verplichte verzekering/aansprakelijkheid), statusmachine, versionering, PDF genereren.
Aanbod-flow stalling: Journey S1 (opstellen → aanbieden) + Journey S2 (accepteren/afwijzen) + Journey S3 (beheren), via bestaande Meldingen en de bestaande paardeigenaar-weergave.
Contract-engine — lease: deellease-type + lease-optiebibliotheek hergebruiken op dezelfde engine; Journey A + C.
Beheer lease: compacte ma–zo kalender + looptijd-/opzeg-/opschort-/verlengmijlpalen.
Uitbreiden typen: stalling (half pension → weidestalling → opfok → trainingspension → kale huur); lease (full lease → bijrijden → wedstrijd → koopoptie → foklease → bruikleen).
PDF inlezen: eerst upload+koppelen (Journey G), daarna data-extractie.
Matching (lease): listings/zoekfilters als instap vóór het contract (kan parallel).

→ Hierna volgen als losse grote items: facturatie (pensionprijs-, borg- en kostenverdeling-data ligt klaar) en digitale handtekening.

---

Bronnen (onderzoek stallingsovereenkomst):
- Paardencontracten.nl — Pensionstalovereenkomst: https://paardencontracten.nl/contracten/pensionstalovereenkomst/
- FNRS — Belang van een goede (pension)overeenkomst: https://www.fnrs.nl/nieuws/836-belang-van-een-goede-pension-overeenkomst
- felix. — Aansprakelijkheid van een pensionstal: https://felix.nl/blog/aansprakelijkheid-van-een-pensionstal-hoe-zit-dat-juridisch/
- felix. — Opzeggen van de overeenkomst met een pensionklant: https://felix.nl/blog/opzeggen-van-de-overeenkomst-met-een-pensionklant-hoe-doe-je-dat-juridisch-goed/
- Dirkzwager — Risico-aansprakelijkheid art. 6:179 en 6:181 BW: https://www.dirkzwager.nl/kennis/artikelen/de-val-van-een-paard-eigen-schuld-artikel-6101-bw-en-risico-aansprakelijkheid-artikel-6179-en-6181-bw
- Equine Lawyers — Zorgplicht van de pensionstalhouder: https://www.equinelawyers.be/blog/zorgplicht-van-de-pensionstalhouder
