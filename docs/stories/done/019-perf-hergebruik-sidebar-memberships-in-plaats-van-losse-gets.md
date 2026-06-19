---
issue: 19
title: "perf: hergebruik Sidebar-memberships in plaats van losse getStableRole() query"
status: "Done"
labels: []
url: "https://github.com/MiniMaxi-user/velaro/issues/19"
archivedAt: 2026-06-19
---

# #19 — perf: hergebruik Sidebar-memberships in plaats van losse getStableRole() query

## Probleem

`Sidebar` laadt al alle memberships van de gebruiker op (`stableMember.findMany` met `include: { stable }`). Vervolgens roepen pagina's zoals `/stal` en `/stal/leden` toch nog apart `getStableRole(userId, stableId)` aan (`src/lib/auth/authorization.ts:27`), wat een extra `stableMember.findUnique` doet voor data die al beschikbaar is.

Hetzelfde geldt voor `canCreateStable()` (`authorization.ts:13`): die doet een `user.findUnique` (dubbel met Sidebar) Ã©n een `stableMember.count` (subset van de al-geladen memberships).

## Oplossing

Na het oplossen van de `React.cache()`-issues (zie andere performance stories) kunnen deze afleidingen puur in geheugen:

```ts
// De role is al bekend via de gecachte memberships
const memberships = await getMemberships(userId) // gecacht
const role = memberships.find(m => m.stableId === stableId)?.role ?? null

// canCreateStable: tel OWNER-memberships uit geheugen
const ownerCount = memberships.filter(m => m.role === 'OWNER').length
```

Of: vervang `getStableRole` door een variant die de gecachte memberships accepteert als parameter.

## Betrokken bestanden

- `src/lib/auth/authorization.ts`
- `src/app/(app)/stal/page.tsx`
- `src/app/(app)/stal/leden/page.tsx`
- `src/components/Sidebar.tsx`

## Verwachte winst

1â€“3 Postgres-queries minder per paginalading. Minder onderhoudsdruk (Ã©Ã©n bron van waarheid voor membership-data).

## Opmerking

Dit is het meest ingrijpend qua refactoring â€” goed om als laatste te doen, nadat de `React.cache()`-laag er ligt.
