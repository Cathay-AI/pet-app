# Neko

Neko is a frontend prototype for a "virtual pet x goal achievement" product. The MVP focuses on one savings goal: users create a goal, add daily progress, earn coins, unlock pet skins, and see achievements.

Live app: [https://pet-app-lyart.vercel.app](https://pet-app-lyart.vercel.app)

This project is intentionally frontend-only today. The code is structured so the product can later grow into a backend-backed web app and an iOS app without rewriting the core product rules.

## Current MVP Scope

Included:

- Next.js App Router frontend
- React + TypeScript
- Tailwind CSS
- Single-user localStorage persistence
- One savings goal
- Manual progress records
- Coin rewards
- Pet status logic
- Reward shop
- Achievements
- Mobile-friendly responsive UI

Not included:

- Login
- Backend API
- Database
- AI chat
- Voice input
- Native iOS implementation
- Multi-user social features

## Quick Start

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

Production build:

```bash
npm run build
```

The build script uses webpack:

```json
"build": "next build --webpack"
```

This avoids a local Turbopack sandbox issue observed during development. Vercel can still deploy the app directly from this repository.

## Project Structure

```text
src/
  app/
    page.tsx              App entry, view switching, top-level state
    layout.tsx            Metadata and root HTML layout
    globals.css           Tailwind globals and shared utility classes
    icon.svg              App favicon

  components/
    LandingPage.tsx       Product intro and CTA
    GoalSetup.tsx         Savings goal form
    Dashboard.tsx         Main product screen and mobile panel tabs
    PetCard.tsx           Pet display, status, and feedback
    ProgressModal.tsx     Add progress bottom-sheet/modal
    RewardShop.tsx        Skin unlock/apply UI
    AchievementList.tsx   Achievement display and unlock toast

  lib/
    constants.ts          Static game data and initial state
    gameLogic.ts          Pure product/game rules
    storage.ts            localStorage repository for current MVP

  types/
    index.ts              Shared TypeScript data model

docs/
  ARCHITECTURE.md         Longer-term architecture and team split notes
```

## Core Data Model

The product state is represented by `AppData`:

```ts
type AppData = {
  version: 1;
  goal: Goal | null;
  records: ProgressRecord[];
  userState: UserState;
};
```

The `version` field exists so future storage migrations can be handled safely.

## Architectural Rules

Keep these boundaries clear:

- `components/` owns UI only.
- `lib/gameLogic.ts` owns product rules and should stay framework-independent.
- `lib/storage.ts` owns persistence for the current localStorage MVP.
- `types/` owns shared data contracts.
- `constants.ts` owns static skins, achievements, daily tasks, and initial state.

Avoid putting business rules directly inside React components. If a rule affects coins, streak, achievements, pet status, storage shape, or goal progress, put it in `lib/gameLogic.ts` or a future domain module.

## Future Backend Split

When a backend is introduced, keep the frontend contract stable:

```text
UI components
  -> app state/actions
    -> AppDataRepository interface
      -> localStorage implementation today
      -> API implementation later
```

Recommended backend ownership:

- Auth and accounts
- Database schema
- Goal CRUD
- Progress record CRUD
- Server-side achievement validation
- Sync and conflict handling
- Analytics/event tracking

Recommended frontend ownership:

- UI screens and interaction states
- Form validation and user guidance
- Optimistic updates
- Offline/local cache behavior
- Responsive web experience
- Shared TypeScript contracts with backend

## Future iOS App Direction

The current Next.js UI should not be treated as the future iOS codebase. Instead, preserve reusable product concepts:

- Reuse the data model shape where practical.
- Keep product rules in portable TypeScript modules while the web app is the only client.
- Later, extract shared contracts and game rules into a package such as `packages/core`.
- Build the iOS UI natively or with React Native, depending on product and team constraints.
- iOS persistence should use an adapter equivalent to `storage.ts`, not direct localStorage logic.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the suggested evolution path.

## Development Workflow

Before changing behavior:

1. Identify whether the change is UI, product rule, persistence, or data contract.
2. Put the change in the matching layer.
3. Run `npm run build`.
4. For UI/RWD changes, test at least:
   - mobile: `390x844`
   - desktop: `1280x800`
5. Check browser console for runtime errors.

## Deployment

This app is Vercel-ready:

- Framework: Next.js
- Build command: `npm run build`
- Output: Next.js default
- Environment variables: none required for MVP
- Production URL: [https://pet-app-lyart.vercel.app](https://pet-app-lyart.vercel.app)

Because data is stored in localStorage, deployed users only see data on the same browser/device. This is expected for the MVP.

## Known Limitations

- localStorage is not a multi-device sync solution.
- Current achievements are rule-based and client-side.
- No automated test suite exists yet.
- No backend validation exists yet.
- No iOS app exists yet.

## Suggested Next Refactors

When the product moves beyond prototype:

1. Add a repository interface for app data persistence.
2. Add unit tests for `gameLogic.ts`.
3. Add schema migration helpers for `AppData.version`.
4. Extract shared contracts into a package if backend or iOS work begins.
5. Add API routes only after backend requirements are concrete.
