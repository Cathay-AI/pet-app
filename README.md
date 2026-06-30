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
```

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
