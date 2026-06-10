# Velaro — Project Guide voor Claude Code

> Dit bestand is leidend. Lees het bij elke sessie. Houd je aan de kaders hieronder
> en verzin geen eigen stack-, map- of stijlkeuzes. Wijk je af, meld het en vraag eerst.

## Wat we bouwen (MVP)

Velaro is een open platform voor de hippische sector. We beginnen **klein en gericht**:
een SaaS voor **pensionstallen** rond één centraal **paardenprofiel**.

Beachhead-doelgroep: **pensionstallen** (terugkerende omzet, veel paarden onder één dak).
Géén marketplace, géén publieke API, géén AI-modules in de MVP. Die komen later.

De drie soorten gebruikers in de MVP:
- **Staleigenaar** — beheert de stal en alle paarden erin.
- **Stalmedewerker** — werkt mee op de stal, beperktere rechten.
- **Paardeneigenaar** — ziet (alleen) het profiel van zijn/haar eigen paard(en).

## Tech-stack (vastgelegd — niet wijzigen zonder overleg)

- **Next.js** (App Router) + **TypeScript**
- **Supabase** — Auth én Postgres (één dienst)
- **Prisma** — ORM op de Postgres-database
- **Tailwind CSS** — styling
- **Vercel** — hosting/deploy
- Package manager: **pnpm** (val terug op npm als pnpm niet beschikbaar is)

### Belangrijk onderscheid: authenticatie vs. autorisatie
- **Authenticatie** ("wie ben je") = Supabase Auth. Niet zelf bouwen.
- **Autorisatie** ("mag deze gebruiker dit paard zien/bewerken") = **wij**, in ons eigen
  datamodel en in de app-laag. Dit is kernlogica en wordt niet uitbesteed.
- Elke app-`User`-rij spiegelt een Supabase-auth-user: `User.id` == `auth.users.id` (uuid).

## Mapstructuur (feature-based, geen losse packages)

Eén Next.js-app. Modulair op **mapniveau**, niet op package-niveau. Geen monorepo.
Abstraheer pas als een patroon zich twee keer herhaalt — niet vooraf.

```
src/
  app/                # routes (App Router)
    (auth)/           # login, wachtwoord vergeten
    (app)/            # ingelogde omgeving
      stal/           # stal-dashboard, overzicht paarden
      paarden/        # paardenprofiel (CRUD)
  features/           # domeinlogica per feature
    auth/
    stal/
    paarden/
  components/         # herbruikbare UI (zie design system)
  lib/                # supabase client, prisma client, helpers
    supabase/
    auth/             # autorisatie-helpers (rolcontrole)
  styles/             # globals.css met design tokens
prisma/
  schema.prisma
```

## Naamgevingsconventies

- Componenten: `PascalCase` (bestand = componentnaam).
- Hooks/helpers/functies: `camelCase`.
- Database/Prisma-modellen: enkelvoud, `PascalCase` (`Horse`, `Stable`).
- Route-mappen: Nederlands, lowercase (`paarden`, `stal`) — UI is Nederlandstalig.
- UI-teksten: **Nederlands**.

## Design system (bron: velaro-designsystem repo)

De stijl is een **premium, donker thema met goud/amber accenten**, kaart-gebaseerd,
rustig en exclusief van uitstraling.

**Bron van waarheid voor tokens:** `src/styles/index.css` in de
`velaro-designsystem` repo. Lees dat bestand en **port de tokens 1-op-1** naar
`src/styles/globals.css` (CSS-variabelen) + `tailwind.config.ts`. Verzin geen
nieuwe kleuren, fonts of spacing — neem over wat er staat.

Bevestigde kernkleuren (controleer/aanvul vanuit de CSS):
- Goud (primair accent): `#D8BD71`
- Donker-goud: `#BEA256`
- Perzik/amber: `#F2AD75`
- Donkere achtergrond: rond `#1e2327`
- Gedempte tekst: via `--muted`

Bestaande class-conventies om aan te houden (uit het design system):
`btn-primary` (+ `btn-primary--full`), `btn-ghost`, `input`, `form-group`,
`form-label`, `form-row`, `form-link`, `auth-layout`, `auth-card`, `auth-logo`,
`auth-heading`, `auth-sub`, `auth-divider`, `auth-footer`, `hero-tag`, `label`,
en de kaartpatronen (`*-card`).

De `login.html` uit het design system is het referentiepunt voor de auth-schermen.
Logo: `velaro_logo.png`.

## Bouwvolgorde (van fundament naar feature — strikt aanhouden)

1. **Datamodel + auth** — Prisma-schema (zie `prisma/schema.prisma`), Supabase Auth,
   rollen/autorisatie-helpers. Login- en wachtwoord-vergeten-scherm in de huisstijl.
2. **Centraal paardenprofiel (CRUD)** — paard aanmaken, bekijken, bewerken.
3. **Gezondheidsregistratie** op het profiel (vaccinaties, ontworming, bezoeken).
4. **Stalbewoners-overzicht + planning** (dashboard + dagelijkse taken/agenda).
5. **Eigenaarscommunicatie + gedeeld profiel** (eigenaar ziet zijn paard).
6. **Facturatie** (maandelijkse stalling + extra's). Bewust als laatste.

> Buiten de MVP, niet bouwen tot afgesproken: open API, marketplace, AI-modules,
> integraties (KNHS/FEI), wearables.

## Werkwijze met Claude Code

- **Plan eerst, code daarna.** Bij elke nieuwe stap of feature: lever eerst een kort
  plan (welke bestanden, welk datamodel-effect, welke routes). Wacht op akkoord.
- **Werk per stap uit de bouwvolgorde.** Niet vooruitlopen op latere stappen.
- **Fundament-stappen (1 en 2) streng**: geen schema-wijzigingen zonder overleg.
- Houd PR's/wijzigingen klein en review-baar.
- Geen `localStorage`-afhankelijke kernlogica; staat hoort in DB of server.
- Bij twijfel over scope of stijl: vraag, niet aannemen.
