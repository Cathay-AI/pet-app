-- Migration: 001_neko_auth_pets
-- Description: Core schema — profiles (1:1 with auth.users), pets, care_events

-- ─── Profiles ─────────────────────────────────────────────────────────────────
-- Mirrors auth.users; created automatically on first login via trigger or app code.
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     text not null check (char_length(username) between 1 and 24),
  friend_code  text unique,
  avatar       text check (
    avatar in ('cat_orange','cat_gray','cat_lavender','dog_brown','dog_gray','dog_blue')
  ),
  bio          text check (char_length(bio) <= 160),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists profiles_friend_code_idx on public.profiles (friend_code);

-- ─── Pets ─────────────────────────────────────────────────────────────────────
create table if not exists public.pets (
  id            uuid primary key default gen_random_uuid(),
  -- UNIQUE enforces 1-pet-per-user at the DB level
  user_id       uuid not null unique references public.profiles(id) on delete cascade,
  name          text not null check (char_length(name) between 1 and 24),
  type          text not null check (type in ('cat', 'dog')),
  color         text not null check (color in ('orange', 'brown', 'gray', 'blue', 'mint', 'lavender')),
  hunger        integer not null default 100 check (hunger between 0 and 100),
  cleanliness   integer not null default 100 check (cleanliness between 0 and 100),
  mood          integer not null default 100 check (mood between 0 and 100),
  is_sick       boolean not null default false,
  zero_since_at timestamptz,
  last_fed_at   timestamptz,
  last_bath_at  timestamptz,
  last_play_at  timestamptz,
  updated_at    timestamptz not null default now()
);

create index if not exists pets_user_idx           on public.pets (user_id);
create index if not exists pets_public_rank_idx    on public.pets (is_sick, hunger, cleanliness, mood, updated_at desc);

-- ─── Care events ──────────────────────────────────────────────────────────────
create table if not exists public.care_events (
  id         uuid primary key default gen_random_uuid(),
  pet_id     uuid not null references public.pets(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  type       text not null check (type in ('feed', 'bath', 'clean', 'play', 'treat')),
  metadata   jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists care_events_user_created_idx on public.care_events (user_id, created_at desc);
create index if not exists care_events_pet_created_idx  on public.care_events (pet_id, created_at desc);

-- ─── Auto-update updated_at ───────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists pets_set_updated_at on public.pets;
create trigger pets_set_updated_at
  before update on public.pets
  for each row execute function public.set_updated_at();

-- ─── Row Level Security ───────────────────────────────────────────────────────
alter table public.profiles   enable row level security;
alter table public.pets       enable row level security;
alter table public.care_events enable row level security;

-- profiles
drop policy if exists "profiles are publicly readable" on public.profiles;
create policy "profiles are publicly readable"
  on public.profiles for select using (true);

drop policy if exists "users insert own profile" on public.profiles;
create policy "users insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile"
  on public.profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);

-- pets
drop policy if exists "pets are publicly readable" on public.pets;
create policy "pets are publicly readable"
  on public.pets for select using (true);

drop policy if exists "users insert own pet" on public.pets;
create policy "users insert own pet"
  on public.pets for insert with check (auth.uid() = user_id);

drop policy if exists "users update own pet" on public.pets;
create policy "users update own pet"
  on public.pets for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- care_events
drop policy if exists "users read own care events" on public.care_events;
create policy "users read own care events"
  on public.care_events for select using (auth.uid() = user_id);

drop policy if exists "users insert own care events" on public.care_events;
create policy "users insert own care events"
  on public.care_events for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.pets
      where pets.id = care_events.pet_id
        and pets.user_id = auth.uid()
    )
  );
