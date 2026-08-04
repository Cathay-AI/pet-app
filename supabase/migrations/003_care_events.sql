-- Care events table: tracks every feed/bath/play interaction
create table if not exists public.care_events (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    pet_id uuid not null references public.pets(id) on delete cascade,
    type text not null check (type in ('feed', 'bath', 'play', 'visit_pet')),
    created_at timestamptz not null default now()
);

create index if not exists idx_care_events_user_id on public.care_events(user_id);
create index if not exists idx_care_events_pet_id on public.care_events(pet_id);
create index if not exists idx_care_events_created_at on public.care_events(created_at);

-- RLS
alter table public.care_events enable row level security;

create policy "Users can insert their own care events"
    on public.care_events for insert
    with check (auth.uid() = user_id);

create policy "Authenticated users can read all care events"
    on public.care_events for select
    using (auth.role() = 'authenticated');
