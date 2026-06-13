---
name: velaro-githubconnector
description: Beheert het Velaro GitHub-projectbord en de gekoppelde issues (items ophalen, aanmaken, status/kolom verzetten, issue-body bewerken, labels beheren) via de gh CLI. Eén bron van waarheid voor de bord-ID's. Gebruik dit bij elke interactie met het projectbord.
---

# Velaro GitHub-projectbord connector

Eén bron van waarheid voor het beheren van het Velaro-projectbord. Gebruik deze
recepten in plaats van bord-ID's te dupliceren of zelf op te zoeken.

Bord: https://github.com/users/MiniMaxi-user/projects/2/views/1

## Vaste bord-ID's

| Naam | Waarde |
|------|--------|
| Owner | `MiniMaxi-user` |
| Projectnummer | `2` |
| `PROJECT_ID` | `PVT_kwHOBJnhiM4BaXsM` |
| `STATUS_FIELD` (Status, single-select) | `PVTSSF_lAHOBJnhiM4BaXsMzhVPyiQ` |

Status-optie-ID's:

| Status | Optie-ID |
|--------|----------|
| Backlog | `f75ad846` |
| Ready | `61e4505c` |
| In progress | `47fc9ee4` |
| In review | `df73e18b` |
| Done | `98236657` |

## Authenticatie

Alle bewerkingen lopen via de GitHub CLI (`gh`). Vereist een ingelogde sessie met
project-scope:

```
gh auth login -s project
```

Er is geen MCP/connector voor dit bord; uitsluitend `gh` (via Bash/PowerShell).

## Recepten

### Items + status ophalen (JSON)

```
gh project item-list 2 --owner MiniMaxi-user --format json -L 100
```

Elk item heeft een `id` (begint met `PVTI_`), een `status` (de Status-veldwaarde,
bijv. `"Ready"`) en een `content`-object. Bij een **echt issue** bevat `content`:
`type: "Issue"`, `number`, `title`, `body`, `url` en `repository`. Bij een
**draft-item** is er geen `number`/`url` en (belangrijk) géén label.

Een item dat van een issue komt heeft daarnaast een top-level `labels`-lijst met
labelnamen — maar **alleen als er labels zijn** (anders ontbreekt het veld). Lees het
dus defensief: `i.get('labels') or []`.

> **Let op:** `item-list` pagineert standaard op 30 items. Het bord heeft er meer,
> dus geef altijd `-L 100` (of hoger) mee — anders mis je mogelijk items.

> **Labels zitten op het issue, niet op het bord-item.** Alleen items van type
> `Issue` kunnen labels hebben; draft-items niet. Label- en body-bewerkingen lopen
> daarom via `gh issue …` op `content.number`, niet via `gh project …`.

### Filteren op kolom + label (bijv. Backlog + label `refine`)

```
gh project item-list 2 --owner MiniMaxi-user --format json -L 100 | python -c "import json,sys; d=json.load(sys.stdin); [print(i['id'], '| #'+str(i['content'].get('number')), '|', i['content'].get('title')) for i in d['items'] if i.get('status')=='Backlog' and 'refine' in (i.get('labels') or [])]"
```

Onthoud per item het bord-`id` (`PVTI_`, voor statuswijziging) én `content.number`
(voor body-/labelbewerking).

### Filteren op status (bijv. de oudste 'Ready')

Filter de JSON op `status == "Ready"` en pak het item-ID. Voorbeeld:

```
gh project item-list 2 --owner MiniMaxi-user --format json -L 100 | python -c "import json,sys; d=json.load(sys.stdin); [print(i['id'], i.get('createdAt','?'), '|', i['content'].get('title','?')) for i in d['items'] if i.get('status')=='Ready']"
```

### Een item (PBI / voorstel) aanmaken

`gh project item-create` kent **geen** `--body-file`; alleen `--body`. Lees de
markdown-inhoud in via command-substitution:

```
gh project item-create 2 --owner MiniMaxi-user \
  --title "<Type>: <korte titel>" \
  --body "$(cat <pad-naar-md-bestand>)"
```

Het aangemaakte item-ID (begint met `PVTI_`) komt terug met `--format json` —
nodig als je de status direct daarna wilt verzetten.

### Status van een item verzetten

```
gh project item-edit \
  --project-id PVT_kwHOBJnhiM4BaXsM \
  --id <ITEM_ID> \
  --field-id PVTSSF_lAHOBJnhiM4BaXsMzhVPyiQ \
  --single-select-option-id <OPTIE_ID>
```

Vervang `<OPTIE_ID>` door de optie-ID uit de tabel hierboven
(Ready `61e4505c`, In progress `47fc9ee4`, In review `df73e18b`).

### Een issue lezen (titel, body, comments)

```
gh issue view <NUMMER> --repo MiniMaxi-user/velaro --json number,title,body,labels,comments
```

De `body` uit `item-list` is de huidige beschrijving; `comments` zit alleen in
`gh issue view` en is vaak nodig voor de context bij refinen.

### Een issue-body / titel bijwerken

`gh issue edit` ondersteunt wél `--body-file` (anders dan `item-create`). Schrijf de
verbeterde markdown naar een tijdelijk bestand en update:

```
gh issue edit <NUMMER> --repo MiniMaxi-user/velaro \
  --title "<nieuwe titel>" \
  --body-file <pad-naar-md-bestand>
```

### Labels beheren

```
gh issue edit <NUMMER> --repo MiniMaxi-user/velaro --add-label "<label>"
gh issue edit <NUMMER> --repo MiniMaxi-user/velaro --remove-label "<label>"
```

## Onderhoud

Wijzigen de veld- of optie-ID's op het bord (bijv. een nieuwe statuskolom)? Werk
dan alleen de tabellen hierboven bij — de agents en commands lezen deze skill, dus
één plek aanpassen volstaat. De ID's opnieuw ophalen kan met:

```
gh project field-list 2 --owner MiniMaxi-user --format json
```
