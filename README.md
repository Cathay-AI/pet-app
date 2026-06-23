# Neko

Neko is a pixel virtual pet app built around one product principle:

> Real time creates virtual responsibility.

Users draw one cat or dog, care for it over real time, and see the result reflected in a public health leaderboard.

## Stack

- Next.js App Router
- React + TypeScript
- Tailwind CSS
- Supabase-ready Auth + Postgres persistence
- localStorage fallback for local demo mode

## Quick Start

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

Deployed app:

```text
https://pet-app-cathay-aids.vercel.app/gacha
```

Production build:

```bash
npm run build
```

The build script uses webpack:

```json
"build": "next build --webpack"
```

## Supabase Setup

The app works without Supabase by falling back to localStorage. To enable login and shared leaderboard data:

1. Create a Supabase project.
2. Run the SQL in `supabase/migrations/001_neko_auth_pets.sql`.
3. Copy `.env.example` to `.env.local`.
4. Fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

5. Restart `npm run dev`.

When Supabase is configured, `/login` sends a magic-link email. Authenticated users store `profiles` and `pets` in Supabase. Without those env vars, the app displays local mode and keeps using browser storage.

## Current Routes

```text
/             Entry router
/login        Magic-link login
/gacha        First pet draw and naming
/home         Pet care screen
/leaderboard  Public health ranking
```

## Project Structure

```text
src/
  app/
    gacha/page.tsx
    home/page.tsx
    leaderboard/page.tsx
    login/page.tsx
    page.tsx

  components/
    AuthStatus.tsx
    BottomNav.tsx
    PetCanvas.tsx
    StatusBar.tsx

  lib/
    constants.ts
    gameLogic.ts
    nekoRepository.ts
    storage.ts
    supabase/
      browser.ts
      config.ts

  types/
    index.ts

docs/
  PRODUCT_PRINCIPLE.md

supabase/
  migrations/
    001_neko_auth_pets.sql
```

## Persistence Model

`nekoRepository.ts` is the persistence boundary:

- Supabase configured + authenticated: read/write Supabase.
- Supabase missing or unauthenticated local mode: read/write localStorage.

The UI should not directly decide where data lives.

## Product Rule

Neko does not update every pet in the database on a timer. It stores the last known values and timestamps, then computes real-time decay when data is read or acted on. This keeps the core loop accurate without background jobs:

```text
last state + real elapsed time -> current hunger / cleanliness / mood
```

## Validation

Before opening a PR:

```bash
npm run build
```

For UI changes, verify:

- `/gacha` draw and naming
- `/home` care actions and countdown
- `/leaderboard` public score rows
- localStorage fallback when Supabase env vars are missing
