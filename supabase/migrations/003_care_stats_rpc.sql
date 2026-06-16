create or replace function public.get_care_stats(target_date date default current_date)
returns jsonb
language sql
stable
security definer
as $$
  with day_events as (
    select *
    from public.care_events
    where created_at::date = target_date
  ),
  summary as (
    select
      count(*)::int as total_events,
      count(distinct user_id)::int as unique_users
    from day_events
  ),
  by_type as (
    select type, count(*)::int as count
    from day_events
    group by type
    order by count desc
  )
  select jsonb_build_object(
    'totalEvents', s.total_events,
    'uniqueUsers', s.unique_users,
    'avgEventsPerUser', case when s.unique_users > 0
      then round(s.total_events::numeric / s.unique_users, 1)
      else 0
    end,
    'byType', coalesce((select jsonb_agg(jsonb_build_object('type', bt.type, 'count', bt.count)) from by_type bt), '[]'::jsonb)
  )
  from summary s;
$$;
