---
issue: 16
title: "perf: dedupleer auth.getUser() met React.cache()"
status: "Done"
labels: []
url: "https://github.com/MiniMaxi-user/velaro/issues/16"
archivedAt: 2026-06-19
---

# #16 — perf: dedupleer auth.getUser() met React.cache()

## Probleem

`supabase.auth.getUser()` wordt **4Ã— per paginalading** aangeroepen â€” in `AppLayout`, `Sidebar`, `Topbar` Ã©n de pagina zelf. Elke aanroep doet een apart netwerkverzoek naar de Supabase Auth API (Stockholm). Op een serverless omgeving telt dit snel op tot 100â€“300ms puur voor authenticatie.

Zelfde patroon: `prisma.user.findUnique` wordt 3Ã— opgehaald per render (Sidebar, Topbar, `canCreateStable`).

## Oplossing

Maak een gecachte helper met `React.cache()`:

```ts
// src/lib/auth/session.ts
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export const getAuthUser = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
})

export const getDbUser = cache(async (userId: string) => {
  return prisma.user.findUnique({ where: { id: userId } })
})
```

Alle componenten (layout, Sidebar, Topbar, pagina's) roepen deze helpers aan â€” Next.js dedupliceert binnen Ã©Ã©n render-cyclus automatisch.

## Betrokken bestanden

- `src/app/(app)/layout.tsx`
- `src/components/Sidebar.tsx`
- `src/components/Topbar.tsx`
- Alle pagina's in `src/app/(app)/`
- `src/lib/auth/authorization.ts` (`canCreateStable`)

## Verwachte winst

~100â€“300ms per paginalading minder.
