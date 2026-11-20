alter table public.closet_items
  drop constraint if exists closet_items_vibe_tag_check;

alter table public.closet_items
  add constraint closet_items_vibe_tag_check check (
    vibe_tag is null or vibe_tag in (
      'casual', 'streetwear', 'smart/formal', 'lounge/home', 'y2k', 'old money',
      'semi-formal', 'smart casual', 'sporty', 'preppy', 'minimalist', 'vintage'
    )
  );

create policy "Anyone can view images of active shop listings"
on storage.objects for select to anon, authenticated
using (
  bucket_id = 'closet-images'
  and exists (
    select 1
    from public.shop_listings
    where shop_listings.image_url = storage.objects.name
      and shop_listings.is_sold = false
  )
);
