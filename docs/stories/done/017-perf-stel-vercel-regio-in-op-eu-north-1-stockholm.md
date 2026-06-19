---
issue: 17
title: "perf: stel Vercel regio in op eu-north-1 (Stockholm)"
status: "Done"
labels: []
url: "https://github.com/MiniMaxi-user/velaro/issues/17"
archivedAt: 2026-06-19
---

# #17 — perf: stel Vercel regio in op eu-north-1 (Stockholm)

## Probleem

Er is geen `vercel.json` in de repository. Vercel deployt standaard naar `iad1` (Noord-Virginia, VS). De Supabase-database staat in `eu-north-1` (Stockholm). Elke Prisma-query heeft daardoor ~100ms transatlantische latency. Met 8â€“11 queries per pagina en seriÃ«le watervallen loopt dat op tot 400â€“800ms puur aan netwerktijd.

## Oplossing

Voeg een `vercel.json` toe in de projectroot:

```json
{
  "regions": ["arn1"]
}
```

`arn1` is de Vercel-regio voor Stockholm â€” dezelfde locatie als Supabase `eu-north-1`.

## Verwachte winst

~80â€“150ms per seriÃ«le query-ronde minder. Bij 3â€“4 seriÃ«le rondes: 250â€“600ms totaal.
