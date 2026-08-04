-- Update the care_events type constraint to include 'visit_pet'
-- The original 001 migration created care_events with types ('feed','bath','clean','play','treat').
-- 003 uses CREATE TABLE IF NOT EXISTS which won't update the existing constraint.
-- This ALTER ensures 'visit_pet' is accepted on existing databases.

alter table public.care_events
  drop constraint if exists care_events_type_check;

alter table public.care_events
  add constraint care_events_type_check
  check (type in ('feed', 'bath', 'clean', 'play', 'treat', 'visit_pet'));
