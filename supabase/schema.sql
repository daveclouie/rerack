create extension if not exists pgcrypto;

create type public.closet_item_status as enum ('clean', 'laundry');

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  real_name text not null check (length(btrim(real_name)) between 1 and 100),
  username text not null unique check (username = lower(username) and username ~ '^[a-z0-9_]{3,24}$'),
  email text not null unique check (email = lower(email)),
  phone_number text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.closet_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  category text not null check (category in ('shorts', 'pants', 'joggers', 'longsleeves', 't-shirts', 'outerwear', 'footwear')),
  dominant_color text,
  color_family text check (color_family is null or color_family in ('neutral', 'warm', 'cool', 'earth')),
  vibe_tag text check (vibe_tag is null or vibe_tag in ('casual', 'streetwear', 'smart/formal', 'lounge/home')),
  ai_description text,
  image_url text,
  status public.closet_item_status not null default 'clean',
  wear_count integer not null default 0 check (wear_count >= 0),
  last_worn_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index closet_items_user_created_idx on public.closet_items (user_id, created_at desc);
create index closet_items_user_status_idx on public.closet_items (user_id, status);

create table public.shop_listings (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null unique references public.closet_items (id) on delete cascade,
  seller_id uuid not null references public.users (id) on delete cascade,
  seller_username text not null default '',
  category text not null default '',
  image_url text,
  contact_visible boolean not null default false,
  contact_email text,
  contact_phone text,
  length numeric(7, 2) check (length is null or length >= 0),
  width numeric(7, 2) check (width is null or width >= 0),
  price numeric(10, 2) not null check (price >= 0),
  description text not null check (length(btrim(description)) > 0),
  issues text,
  is_sold boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shop_listing_contact_visibility check (
    contact_visible or (contact_email is null and contact_phone is null)
  )
);

create table public.image_processing_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  usage_date date not null,
  request_count integer not null default 0 check (request_count between 0 and 20),
  primary key (user_id, usage_date)
);

create index shop_listings_available_idx on public.shop_listings (created_at desc) where is_sold = false;
create index shop_listings_seller_idx on public.shop_listings (seller_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_set_updated_at before update on public.users
for each row execute function public.set_updated_at();

create trigger closet_items_set_updated_at before update on public.closet_items
for each row execute function public.set_updated_at();

create trigger shop_listings_set_updated_at before update on public.shop_listings
for each row execute function public.set_updated_at();

create or replace function public.set_shop_listing_snapshot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  seller_profile public.users%rowtype;
  closet_item public.closet_items%rowtype;
begin
  select * into seller_profile
  from public.users
  where id = new.seller_id;

  select * into closet_item
  from public.closet_items
  where id = new.item_id and user_id = new.seller_id;

  if seller_profile.id is null or closet_item.id is null then
    raise exception 'Listing seller and closet item must match';
  end if;

  new.seller_username := seller_profile.username;
  new.category := closet_item.category;
  new.image_url := closet_item.image_url;

  if new.contact_visible then
    if seller_profile.email is null then
      raise exception 'A seller email is required to publish contact details';
    end if;
    new.contact_email := seller_profile.email;
    new.contact_phone := null;
  else
    new.contact_email := null;
    new.contact_phone := null;
  end if;

  return new;
end;
$$;

create trigger shop_listings_set_snapshot
before insert or update on public.shop_listings
for each row execute function public.set_shop_listing_snapshot();

create or replace function public.refresh_seller_listing_snapshots()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.shop_listings
  set seller_username = new.username,
      contact_email = case when contact_visible then new.email else null end,
      contact_phone = null
  where seller_id = new.id;
  return new;
end;
$$;

create trigger users_refresh_listing_snapshots
after update of username, email on public.users
for each row execute function public.refresh_seller_listing_snapshots();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_name text;
  profile_username text;
  profile_email text;
begin
  profile_name := nullif(btrim(new.raw_user_meta_data ->> 'real_name'), '');
  profile_username := lower(nullif(btrim(new.raw_user_meta_data ->> 'username'), ''));
  profile_email := lower(coalesce(nullif(new.raw_user_meta_data ->> 'email', ''), new.email));

  if profile_name is null or profile_username is null or profile_email is null then
    raise exception 'Profile name, username and email are required';
  end if;

  insert into public.users (id, real_name, username, email)
  values (
    new.id,
    profile_name,
    profile_username,
    profile_email
  )
  on conflict (id) do update
  set real_name = excluded.real_name,
      username = excluded.username,
  email = excluded.email;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

create or replace function public.sync_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.users
  set email = lower(coalesce(new.email, email))
  where id = new.id;
  return new;
end;
$$;

create trigger auth_user_sync_profile
after update of email on auth.users
for each row execute function public.sync_auth_user_profile();

create or replace function public.mark_items_worn(p_item_ids uuid[], p_worn_on date)
returns setof public.closet_items
language sql
security invoker
set search_path = ''
as $$
  update public.closet_items
  set wear_count = wear_count + 1,
      last_worn_date = p_worn_on
  where id = any(p_item_ids)
    and user_id = (select auth.uid())
    and status = 'clean'
  returning *;
$$;

revoke all on function public.mark_items_worn(uuid[], date) from public, anon;
grant execute on function public.mark_items_worn(uuid[], date) to authenticated;

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

alter table public.users enable row level security;
alter table public.closet_items enable row level security;
alter table public.shop_listings enable row level security;
alter table public.image_processing_usage enable row level security;

revoke all on public.image_processing_usage from public, anon, authenticated;

create policy "Users can view their own profile"
on public.users for select to authenticated
using ((select auth.uid()) = id);

create policy "Users can update their own profile"
on public.users for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

revoke update on public.users from authenticated;
grant update (real_name, username) on public.users to authenticated;

create policy "Users can manage their own closet"
on public.closet_items for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Anyone can view shop listings"
on public.shop_listings for select to anon, authenticated
using (true);

create policy "Sellers can create listings for their own items"
on public.shop_listings for insert to authenticated
with check (
  (select auth.uid()) = seller_id
  and exists (
    select 1 from public.closet_items
    where closet_items.id = item_id and closet_items.user_id = (select auth.uid())
  )
);

create policy "Sellers can update their own listings"
on public.shop_listings for update to authenticated
using ((select auth.uid()) = seller_id)
with check (
  (select auth.uid()) = seller_id
  and exists (
    select 1 from public.closet_items
    where closet_items.id = item_id and closet_items.user_id = (select auth.uid())
  )
);

create policy "Sellers can remove their own listings"
on public.shop_listings for delete to authenticated
using ((select auth.uid()) = seller_id);

insert into storage.buckets (id, name, public)
values ('closet-images', 'closet-images', false)
on conflict (id) do nothing;

create policy "Users can view their own closet images"
on storage.objects for select to authenticated
using (bucket_id = 'closet-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users can upload their own closet images"
on storage.objects for insert to authenticated
with check (bucket_id = 'closet-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users can update their own closet images"
on storage.objects for update to authenticated
using (bucket_id = 'closet-images' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'closet-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users can delete their own closet images"
on storage.objects for delete to authenticated
using (bucket_id = 'closet-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
