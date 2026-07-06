-- Add last_visited_at to track when someone else visited/petted this pet
alter table public.pets add column if not exists last_visited_at timestamptz;
