-- Migration: auth_login
-- Branch: feature/auth-login
-- Description: Create users and refresh_tokens tables for JWT-based auth

-- ─── Users ───────────────────────────────────────────────────────────────────
create table if not exists public.users (
  id              uuid primary key default gen_random_uuid(),
  email           text not null unique,
  username        text not null check (char_length(username) between 1 and 24),
  hashed_password text not null,
  is_active       boolean not null default true,
  is_verified     boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists users_email_idx on public.users (email);

-- ─── Refresh tokens ───────────────────────────────────────────────────────────
create table if not exists public.refresh_tokens (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  token      text not null unique,
  expires_at timestamptz not null,
  revoked    boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists refresh_tokens_user_idx  on public.refresh_tokens (user_id);
create index if not exists refresh_tokens_token_idx on public.refresh_tokens (token);

-- ─── Auto-update updated_at ───────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();
