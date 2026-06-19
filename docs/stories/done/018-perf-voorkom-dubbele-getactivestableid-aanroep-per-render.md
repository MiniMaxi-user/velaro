---
issue: 18
title: "perf: voorkom dubbele getActiveStableId() aanroep per render"
status: "Done"
labels: []
url: "https://github.com/MiniMaxi-user/velaro/issues/18"
archivedAt: 2026-06-19
---

# #18 — perf: voorkom dubbele getActiveStableId() aanroep per render

## Probleem

`getActiveStableId(userId)` wordt **2Ã— per paginalading** uitgevoerd:

1. In `Sidebar` (`src/components/Sidebar.tsx:27`) â€” via `Promise.all`
2. In de pagina zelf â€” via `getUserStable()` â†’ `getActiveStable()` â†’ `getActiveStableId()`

Elke aanroep doet 1â€“2 Postgres-queries (cookie valideren + eventueel fallback naar eerste membership). Omdat dit niet gecacht is, herhaalt de database het werk dubbel.

## Oplossing

Wrap `getActiveStableId` met `React.cache()` (zelfde patroon als issue #perf-auth-cache):

```ts
// src/lib/active-stable.ts
import { cache } from 'react'

export const getActiveStableId = cache(async (userId: string): Promise<string | null> => {
  // bestaande implementatie
})
```

Alle aanroepen binnen Ã©Ã©n render-cyclus worden dan automatisch gedupliceeerd.

## Betrokken bestanden

- `src/lib/active-stable.ts`
- `src/components/Sidebar.tsx`
- `src/features/paarden/queries.ts` (`getUserStable`)

## Verwachte winst

1â€“2 Postgres-queries minder per paginalading.
