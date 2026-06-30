# Neko

Neko is a pixel virtual pet app built around one product principle:

> Real time creates virtual responsibility.

Users draw one cat or dog, care for it over real time, and see the result reflected in a public health leaderboard.

## Stack

| Layer    | Technology                                    |
|----------|-----------------------------------------------|
| Frontend | Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS |
| Backend  | FastAPI · SQLAlchemy (async) · Python 3.12    |
| Auth     | Supabase Auth (JWT) · magic-link email        |
| Database | Supabase Postgres                             |
| Runtime  | uv (Python) · npm (Node)                      |

---

## Prerequisites

- **Python 3.12+** with [`uv`](https://github.com/astral-sh/uv) installed
- **Node.js 20+** with `npm`
- A [Supabase](https://supabase.com) project (free tier is fine)

---

## Environment Setup

### Backend (`backend/.env`)

Copy the example and fill in your Supabase credentials:

```bash
cp backend/.env.example backend/.env
```

```env
# Supabase Postgres – use Transaction pooler URL for production
DATABASE_URL=postgresql+asyncpg://postgres.[ref]:[password]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres

# Supabase Dashboard > Settings > API
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_ANON_KEY=<anon key>

# Supabase Dashboard > Settings > API > JWT Settings
SUPABASE_JWT_SECRET=<jwt secret>

# App
APP_ENV=development
APP_CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
FRONTEND_URL=http://localhost:3000
```

### Frontend (`frontend/.env.local`)

```bash
cp frontend/.env.example frontend/.env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000
```

`NEXT_PUBLIC_BACKEND_URL` intentionally points to localhost for local development.
In production or Vercel preview deployments, set it to the public backend API
origin instead, for example `https://api.example.com`. If it is missing in a
production build, the frontend will not fall back to `localhost:8000`, because
that would make deployed users call their own machines.

`NEXT_PUBLIC_FRONTEND_URL` is used for auth redirects such as password reset.
Keep it as `http://localhost:3000` locally and set it to the Vercel deployment
origin for preview/production environments.

---

## Database Migrations

Run the SQL migrations against your Supabase project (Supabase Dashboard → SQL Editor):

```text
supabase/migrations/001_neko_auth_pets.sql   – profiles, pets tables
supabase/migrations/002_friendships.sql      – friendships table
```

---

## Running Locally

### 1. Backend

```bash
cd backend
uv run uvicorn app.main:app --reload
```

API available at: `http://localhost:8000`  
Interactive docs: `http://localhost:8000/docs`

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

App available at: `http://localhost:3000`

> **Note:** The dev server uses `--webpack` to avoid Turbopack instability (`next dev --webpack`).

### Localhost Contract

Local development remains split by service:

| Service | Directory | Command | URL |
|---------|-----------|---------|-----|
| Backend | `backend/` | `uv run uvicorn app.main:app --reload` | `http://localhost:8000` |
| Frontend | `frontend/` | `npm run dev` | `http://localhost:3000` |

This is the expected setup for developers. Do not point deployed Vercel
environments at `http://localhost:8000`; use a public backend URL instead.

---

## Vercel Deployment

This repository is a monorepo:

```text
backend/   FastAPI service
frontend/  Next.js app deployed by Vercel
```

Vercel should deploy the frontend only. The repo-level `vercel.json` keeps the
Vercel project root at the repository root while explicitly running the frontend
install and build:

```bash
npm --prefix frontend ci
npm --prefix frontend run build
```

The output directory is `frontend/.next`.

### Required Vercel Environment Variables

Set these in the Vercel project for preview and production:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
NEXT_PUBLIC_BACKEND_URL=https://<public-backend-origin>
NEXT_PUBLIC_FRONTEND_URL=https://<vercel-app-origin>
```

The backend must allow the deployed frontend origin in `APP_CORS_ORIGINS`.

### Previous Dev Branch Failure

The `dev` branch had been restructured into `backend/` and `frontend/`, but the
Vercel deployment was still building from the repository root. Vercel ran
`next build` at root and failed with:

```text
Couldn't find any `pages` or `app` directory. Please create one under the project root
```

The fix is to make Vercel install and build from `frontend/`, and to keep
production frontend builds from silently falling back to `http://localhost:8000`.

---

## Current Implementation Architecture

```mermaid
flowchart LR
  user[Browser] --> frontend[Vercel Frontend\nNext.js app]
  frontend --> supabaseAuth[Supabase Auth\nJWT session]
  frontend --> backend[Render Backend\nFastAPI API]
  backend --> supabaseAuth
  backend --> postgres[Supabase Postgres\nprofiles pets friendships]

  localFrontend[Local Frontend\nlocalhost:3000] --> localBackend[Local Backend\nlocalhost:8000]
  localBackend --> postgres
```

The deployed frontend and backend are separate services:

| Surface | Runtime | Current URL |
|---------|---------|-------------|
| PR frontend preview | Vercel / Next.js | `https://pet-app-git-codex-fix-dev-vercel-deploy-cathay-aids.vercel.app` |
| Backend API | Render / FastAPI | `https://pet-app-backend-9ea9.onrender.com` |
| Backend health check | Render / FastAPI | `https://pet-app-backend-9ea9.onrender.com/health` |
| Supabase project | Supabase Auth + Postgres | `https://fstpizpfknqbztowgyzw.supabase.co` |

Runtime responsibilities:

| Layer | Responsibility |
|-------|----------------|
| Frontend | UI, Supabase browser session, optimistic pet interactions |
| Backend | Authenticated API, profile setup, pet persistence, leaderboard, friends, server-side pet decay |
| Supabase Auth | User identity and JWT issuance |
| Supabase Postgres | Persistent `profiles`, `pets`, and `friendships` tables |

Environment ownership:

| Platform | Required keys |
|----------|---------------|
| Vercel frontend | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_BACKEND_URL`, `NEXT_PUBLIC_FRONTEND_URL` |
| Render backend | `APP_ENV`, `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_JWT_SECRET`, `APP_CORS_ORIGINS`, `FRONTEND_URL`, `PYTHON_VERSION` |
| Local frontend | Same `NEXT_PUBLIC_*` keys, with localhost URLs |
| Local backend | Same backend keys, with localhost CORS/frontend URLs |

No secret values should be committed to this repository. Use Vercel and Render
environment variables for deployed services, and `.env.local` / `.env` files for
local development.

---

## Routes

```
/               Entry router – redirects based on auth state
/login          Magic-link login
/gacha          First pet draw and naming
/home           Pet care screen
/leaderboard    Public health ranking
/settings       Profile and account settings
/rooms          Friend rooms (coming soon)
/forgot-password  Password recovery
/reset-password   Password reset
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/api/v1/auth/me` | Current user info |
| POST | `/api/v1/auth/profile/setup` | First-time profile setup |
| GET | `/api/v1/pets/me` | Get my pet |
| PUT | `/api/v1/pets/me` | Update pet state |
| GET | `/api/v1/pets/leaderboard` | Public leaderboard |
| GET | `/api/v1/users/me/profile` | My profile |
| PATCH | `/api/v1/users/me/profile` | Update profile |
| GET | `/api/v1/users/me/friends` | Friend list |
| GET | `/api/v1/users/me/friends/pending` | Pending requests |
| POST | `/api/v1/users/me/friends` | Send friend request |
| PATCH | `/api/v1/users/me/friends/{id}` | Accept/decline request |
| DELETE | `/api/v1/users/me/friends/{id}` | Remove friend |
| GET | `/api/v1/users/search` | Search by friend code |

---

## Project Structure

```
pet-app/
├── backend/
│   ├── app/
│   │   ├── auth/          # Auth router & service
│   │   ├── core/          # Config, DB, security, dependencies
│   │   ├── pets/          # Pet model, router, service, schemas
│   │   ├── users/         # Profile, friendship, router, service
│   │   ├── main.py        # FastAPI app entry point
│   │   └── seed.py        # DB seed script
│   ├── tests/
│   ├── .env.example
│   └── pyproject.toml
│
├── frontend/
│   ├── src/
│   │   ├── app/           # Next.js App Router pages
│   │   ├── components/    # Shared UI components
│   │   ├── lib/           # Game logic, API client, Supabase
│   │   └── types/         # TypeScript type definitions
│   ├── .env.example
│   └── package.json
│
├── supabase/
│   └── migrations/        # SQL schema migrations
│
└── docs/
```

---

## Game Logic

Neko does not run background jobs. Pet state is computed on-read:

```
last saved state + real elapsed time → current hunger / cleanliness / mood
```

`backend/app/pets/service.py` handles decay calculation server-side.  
`frontend/src/lib/gameLogic.ts` mirrors the same logic for optimistic UI updates.

---

## Validation

Before opening a PR:

```bash
# Backend tests
cd backend
uv run pytest

# Frontend build check (uses webpack)
cd frontend
npm run build
```

For UI changes, verify:

- `/gacha` draw and naming flow
- `/home` care actions and stat decay
- `/leaderboard` public score rows
- `/settings` profile update

---

## Docs

- [`docs/JOSH_HANDOVER.md`](docs/JOSH_HANDOVER.md) — handover notes
