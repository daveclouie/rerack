alter table public.users
  drop constraint if exists users_contact_required;

alter table public.users
  alter column phone_number drop not null;

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
  else
    new.contact_email := null;
  end if;
  new.contact_phone := null;

  return new;
end;
$$;

drop trigger if exists shop_listings_set_snapshot on public.shop_listings;
create trigger shop_listings_set_snapshot
before insert or update on public.shop_listings
for each row execute function public.set_shop_listing_snapshot();

update public.shop_listings
set contact_phone = null;

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

drop trigger if exists users_refresh_listing_snapshots on public.users;
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
  values (new.id, profile_name, profile_username, profile_email)
  on conflict (id) do update
  set real_name = excluded.real_name,
      username = excluded.username,
      email = excluded.email;

  return new;
end;
$$;

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

drop trigger if exists auth_user_sync_profile on auth.users;
create trigger auth_user_sync_profile
after update of email on auth.users
for each row execute function public.sync_auth_user_profile();
