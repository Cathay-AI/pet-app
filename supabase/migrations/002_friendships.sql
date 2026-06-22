-- Migration: 002_friendships
-- Description: Friendships table linking profiles

-- ─── Friendships ──────────────────────────────────────────────────────────────
create table if not exists public.friendships (
  id           uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status       text not null default 'pending'
               check (status in ('pending', 'accepted', 'declined')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- One pair can only have one friendship row
  constraint friendships_pair_unique unique (requester_id, addressee_id),
  -- Prevent self-friendship
  constraint friendships_no_self check (requester_id <> addressee_id)
);

create index if not exists friendships_requester_idx on public.friendships (requester_id);
create index if not exists friendships_addressee_idx on public.friendships (addressee_id);
create index if not exists friendships_status_idx    on public.friendships (status);

-- Auto-update updated_at (reuse the function from 001)
drop trigger if exists friendships_set_updated_at on public.friendships;
create trigger friendships_set_updated_at
  before update on public.friendships
  for each row execute function public.set_updated_at();

-- ─── Row Level Security ───────────────────────────────────────────────────────
alter table public.friendships enable row level security;

drop policy if exists "users read own friendships" on public.friendships;
create policy "users read own friendships"
  on public.friendships for select
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

drop policy if exists "users insert friend request" on public.friendships;
create policy "users insert friend request"
  on public.friendships for insert
  with check (auth.uid() = requester_id);

drop policy if exists "addressee can update friendship" on public.friendships;
create policy "addressee can update friendship"
  on public.friendships for update
  using (auth.uid() = addressee_id)
  with check (auth.uid() = addressee_id);

drop policy if exists "users delete own friendships" on public.friendships;
create policy "users delete own friendships"
  on public.friendships for delete
  using (auth.uid() = requester_id or auth.uid() = addressee_id);
