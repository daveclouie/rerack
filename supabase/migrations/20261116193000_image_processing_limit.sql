create table if not exists public.image_processing_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  usage_date date not null,
  request_count integer not null default 0 check (request_count between 0 and 20),
  primary key (user_id, usage_date)
);

alter table public.image_processing_usage enable row level security;
revoke all on public.image_processing_usage from public, anon, authenticated;

create or replace function public.consume_image_processing_quota()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  requester_id uuid := auth.uid();
  accepted_count integer;
begin
  if requester_id is null then
    return false;
  end if;

  insert into public.image_processing_usage as existing_usage (user_id, usage_date, request_count)
  values (requester_id, (now() at time zone 'utc')::date, 1)
  on conflict (user_id, usage_date) do update
  set request_count = existing_usage.request_count + 1
  where existing_usage.request_count < 20
  returning request_count into accepted_count;

  return accepted_count is not null;
end;
$$;

revoke all on function public.consume_image_processing_quota() from public, anon;
grant execute on function public.consume_image_processing_quota() to authenticated;
