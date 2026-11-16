alter table public.users
  drop constraint if exists users_contact_required;

alter table public.users
  add constraint users_contact_required
  check (email is not null and phone_number is not null) not valid;

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
  profile_phone text;
begin
  profile_name := nullif(btrim(new.raw_user_meta_data ->> 'real_name'), '');
  profile_username := lower(nullif(btrim(new.raw_user_meta_data ->> 'username'), ''));
  profile_email := lower(coalesce(nullif(new.raw_user_meta_data ->> 'email', ''), new.email));
  profile_phone := coalesce(nullif(new.raw_user_meta_data ->> 'phone_number', ''), new.phone);

  if profile_name is null or profile_username is null or profile_email is null or profile_phone is null then
    raise exception 'Profile name, username, email and phone number are required';
  end if;
  if profile_phone !~ '^\+[1-9][0-9]{7,14}$' then
    raise exception 'Phone number must use international E.164 format';
  end if;

  insert into public.users (id, real_name, username, email, phone_number)
  values (new.id, profile_name, profile_username, profile_email, profile_phone)
  on conflict (id) do update
  set real_name = excluded.real_name,
      username = excluded.username,
      email = excluded.email,
      phone_number = excluded.phone_number;

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
  set email = lower(coalesce(new.email, email)),
      phone_number = coalesce(new.phone, phone_number)
  where id = new.id;
  return new;
end;
$$;

drop trigger if exists auth_user_sync_profile on auth.users;
create trigger auth_user_sync_profile
after update of email, phone on auth.users
for each row execute function public.sync_auth_user_profile();

revoke update on public.users from authenticated;
grant update (real_name, username) on public.users to authenticated;

drop trigger if exists shop_listings_set_snapshot on public.shop_listings;
create trigger shop_listings_set_snapshot
before insert or update on public.shop_listings
for each row execute function public.set_shop_listing_snapshot();
