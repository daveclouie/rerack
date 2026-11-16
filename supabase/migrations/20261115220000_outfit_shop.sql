alter table public.shop_listings
  add column if not exists seller_username text not null default '',
  add column if not exists category text not null default '',
  add column if not exists image_url text,
  add column if not exists contact_visible boolean not null default false,
  add column if not exists contact_email text,
  add column if not exists contact_phone text;

alter table public.shop_listings
  add constraint shop_listing_contact_visibility check (
    contact_visible or (contact_email is null and contact_phone is null)
  );

update public.shop_listings as listing
set seller_username = profile.username,
    category = item.category,
    image_url = item.image_url
from public.users as profile, public.closet_items as item
where profile.id = listing.seller_id
  and item.id = listing.item_id
  and item.user_id = listing.seller_id;

create index if not exists shop_listings_available_idx
  on public.shop_listings (created_at desc) where is_sold = false;
create index if not exists shop_listings_seller_idx
  on public.shop_listings (seller_id, created_at desc);

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
  select * into seller_profile from public.users where id = new.seller_id;
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
    if seller_profile.email is null and seller_profile.phone_number is null then
      raise exception 'A seller contact method is required to publish contact details';
    end if;
    new.contact_email := seller_profile.email;
    new.contact_phone := seller_profile.phone_number;
  else
    new.contact_email := null;
    new.contact_phone := null;
  end if;

  return new;
end;
$$;

drop trigger if exists shop_listings_set_snapshot on public.shop_listings;
create trigger shop_listings_set_snapshot
before insert or update of item_id, seller_id, contact_visible on public.shop_listings
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
      contact_phone = case when contact_visible then new.phone_number else null end
  where seller_id = new.id;
  return new;
end;
$$;

drop trigger if exists users_refresh_listing_snapshots on public.users;
create trigger users_refresh_listing_snapshots
after update of username, email, phone_number on public.users
for each row execute function public.refresh_seller_listing_snapshots();

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
