# Neko Architecture Notes

This document explains how to keep the current web prototype flexible while leaving room for a backend and iOS app later.

## Current Architecture

```text
Next.js App Router
  src/app/page.tsx
    owns top-level AppData state
    loads/saves through storage.ts
    renders Landing, Setup, Dashboard

React Components
  components/*
    display UI
    collect user input
    call state/action handlers

Domain Rules
  lib/gameLogic.ts
    calculates progress percent
    resolves pet status
    calculates coins
    updates streaks
    unlocks achievements
    buys/selects skins

Persistence
  lib/storage.ts
    serializes AppData to localStorage
    normalizes missing fields
    recalculates achievements on load

Contracts
  types/index.ts
    Goal
    ProgressRecord
    UserState
    AppData
```

## Boundary Decisions

### UI Layer

Files:

- `src/components/*`
- `src/app/page.tsx`

Responsibilities:

- Layout
- Responsive behavior
- Forms
- Modals
- Tabs
- User feedback text placement
- Button and input states

Avoid:

- Coin rule changes
- Achievement condition changes
- Storage migrations
- Backend assumptions

### Domain Layer

File:

- `src/lib/gameLogic.ts`

Responsibilities:

- Pure product logic
- Coin calculations
- Pet status calculation
- Achievement unlock calculation
- Streak date handling
- Skin purchase and selection rules

Design goal:

This file should remain portable. It should not import React, Next.js, browser APIs, or UI components. That makes it easier to reuse or extract for backend validation or iOS.

### Persistence Layer

File:

- `src/lib/storage.ts`

Responsibilities:

- Current localStorage persistence
- Loading and saving `AppData`
- Normalizing older saved data
- Applying current storage version

Future replacement:

When the backend exists, this file should be replaced or wrapped by an API-backed repository while the UI keeps calling the same app-level actions.

## Recommended Future Shape

When the project grows, move toward:

```text
apps/
  web/                  Next.js app
  ios/                  Future iOS app

packages/
  core/                 Shared product rules and types
  api-client/           Shared client for backend API

services/
  api/                  Backend service
```

Do not move to this structure until there is a real backend or iOS implementation. For the MVP, the current single-app structure is simpler and appropriate.

## Backend Evolution Plan

### Phase 1: Frontend Prototype

Current state:

- localStorage
- single user
- no login
- client-side rules

### Phase 2: API Contract

Add a backend only after these questions are answered:

- What is a user account?
- Can a user have multiple goals?
- Do progress records sync across devices?
- Can users edit/delete records?
- Are achievements trusted client-side or validated server-side?

Suggested API resources:

```text
GET    /api/me
GET    /api/goals
POST   /api/goals
PATCH  /api/goals/:goalId
GET    /api/goals/:goalId/records
POST   /api/goals/:goalId/records
GET    /api/rewards/skins
POST   /api/rewards/skins/:skinId/unlock
POST   /api/rewards/skins/:skinId/select
GET    /api/achievements
```

### Phase 3: Repository Adapter

Introduce an interface:

```ts
type AppDataRepository = {
  load(): Promise<AppData>;
  save(data: AppData): Promise<void>;
};
```

Implementations:

- `LocalStorageAppDataRepository`
- `ApiAppDataRepository`

The UI should not know which implementation is active.

### Phase 4: Server Validation

Move sensitive or shared rules server-side:

- coin earning
- achievement unlocks
- skin purchases
- streak updates

Keep the frontend rule implementation for immediate feedback, but treat the server response as final.

## iOS Evolution Plan

The future iOS app should reuse product thinking, not necessarily UI code.

Recommended path:

1. Keep `types/index.ts` and `gameLogic.ts` clean and portable.
2. Add tests around `gameLogic.ts`.
3. Extract shared rules into `packages/core` when iOS or backend work starts.
4. Let iOS implement its own UI and persistence adapter.
5. Use backend APIs for cross-device state once available.

Possible iOS strategies:

- Native SwiftUI: best platform feel, separate UI implementation.
- React Native: faster sharing for React-oriented teams, still needs native polish.
- WebView wrapper: fastest prototype path, weakest long-term native experience.

Recommendation:

Use the current web app for market validation. Choose SwiftUI or React Native only after the product workflow is stable.

## Frontend / Backend Team Split

### Frontend Team Owns

- Next.js app structure
- Components and responsive UI
- Client-side form validation
- Optimistic UI updates
- Accessibility states
- Client-side repository integration
- API client usage

### Backend Team Owns

- Auth
- Database schema
- API endpoints
- Server-side validation
- Data migrations
- Sync rules
- Rate limits and abuse prevention
- Observability

### Shared Ownership

- Type contracts
- API response shape
- Error model
- Product rule source of truth
- Migration strategy

## Product Rule Ownership

Rules that must be explicitly versioned once backend exists:

- Coin earning
- Daily suggested amount
- Streak policy
- Achievement conditions
- Skin unlock pricing
- Goal completion bonus

Until backend exists, these live in `src/lib/gameLogic.ts`.

## Testing Strategy

Current minimum:

```bash
npm run build
```

Recommended next tests:

- Unit tests for `getProgressPercent`
- Unit tests for `calculateCoins`
- Unit tests for `resolveStreak`
- Unit tests for `getUnlockedAchievements`
- UI smoke test for Landing -> Setup -> Dashboard -> Add Progress

## Data Migration Strategy

`AppData.version` is currently `1`.

When the shape changes:

1. Add a migration function in `storage.ts`.
2. Accept older versions.
3. Normalize to the latest version before rendering UI.
4. Keep migrations deterministic and side-effect free.

Example:

```ts
function migrateAppData(raw: unknown): AppData {
  // Parse unknown data.
  // Fill defaults.
  // Upgrade old versions.
  // Return current AppData.
}
```

## Decision Log

- Keep MVP frontend-only until backend requirements are real.
- Keep domain logic separate from React components.
- Keep localStorage behind `storage.ts`.
- Keep data versioned from the beginning.
- Prefer an adapter approach before introducing backend or iOS.
